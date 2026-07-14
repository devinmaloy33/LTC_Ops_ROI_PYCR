import { NextRequest, NextResponse } from 'next/server';
import { getD1 } from '@/db';
import { getAdminAuthorization } from '@/lib/admin-auth';
import { buildCallBrief, callBriefDynamicVariables, CAMPAIGN_TOUCH_DAYS } from '@/lib/call-brief';
import { ACTIVE_CALL_STATUSES, cleanText, normalizeUsBusinessPhone, serializeVoiceCall } from '@/lib/voice-calls';

export const dynamic = 'force-dynamic';

const OUTBOUND_CALL_URL = 'https://api.elevenlabs.io/v1/convai/twilio/outbound-call';

export async function POST(request: NextRequest) {
  const auth = await getAdminAuthorization();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.status === 401 ? 'Sign in required.' : 'Administrator access required.' }, { status: auth.status });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const ccn = cleanText(body.ccn, 6);
    const phoneNumber = normalizeUsBusinessPhone(body.phoneNumber);
    const persona = cleanText(body.persona, 100);
    const knownContactName = cleanText(body.knownContactName, 120);
    const knownContactTitle = cleanText(body.knownContactTitle, 120);
    const knownContactEmail = cleanText(body.knownContactEmail, 160);
    const knownContactExtension = cleanText(body.knownContactExtension, 20);
    const campaignId = cleanText(body.campaignId, 80);
    const campaignTouchDay = Number(body.campaignTouchDay || 1);

    if (!/^\d{6}$/.test(ccn)) return NextResponse.json({ error: 'A valid facility CCN is required.' }, { status: 400 });
    if (!phoneNumber) return NextResponse.json({ error: 'Enter a valid U.S. business phone number.' }, { status: 400 });
    if (!persona) return NextResponse.json({ error: 'Choose the professional role the agent should request.' }, { status: 400 });
    if (knownContactEmail && !/^\S+@\S+\.\S+$/.test(knownContactEmail)) {
      return NextResponse.json({ error: 'Enter a valid contact email or leave it blank.' }, { status: 400 });
    }
    if (campaignId && !CAMPAIGN_TOUCH_DAYS.includes(campaignTouchDay as never)) {
      return NextResponse.json({ error: 'Choose Day 1, Day 3, or Day 7 for the linked cadence.' }, { status: 400 });
    }
    if (
      body.businessLineConfirmed !== true || body.lawfulContactConfirmed !== true ||
      body.aiDisclosureConfirmed !== true || body.recordingConsentConfirmed !== true
    ) {
      return NextResponse.json({
        error: 'Confirm the business-line, lawful-contact, AI-disclosure, and call-recording attestations before calling.',
      }, { status: 400 });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    const agentId = process.env.ELEVENLABS_AGENT_ID;
    const agentPhoneNumberId = process.env.ELEVENLABS_PHONE_NUMBER_ID;
    if (!apiKey || !agentId || !agentPhoneNumberId) {
      return NextResponse.json({ error: 'Outbound calling is not fully configured.' }, { status: 503 });
    }

    const db = getD1();
    const facility = await db.prepare('SELECT ccn, facility_name, state FROM facilities WHERE ccn = ?').bind(ccn).first<Record<string, unknown>>();
    if (!facility) return NextResponse.json({ error: 'Facility not found.' }, { status: 404 });
    const suppressed = await db.prepare('SELECT phone_number FROM do_not_call_numbers WHERE phone_number = ?').bind(phoneNumber).first();
    if (suppressed) return NextResponse.json({ error: 'This number is on the do-not-call list and cannot be dialed.' }, { status: 409 });

    const activePlaceholders = ACTIVE_CALL_STATUSES.map(() => '?').join(',');
    const active = await db.prepare(
      `SELECT id FROM voice_calls WHERE status IN (${activePlaceholders}) AND created_at > ? ORDER BY created_at DESC LIMIT 1`,
    ).bind(...ACTIVE_CALL_STATUSES, Date.now() - 4 * 60 * 60 * 1000).first();
    if (active) return NextResponse.json({ error: 'Another outbound call is still active. Sync or finish it before starting a new call.' }, { status: 409 });

    const dailyCount = await db.prepare('SELECT COUNT(*) AS count FROM voice_calls WHERE created_at >= ?')
      .bind(Date.now() - 24 * 60 * 60 * 1000).first<Record<string, unknown>>();
    if (Number(dailyCount?.count || 0) >= 25) {
      return NextResponse.json({ error: 'The 25-call daily safety limit has been reached.' }, { status: 429 });
    }

    let campaign: Record<string, unknown> | null = null;
    if (campaignId) {
      campaign = await db.prepare('SELECT * FROM outreach_campaigns WHERE id = ? AND ccn = ?').bind(campaignId, ccn).first<Record<string, unknown>>();
      if (!campaign) return NextResponse.json({ error: 'The selected outreach campaign does not belong to this facility.' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const now = Date.now();
    const callbackPhone = process.env.DEVIN_CALLBACK_PHONE || '2607971814';
    const callBrief = buildCallBrief({
      facilityName: String(facility.facility_name), state: String(facility.state || ''), targetRole: persona,
      campaignId, campaignTouchDay, campaignJson: campaign?.campaign_json, selectedFacts: campaign?.selected_facts_json,
      callbackPhone, now,
    });
    await db.prepare(`
      INSERT INTO voice_calls (
        id, ccn, campaign_id, campaign_touch_day, call_brief_json, creator_email, phone_number, persona,
        known_contact_name, known_contact_title, known_contact_email, known_contact_extension,
        agent_id, agent_phone_number_id, status, compliance_attested_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued', ?, ?, ?)
    `).bind(
      id, ccn, campaignId || null, callBrief.campaignTouchDay, JSON.stringify(callBrief), auth.user.email, phoneNumber, persona,
      knownContactName || null, knownContactTitle || null, knownContactEmail || null, knownContactExtension || null,
      agentId, agentPhoneNumberId, now, now, now,
    ).run();

    const nameParts = knownContactName.split(/\s+/).filter(Boolean);
    const prospectFirst = nameParts[0] || '';
    const prospectLast = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
    const outboundBody = {
      agent_id: agentId,
      agent_phone_number_id: agentPhoneNumberId,
      to_number: phoneNumber,
      call_recording_enabled: true,
      conversation_initiation_client_data: {
        dynamic_variables: {
          _prospect_first_name_: prospectFirst,
          _prospect_last_name_: prospectLast,
          _company_name_: String(facility.facility_name),
          _state_: String(facility.state || ''),
          _devin_phone_: callbackPhone,
          _prospect_email_: knownContactEmail,
          _known_extension_: knownContactExtension,
          ...callBriefDynamicVariables(callBrief, id),
        },
      },
    };

    try {
      const providerResponse = await fetch(OUTBOUND_CALL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'xi-api-key': apiKey },
        body: JSON.stringify(outboundBody),
        signal: AbortSignal.timeout(25_000),
      });
      const providerPayload = await providerResponse.json().catch(() => ({})) as Record<string, unknown>;
      if (!providerResponse.ok || providerPayload.success === false) {
        throw new Error(cleanText(providerPayload.message, 500) || `ElevenLabs returned ${providerResponse.status}.`);
      }
      const conversationId = cleanText(providerPayload.conversation_id, 120);
      const callSid = cleanText(providerPayload.callSid ?? providerPayload.call_sid, 120);
      await db.prepare(`
        UPDATE voice_calls SET conversation_id = ?, provider_call_sid = ?, status = 'initiated', started_at = ?, updated_at = ? WHERE id = ?
      `).bind(conversationId || null, callSid || null, now, Date.now(), id).run();
    } catch (providerError) {
      const failureReason = providerError instanceof Error ? providerError.message.slice(0, 500) : 'The outbound call provider could not start the call.';
      await db.prepare(`UPDATE voice_calls SET status = 'failed', failure_reason = ?, ended_at = ?, updated_at = ? WHERE id = ?`)
        .bind(failureReason, Date.now(), Date.now(), id).run();
      return NextResponse.json({ error: `The call could not be started. ${failureReason}` }, { status: 502 });
    }

    const row = await db.prepare('SELECT * FROM voice_calls WHERE id = ?').bind(id).first<Record<string, unknown>>();
    return NextResponse.json({ call: serializeVoiceCall(row || {}) }, { status: 201 });
  } catch (error) {
    console.error('Outbound call start failed', error);
    return NextResponse.json({ error: 'The outbound call could not be started.' }, { status: 503 });
  }
}
