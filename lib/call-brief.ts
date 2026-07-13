import type { OutreachFact } from '@/lib/facility-data';
import type { OutreachCampaign, OutreachTouch } from '@/lib/outreach';

export const CALENDLY_SCHEDULING_URL = 'https://calendly.com/dmaloy-paycor/30min';
export const CAMPAIGN_TOUCH_DAYS = [1, 3, 7] as const;
export type CampaignTouchDay = (typeof CAMPAIGN_TOUCH_DAYS)[number];

export type CallBrief = {
  version: 1;
  facilityName: string;
  state: string;
  targetRole: string;
  campaignId: string | null;
  campaignTouchDay: CampaignTouchDay | null;
  selectedFacts: OutreachFact[];
  opener: string;
  voicemail: string;
  discoveryQuestions: string[];
  objectionResponses: Array<{ objection: string; response: string }>;
  appointmentLength: '30 minutes';
  calendlyUrl: string;
  createdAt: number;
};

export function buildCallBrief(input: {
  facilityName: string;
  state: string;
  targetRole: string;
  campaignId?: string;
  campaignTouchDay?: number;
  campaignJson?: unknown;
  selectedFacts?: unknown;
  callbackPhone?: string;
  now?: number;
}): CallBrief {
  const facts = normalizeFacts(input.selectedFacts).slice(0, 6);
  const campaign = normalizeCampaign(input.campaignJson);
  const requestedDay = normalizeTouchDay(input.campaignTouchDay);
  if (input.campaignId && input.campaignTouchDay !== undefined && !requestedDay) {
    throw new Error('Choose a valid Day 1, Day 3, or Day 7 cadence touch.');
  }
  const touch = campaign ? findTouch(campaign, requestedDay ?? 1) : null;
  if (input.campaignId && !campaign) throw new Error('The selected cadence could not be read.');
  if (input.campaignId && !touch) throw new Error('Choose a valid Day 1, Day 3, or Day 7 cadence touch.');

  const facilityName = clean(input.facilityName, 160) || 'the facility';
  const targetRole = clean(input.targetRole, 100) || 'facility leader';
  const state = clean(input.state, 12);
  const callbackPhone = readablePhone(input.callbackPhone || '2607971814');
  const genericOpener = `Hi, I am an AI assistant calling for Devin Maloy with Paycor. I am reaching out to ${targetRole} leaders in long-term care${state ? ` in ${state}` : ''}. May I take 30 seconds to explain why Devin requested the call, and then you can decide whether a 30-minute conversation would be useful?`;
  const genericVoicemail = `Hi, this is an AI assistant calling for Devin Maloy with Paycor regarding ${facilityName}. If a brief workforce conversation would be useful, Devin can be reached at ${callbackPhone}. Thank you.`;

  return {
    version: 1,
    facilityName,
    state,
    targetRole,
    campaignId: input.campaignId || null,
    campaignTouchDay: touch ? touch.day : null,
    selectedFacts: facts,
    opener: clean(touch?.liveCallOpener, 1200) || genericOpener,
    voicemail: ensureCallback(clean(touch?.voicemail, 600), callbackPhone) || genericVoicemail,
    discoveryQuestions: touch?.discoveryQuestions.map((item) => clean(item, 300)).filter(Boolean).slice(0, 3) || [
      'What workforce priority is taking the most attention right now?',
      'How are you currently evaluating whether your workforce systems support that priority?',
      'Would a 30-minute conversation with Devin be useful to compare approaches?',
    ],
    objectionResponses: touch?.objectionResponses.map((item) => ({
      objection: clean(item.objection, 240), response: clean(item.response, 500),
    })).filter((item) => item.objection && item.response).slice(0, 3) || [],
    appointmentLength: '30 minutes',
    calendlyUrl: CALENDLY_SCHEDULING_URL,
    createdAt: input.now ?? Date.now(),
  };
}

export function callBriefDynamicVariables(brief: CallBrief, callRecordId: string) {
  return {
    _call_record_id_: callRecordId,
    _target_role_: brief.targetRole,
    _campaign_touch_day_: brief.campaignTouchDay ? `Day ${brief.campaignTouchDay}` : 'Unlinked call',
    _facility_fact_1_: formatFact(brief.selectedFacts[0]),
    _facility_fact_2_: formatFact(brief.selectedFacts[1]),
    _call_opener_: brief.opener,
    _voicemail_script_: brief.voicemail,
    _discovery_questions_: brief.discoveryQuestions.map((item, index) => `${index + 1}. ${item}`).join(' '),
    _objection_responses_: brief.objectionResponses.map((item) => `${item.objection}: ${item.response}`).join(' | '),
    _appointment_length_: brief.appointmentLength,
    _calendly_url_: brief.calendlyUrl,
  };
}

function normalizeCampaign(value: unknown): OutreachCampaign | null {
  const parsed = typeof value === 'string' ? safeParse(value) : value;
  if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as OutreachCampaign).touches)) return null;
  return parsed as OutreachCampaign;
}

function normalizeFacts(value: unknown): OutreachFact[] {
  const parsed = typeof value === 'string' ? safeParse(value) : value;
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((item): item is OutreachFact => {
    if (!item || typeof item !== 'object') return false;
    const fact = item as OutreachFact;
    return Boolean(fact.id && fact.label && fact.value && ['CMS-reported', 'Calculator-provided estimate'].includes(fact.source));
  }).map((fact) => ({
    id: clean(fact.id, 100), label: clean(fact.label, 160), value: clean(fact.value, 240), source: fact.source,
  }));
}

function findTouch(campaign: OutreachCampaign, day: CampaignTouchDay): OutreachTouch | null {
  const touch = campaign.touches.find((item) => item?.day === day);
  if (!touch || !Array.isArray(touch.discoveryQuestions) || !Array.isArray(touch.objectionResponses)) return null;
  return touch;
}

function normalizeTouchDay(value: unknown): CampaignTouchDay | null {
  const numeric = Number(value);
  return CAMPAIGN_TOUCH_DAYS.includes(numeric as CampaignTouchDay) ? numeric as CampaignTouchDay : null;
}

function formatFact(fact?: OutreachFact) {
  return fact ? `${fact.label}: ${fact.value} (${fact.source})` : '';
}

function clean(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function safeParse(value: string): unknown {
  try { return JSON.parse(value); } catch { return null; }
}

function ensureCallback(message: string, callbackPhone: string) {
  if (!message) return '';
  const digits = callbackPhone.replace(/\D/g, '');
  const existingDigits = message.replace(/\D/g, '');
  return existingDigits.includes(digits) ? message : `${message} You can reach Devin at ${callbackPhone}.`;
}

function readablePhone(value: string) {
  const digits = value.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
  return digits.length === 10 ? `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}` : value;
}
