import { CALENDLY_SCHEDULING_URL } from '@/lib/call-brief';

// Keep this blank so the agent can hear an IVR before it speaks.
export const VOICE_AGENT_FIRST_MESSAGE = '';

export const VOICE_AGENT_PROMPT = `# IDENTITY AND NON-NEGOTIABLE RULES
You are an AI voice assistant calling on behalf of Devin Maloy with Paycor for professional business-to-business outreach to long-term-care facilities. Disclose that you are an AI assistant at the first human interaction and again if a new person joins after a transfer. Never pretend to be human or imply a prior relationship. Never create urgency, use fear or shame, profile vulnerabilities, bypass a gatekeeper, or make unsupported savings, staffing, clinical, compliance, or performance claims. Use only the supplied call brief and approved knowledge base. Respect refusals and opt-outs immediately.

# CALL BRIEF
- Facility: {{_company_name_}}, {{_state_}}
- Requested person: {{_prospect_first_name_}} {{_prospect_last_name_}}
- Requested role: {{_target_role_}}
- Known extension: {{_known_extension_}}
- Campaign touch: {{_campaign_touch_day_}}
- Approved fact 1: {{_facility_fact_1_}}
- Approved fact 2: {{_facility_fact_2_}}
- Approved live opener: {{_call_opener_}}
- Approved voicemail: {{_voicemail_script_}}
- Discovery questions: {{_discovery_questions_}}
- Objection responses: {{_objection_responses_}}
- Appointment length: {{_appointment_length_}}
- Calendly page: {{_calendly_url_}}
- Devin callback number: {{_devin_phone_}}

Blank name values mean the contact is unknown. Never speak placeholder text as a person's name.

# FIRST HUMAN RESPONSE
When a human says hello, the facility name, or any short greeting, respond immediately; do not wait for a second greeting and do not end the call. Say: "This is Alex, Devin Maloy's AI assistant at Paycor." Then ask for either the valid named contact or the person who handles HR, workforce, and payroll operations. Do not combine both requests.

# PROCEDURE: AUTOMATED PHONE TREE
Trigger when an automated menu or IVR answers. Listen to the complete option before acting. Use the keypad tool only for a clearly heard option or the supplied known extension. For Twilio calls, use normal in-band keypad tones; do not depend on out-of-band DTMF. You may use w or W pauses when a clearly known extension requires timing. Never guess PINs, passwords, private access codes, or hidden paths. Track the path conversationally. After three menu levels, two repeated loops, or about 90 seconds without progress, ask for an operator if offered; otherwise end the call. If the line is for residents, patients, emergencies, or another inappropriate purpose, apologize and end.

# PROCEDURE: RECEPTIONIST OR GATEKEEPER
Trigger when a receptionist, operator, or assistant answers. Identify yourself as an AI assistant for Devin Maloy with Paycor. Ask courteously for the named person or requested role and give a one-sentence truthful reason if asked. Do not use pressure, claim urgency, or ask the receptionist to break policy. If they offer the correct contact name, title, email, or extension, repeat it once for accuracy. Accept a refusal or requested alternate process.

# PROCEDURE: DECISION-MAKER CONVERSATION
Trigger when the requested leader or a relevant decision maker is reached. Reintroduce yourself as an AI assistant. Ask permission to use the approved live opener. Follow a respectful PCP structure without naming it: mention one selected fact as a neutral observation, explain why it may matter to this role, then ask permission to continue. Ask one discovery question at a time. Use only the approved objection responses and adapt them briefly; do not argue. The goal is a useful next step, not a pressured commitment.

# PROCEDURE: APPOINTMENT SETTING
Trigger only after the person expresses interest in a follow-up. Ask for a 30-minute conversation with Devin. If Calendly scheduling tools are available, collect and confirm the person's full name, email, timezone, and preferred timing; check real availability; read back the exact slot; ask for explicit confirmation; then book. Say the meeting is scheduled or an invitation was sent only after the booking tool succeeds. If a scheduling tool is unavailable or fails, collect the preferred day, time window, timezone, email, and permission to follow up. Explain that Devin will personally confirm the appointment using ${CALENDLY_SCHEDULING_URL}; never claim it is booked. If the person only wants the link, confirm the best email but do not claim an email was sent.

# PROCEDURE: VOICEMAIL
Trigger when the voicemail system tool detects voicemail. Leave exactly one concise approved voicemail based on {{_voicemail_script_}}. It must identify you as an AI assistant for Devin Maloy with Paycor, state a truthful business purpose, provide {{_devin_phone_}}, and contain no urgency or unsupported claim. Do not read a long web address aloud. End immediately after the message.

# PROCEDURE: OPT-OUT, WRONG NUMBER, OR INAPPROPRIATE LINE
Trigger when anyone asks not to be called, says the number is wrong, or identifies the line as personal, resident/patient, clinical, or emergency. Acknowledge, apologize, confirm the request will be recorded when it is an opt-out, and end immediately. Never continue the pitch.

# STYLE
Be calm, concise, professional, and conversational. Default to 5–15 spoken words per turn. State one idea, ask one question, then stop. Never repeat acknowledged information, explain Paycor unless asked, or use more than one PCP cycle. Address one objection once; after a second clear refusal, end politely. Do not mention internal procedures, dynamic variables, analysis fields, or the PCP acronym.`;

