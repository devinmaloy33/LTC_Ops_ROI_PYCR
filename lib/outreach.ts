import type { OutreachFact } from '@/lib/facility-data';

export type OutreachObjection = { objection: string; response: string };
export type OutreachTouch = {
  day: 1 | 3 | 7;
  subject: string;
  email: string;
  liveCallOpener: string;
  voicemail: string;
  discoveryQuestions: string[];
  objectionResponses: OutreachObjection[];
};
export type OutreachCampaign = {
  campaignTitle: string;
  strategySummary: string;
  touches: OutreachTouch[];
};

export const OUTREACH_PERSONAS = [
  'CEO / Owner', 'CFO / Finance', 'CHRO / HR', 'COO / Administrator',
  'CIO / IT', 'CNO / Clinical Leadership', 'Executive Leadership Team', 'Other',
] as const;

export const OUTREACH_JSON_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    campaignTitle: { type: 'string' },
    strategySummary: { type: 'string' },
    touches: {
      type: 'array', minItems: 3, maxItems: 3,
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          day: { type: 'integer', enum: [1, 3, 7] },
          subject: { type: 'string' }, email: { type: 'string' },
          liveCallOpener: { type: 'string' }, voicemail: { type: 'string' },
          discoveryQuestions: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'string' } },
          objectionResponses: {
            type: 'array', minItems: 3, maxItems: 3,
            items: {
              type: 'object', additionalProperties: false,
              properties: { objection: { type: 'string' }, response: { type: 'string' } },
              required: ['objection', 'response'],
            },
          },
        },
        required: ['day', 'subject', 'email', 'liveCallOpener', 'voicemail', 'discoveryQuestions', 'objectionResponses'],
      },
    },
  },
  required: ['campaignTitle', 'strategySummary', 'touches'],
} as const;

export function parseAndValidateCampaign(
  text: string,
  facts: OutreachFact[],
  optOutLine: string,
): { campaign?: OutreachCampaign; errors: string[] } {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return { errors: ['Gemini did not return valid JSON.'] }; }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { errors: ['Campaign response is not an object.'] };
  const candidate = raw as Record<string, unknown>;
  if (!Array.isArray(candidate.touches)) return { errors: ['Campaign must contain three touches.'] };

  const campaign = candidate as unknown as OutreachCampaign;
  const errors: string[] = [];
  if (!campaign.campaignTitle?.trim() || !campaign.strategySummary?.trim()) errors.push('Campaign title and strategy are required.');
  if (campaign.touches.length !== 3 || campaign.touches.map((touch) => touch.day).join(',') !== '1,3,7') {
    errors.push('Campaign touches must be ordered on days 1, 3 and 7.');
  }
  for (const touch of campaign.touches) {
    if (!touch || typeof touch !== 'object') { errors.push('Each touch must be an object.'); continue; }
    if (wordCount(touch.subject) > 8 || wordCount(touch.subject) < 2) errors.push(`Day ${touch.day} subject must contain 2-8 words.`);
    const emailWords = wordCount(touch.email);
    if (emailWords < 60 || emailWords > 110) errors.push(`Day ${touch.day} email must contain 60-110 words.`);
    const openerWords = wordCount(touch.liveCallOpener);
    if (openerWords < 45 || openerWords > 100) errors.push(`Day ${touch.day} live opener must contain 45-100 words.`);
    if (wordCount(touch.voicemail) > 65 || wordCount(touch.voicemail) < 20) errors.push(`Day ${touch.day} voicemail must contain 20-65 words.`);
    if (!touch.email?.includes(optOutLine)) errors.push(`Day ${touch.day} email must include the opt-out line exactly.`);
    if (!Array.isArray(touch.discoveryQuestions) || touch.discoveryQuestions.length !== 3) errors.push(`Day ${touch.day} must include three discovery questions.`);
    if (!Array.isArray(touch.objectionResponses) || touch.objectionResponses.length !== 3 || touch.objectionResponses.some((item) => !item?.objection || !item?.response)) {
      errors.push(`Day ${touch.day} must include three objection responses.`);
    }
  }

  const content = JSON.stringify(campaign);
  if (/guaranteed?|guarantees|manipulat|vulnerab|shame|fear tactic|secretly|trick (?:them|the)/i.test(content)) {
    errors.push('Campaign contains prohibited pressure or unsupported certainty language.');
  }
  const allowedClaims = new Set(facts.flatMap((fact) => extractQuantifiedClaims(fact.value).map(normalizeClaim)));
  for (const claim of extractQuantifiedClaims(content)) {
    if (!allowedClaims.has(normalizeClaim(claim))) errors.push(`Unsupported quantified claim: ${claim}`);
  }
  return errors.length > 0 ? { errors } : { campaign, errors: [] };
}

export function campaignToPlainText(campaign: OutreachCampaign): string {
  return campaign.touches.map((touch) => [
    `DAY ${touch.day}`, `Subject: ${touch.subject}`, '', touch.email, '',
    'Live call opener:', touch.liveCallOpener, '', 'Voicemail:', touch.voicemail, '',
    'Discovery questions:', ...touch.discoveryQuestions.map((question, index) => `${index + 1}. ${question}`), '',
    'Objection responses:', ...touch.objectionResponses.map((item) => `${item.objection}\n${item.response}`),
  ].join('\n')).join('\n\n---\n\n');
}

function wordCount(value: unknown): number {
  return typeof value === 'string' ? value.trim().split(/\s+/).filter(Boolean).length : 0;
}

function extractQuantifiedClaims(value: string): string[] {
  return value.match(/\$\s?\d[\d,]*(?:\.\d+)?|\b\d+(?:\.\d+)?%|\b[1-5]\s+(?:of\s+5\s+)?stars?\b/gi) || [];
}

function normalizeClaim(value: string): string {
  return value.toLowerCase().replace(/[\s,]/g, '');
}
