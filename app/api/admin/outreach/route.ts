import { NextRequest, NextResponse } from 'next/server';
import { getD1 } from '@/db';
import { getAdminAuthorization } from '@/lib/admin-auth';
import { buildAvailableFacts, CalculatorSnapshot, safeJsonObject } from '@/lib/facility-data';
import { getGemini } from '@/lib/gemini';
import { OUTREACH_JSON_SCHEMA, OUTREACH_PERSONAS, parseAndValidateCampaign } from '@/lib/outreach';

export const dynamic = 'force-dynamic';

const DEFAULT_OPT_OUT = "If this isn't relevant, reply no thanks and I won't follow up.";

export async function POST(request: NextRequest) {
  const auth = await getAdminAuthorization();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.status === 401 ? 'Sign in required.' : 'Administrator access required.' }, { status: auth.status });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const ccn = cleanText(body.ccn, 6);
    const personaChoice = cleanText(body.persona, 80);
    const customRole = cleanText(body.customRole, 80);
    const persona = personaChoice === 'Other' ? customRole : personaChoice;
    if (!/^\d{6}$/.test(ccn)) return NextResponse.json({ error: 'A valid facility CCN is required.' }, { status: 400 });
    if (!OUTREACH_PERSONAS.includes(personaChoice as never) || !persona) return NextResponse.json({ error: 'Choose a valid outreach persona.' }, { status: 400 });

    const factIds = Array.isArray(body.factIds)
      ? Array.from(new Set(body.factIds.filter((value): value is string => typeof value === 'string'))).slice(0, 6)
      : [];
    if (factIds.length < 1) return NextResponse.json({ error: 'Choose at least one facility fact.' }, { status: 400 });
    const contactName = cleanText(body.contactName, 100);
    const contactTitle = cleanText(body.contactTitle, 120);
    const adminNotes = cleanText(body.adminNotes, 1200);
    const optOutLine = cleanText(body.optOutLine, 180) || DEFAULT_OPT_OUT;

    const db = getD1();
    const facility = await db.prepare('SELECT * FROM facilities WHERE ccn = ?').bind(ccn).first<Record<string, unknown>>();
    if (!facility) return NextResponse.json({ error: 'Facility not found.' }, { status: 404 });
    const latestEngagement = await db.prepare(
      'SELECT calculator_snapshot_json FROM facility_engagements WHERE ccn = ? AND calculator_snapshot_json IS NOT NULL ORDER BY last_activity_at DESC LIMIT 1',
    ).bind(ccn).first<Record<string, unknown>>();
    const snapshot = safeJsonObject<CalculatorSnapshot>(latestEngagement?.calculator_snapshot_json);
    const availableFacts = buildAvailableFacts(facility, snapshot);
    const factMap = new Map(availableFacts.map((fact) => [fact.id, fact]));
    const selectedFacts = factIds.map((id) => factMap.get(id)).filter(Boolean);
    if (selectedFacts.length !== factIds.length) return NextResponse.json({ error: 'One or more selected facts are no longer available.' }, { status: 400 });

    const priorResult = await db.prepare(
      'SELECT campaign_json FROM outreach_campaigns WHERE ccn = ? ORDER BY created_at DESC LIMIT 3',
    ).bind(ccn).all<Record<string, unknown>>();
    const priorCampaigns = (priorResult.results || []).map((row) => safeJsonObject<Record<string, unknown>>(row.campaign_json)).filter(Boolean);
    const priorSubjects = priorCampaigns.flatMap((campaign) =>
      Array.isArray(campaign?.touches) ? campaign.touches.map((touch) => (touch as Record<string, unknown>).subject).filter(Boolean) : [],
    );
    const model = process.env.GEMINI_MODEL || 'gemini-flash-latest';
    const ai = getGemini();
    let lastErrors: string[] = [];

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const nonce = crypto.randomUUID();
      const prompt = buildPrompt({
        facilityName: String(facility.facility_name), persona, contactName, contactTitle,
        selectedFacts: selectedFacts as NonNullable<(typeof selectedFacts)[number]>[], adminNotes,
        optOutLine, nonce, priorSubjects, correction: lastErrors,
      });
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          temperature: 0.9,
          responseMimeType: 'application/json',
          responseJsonSchema: OUTREACH_JSON_SCHEMA,
        },
      });
      const validation = parseAndValidateCampaign(response.text || '', selectedFacts as NonNullable<(typeof selectedFacts)[number]>[], optOutLine);
      if (validation.campaign) {
        const serialized = JSON.stringify(validation.campaign);
        if ((priorResult.results || []).some((row) => String(row.campaign_json) === serialized)) {
          lastErrors = ['The result duplicated an earlier campaign. Use a materially different angle, wording and CTA.'];
          continue;
        }
        const id = crypto.randomUUID();
        const createdAt = Date.now();
        await db.prepare(`
          INSERT INTO outreach_campaigns (
            id, ccn, creator_email, persona, contact_name, contact_title,
            admin_notes, selected_facts_json, campaign_json, model, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          id, ccn, auth.user.email, persona, contactName || null, contactTitle || null,
          adminNotes || null, JSON.stringify(selectedFacts), serialized, model, createdAt,
        ).run();
        return NextResponse.json({ campaign: { id, createdAt, persona, contactName, contactTitle, selectedFacts, campaign: validation.campaign, model } });
      }
      lastErrors = validation.errors;
    }
    console.error('Outreach generation failed validation', lastErrors);
    return NextResponse.json({ error: 'The outreach draft did not pass the factual and format checks. Please regenerate.' }, { status: 502 });
  } catch (error) {
    console.error('Outreach generation failed', error);
    return NextResponse.json({ error: 'The outreach campaign could not be generated.' }, { status: 503 });
  }
}

function buildPrompt(input: {
  facilityName: string; persona: string; contactName: string; contactTitle: string;
  selectedFacts: Array<{ label: string; value: string; source: string }>;
  adminNotes: string; optOutLine: string; nonce: string; priorSubjects: unknown[]; correction: string[];
}) {
  return `You create concise, professional business-to-business outreach for Paycor's long-term-care team.

Create a unique three-touch cadence for ${input.facilityName}. Audience role: ${input.persona}.${input.contactName ? ` Contact: ${input.contactName}.` : ''}${input.contactTitle ? ` Title: ${input.contactTitle}.` : ''}

Use only these administrator-selected facts. Do not introduce other facility statistics, savings, penalties, clinical outcomes or claims:
${input.selectedFacts.map((fact) => `- ${fact.label}: ${fact.value} (${fact.source})`).join('\n')}
${input.adminNotes ? `Administrator context, which must be framed as context rather than a verified statistic: ${input.adminNotes}` : ''}

Use PCP as an ethical writing structure without naming it in recipient-facing copy:
- Perception: one concrete selected fact or neutral observation.
- Context: connect it to the stated role's legitimate responsibilities.
- Permission: ask permission for a low-pressure next step or brief appointment.

Hard rules:
- No personality profiling, vulnerability inference, fear, shame, manipulation, fabricated urgency or deceptive subject lines.
- Never state that Paycor guarantees savings, ratings, staffing, census, compliance or clinical outcomes.
- Calculator-provided values are estimates, not CMS-reported facts. Preserve that distinction.
- Subjects contain 2-8 words. Each email contains 60-110 words and ends with this exact sentence: ${JSON.stringify(input.optOutLine)}
- Each live opener contains 20-45 words. Each voicemail contains 18-32 words.
- Every live opener and voicemail truthfully identifies "Alex, Devin Maloy's AI assistant at Paycor." Do not use [Name], [Phone], or any bracketed placeholder.
- The available appointment is 30 minutes at https://calendly.com/dmaloy-paycor/30min. Any appointment request must say 30 minutes; never offer 5, 10, 15, 20, 45, or 60 minutes.
- Phone scripts use one idea and one question. They do not repeat the identity, fact, or call-to-action.
- Every touch has exactly three discovery questions and three concise objection/response pairs.
- Days are exactly 1, 3 and 7, in that order. Vary the factual angle and CTA across touches.
- Do not use quantified claims unless the exact quantified value appears in the selected facts.
- Never mention the PCP framework or any psychological technique to the recipient.

Prior subject lines to avoid repeating: ${JSON.stringify(input.priorSubjects)}
Generation nonce for originality: ${input.nonce}
${input.correction.length ? `Correct these validation issues from the prior attempt: ${input.correction.join('; ')}` : ''}`;
}

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}