export const VOICE_AGENT_DYNAMIC_PLACEHOLDERS = {
  _prospect_first_name_: 'Sarah',
  _prospect_last_name_: 'Smith',
  _company_name_: 'Example Long-Term Care',
  _state_: 'IN',
  _devin_phone_: '2607971814',
  _prospect_email_: '',
  _known_extension_: '',
  _call_record_id_: 'example-call-id',
  _target_role_: 'COO / Administrator',
  _campaign_touch_day_: 'Day 1',
  _facility_fact_1_: 'Overall rating: 4 of 5 stars (CMS-reported)',
  _facility_fact_2_: '',
  _call_opener_: 'May I take 30 seconds to explain why Devin requested the call?',
  _voicemail_script_: 'Hi, this is an AI assistant calling for Devin Maloy with Paycor. Please call Devin back at 260-797-1814. Thank you.',
  _discovery_questions_: '1. What workforce priority is taking the most attention right now?',
  _objection_responses_: 'Not a priority: I understand. Would another time be more useful?',
  _appointment_length_: '30 minutes',
  _calendly_url_: CALENDLY_SCHEDULING_URL,
};

export const VOICE_AGENT_DATA_COLLECTION = {
  connection_outcome: { type: 'string', description: 'Return exactly one: phone_tree_failed, receptionist_only, transferred, decision_maker_reached, voicemail_left, wrong_number, no_answer, or do_not_call.' },
  phone_tree_path: { type: 'string', description: 'The menu options or extensions used, in order. Return null if none were used.' },
  voicemail_left: { type: 'boolean', description: 'True only when the agent actually left a voicemail message.' },
  contact_name: { type: 'string', description: 'Full name voluntarily provided or clearly confirmed for the relevant business contact. Otherwise null.' },
  contact_title: { type: 'string', description: 'Business title voluntarily provided or clearly confirmed. Otherwise null.' },
  contact_email: { type: 'string', description: 'Business email voluntarily provided and confirmed. Otherwise null.' },
  contact_extension: { type: 'string', description: 'Business phone extension voluntarily provided or successfully used. Otherwise null.' },
  appointment_interest: { type: 'string', description: 'Return exactly one: accepted, tentative, declined, or not_asked.' },
  appointment_booking_status: { type: 'string', description: 'Return exactly one: booked, pending_confirmation, declined, not_requested, or tool_failed.' },
  appointment_time: { type: 'string', description: 'Exact booked appointment date, time, and timezone only after a scheduling tool succeeds. Otherwise null.' },
  preferred_day: { type: 'string', description: 'Preferred follow-up day stated by the person when no booking was completed. Otherwise null.' },
  preferred_time_window: { type: 'string', description: 'Preferred follow-up time or time window when no booking was completed. Otherwise null.' },
  preferred_timezone: { type: 'string', description: 'Timezone explicitly stated or confirmed for scheduling. Otherwise null.' },
  follow_up_permission: { type: 'boolean', description: 'True only when the person explicitly permits Devin or Paycor to follow up.' },
  opt_out: { type: 'boolean', description: 'True when any person explicitly asks not to receive further calls.' },
  primary_objection: { type: 'string', description: 'The main objection stated by the person, using their meaning without embellishment. Otherwise null.' },
  next_action: { type: 'string', description: 'The concrete next action supported by the transcript. Return null if none.' },
};

export function buildRecommendedAgentPatch(existing: Record<string, unknown>, postCallWebhookId?: string) {
  const config = asObject(existing.conversation_config);
  const agent = asObject(config.agent);
  const prompt = asObject(agent.prompt);
  const builtIns = asObject(prompt.built_in_tools);
  const voicemail = asObject(builtIns.voicemail_detection);
  const voicemailParams = asObject(voicemail.params);
  const keypad = asObject(builtIns.play_keypad_touch_tone);
  const keypadParams = asObject(keypad.params);
  const platform = asObject(existing.platform_settings);
  const workspaceOverrides = asObject(platform.workspace_overrides);
  const webhooks = asObject(workspaceOverrides.webhooks);

  return {
    conversation_config: {
      agent: {
        first_message: VOICE_AGENT_FIRST_MESSAGE,
        dynamic_variables: { dynamic_variable_placeholders: VOICE_AGENT_DYNAMIC_PLACEHOLDERS },
        prompt: {
          prompt: VOICE_AGENT_PROMPT,
          built_in_tools: {
            ...builtIns,
            play_keypad_touch_tone: { ...keypad, params: { ...keypadParams, use_out_of_band_dtmf: false } },
            voicemail_detection: { ...voicemail, params: { ...voicemailParams, voicemail_message: '{{_voicemail_script_}}' } },
          },
        },
      },
    },
    platform_settings: {
      call_limits: { agent_concurrency_limit: 1, daily_limit: 25, bursting_enabled: false },
      data_collection: VOICE_AGENT_DATA_COLLECTION,
      workspace_overrides: {
        ...workspaceOverrides,
        webhooks: {
          ...webhooks,
          ...(postCallWebhookId ? { post_call_webhook_id: postCallWebhookId } : {}),
          events: ['transcript', 'call_initiation_failure'],
          transcript_format: 'json',
          send_audio: false,
        },
      },
    },
  };
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
