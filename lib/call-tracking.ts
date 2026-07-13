import { CONNECTION_OUTCOMES, normalizeConversation } from '@/lib/voice-calls';

type NormalizedConversation = ReturnType<typeof normalizeConversation>;

export async function persistConversationUpdate(input: {
  db: D1Database;
  callId: string;
  payload: Record<string, unknown>;
  source: 'poll' | 'webhook';
}) {
  const normalized = normalizeConversation(input.payload);
  const extracted = extractOutcome(normalized.dataCollection);
  const terminal = normalized.status === 'done' || normalized.status === 'failed';
  const now = Date.now();
  const appointmentStatus = extracted.appointmentStatus;
  const appointmentDetails = extracted.appointmentDetails;

  await input.db.prepare(`
    UPDATE voice_calls SET
      status = ?, transcript_json = ?, summary = ?, call_successful = ?, duration_seconds = ?, cost_credits = ?,
      agent_version_id = COALESCE(?, agent_version_id), data_collection_json = ?, evaluations_json = ?,
      captured_contact_name = COALESCE(?, captured_contact_name),
      captured_contact_title = COALESCE(?, captured_contact_title),
      captured_contact_email = COALESCE(?, captured_contact_email),
      captured_contact_extension = COALESCE(?, captured_contact_extension),
      connection_outcome = COALESCE(?, connection_outcome), phone_tree_path = COALESCE(?, phone_tree_path),
      voicemail_left = CASE WHEN ? = 1 THEN 1 ELSE voicemail_left END,
      appointment_status = COALESCE(?, appointment_status),
      appointment_details = COALESCE(?, appointment_details),
      preferred_day = COALESCE(?, preferred_day), preferred_time_window = COALESCE(?, preferred_time_window),
      preferred_timezone = COALESCE(?, preferred_timezone), follow_up_permission = COALESCE(?, follow_up_permission),
      opted_out = CASE WHEN ? = 1 THEN 1 ELSE opted_out END,
      auto_extracted_at = CASE WHEN ? = 1 THEN ? ELSE auto_extracted_at END,
      ended_at = CASE WHEN ? = 1 THEN COALESCE(ended_at, ?) ELSE ended_at END,
      failure_reason = CASE WHEN ? = 1 THEN COALESCE(failure_reason, 'ElevenLabs reported a failed call.') ELSE failure_reason END,
      updated_at = ? WHERE id = ?
  `).bind(
    normalized.status, JSON.stringify(normalized.transcript), normalized.summary || null,
    normalized.successful === null ? null : normalized.successful ? 1 : 0,
    normalized.durationSeconds, normalized.costCredits, normalized.agentVersionId,
    JSON.stringify(normalized.dataCollection), JSON.stringify(normalized.evaluations),
    extracted.contactName, extracted.contactTitle, extracted.contactEmail, extracted.contactExtension,
    extracted.connectionOutcome, extracted.phoneTreePath, extracted.voicemailLeft ? 1 : 0,
    appointmentStatus, appointmentDetails, extracted.preferredDay, extracted.preferredTimeWindow,
    extracted.preferredTimezone, boolToDb(extracted.followUpPermission), extracted.optOut ? 1 : 0,
    Object.keys(normalized.dataCollection).length > 0 ? 1 : 0, now,
    terminal ? 1 : 0, now, normalized.status === 'failed' ? 1 : 0, now, input.callId,
  ).run();

  if (extracted.optOut) {
    const call = await input.db.prepare('SELECT ccn, phone_number FROM voice_calls WHERE id = ?').bind(input.callId).first<Record<string, unknown>>();
    if (call?.phone_number) {
      await input.db.prepare(`
        INSERT OR IGNORE INTO do_not_call_numbers (phone_number, ccn, source_call_id, reason, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        String(call.phone_number), call.ccn ? String(call.ccn) : null, input.callId,
        'Recipient requested no further calls during the conversation.', `elevenlabs_${input.source}`, now,
      ).run();
    }
  }

  return normalized;
}

export function extractOutcome(dataCollection: Record<string, unknown>) {
  const get = (key: string) => unwrap(dataCollection[key]);
  const connection = clean(get('connection_outcome'), 80);
  const bookingStatus = clean(get('appointment_booking_status'), 80).toLowerCase();
  const interest = clean(get('appointment_interest'), 80).toLowerCase();
  const appointmentTime = clean(get('appointment_time'), 300);
  const preferredDay = clean(get('preferred_day'), 120);
  const preferredTimeWindow = clean(get('preferred_time_window'), 160);
  const preferredTimezone = clean(get('preferred_timezone'), 100);
  const detailParts = [appointmentTime, preferredDay, preferredTimeWindow, preferredTimezone].filter(Boolean);
  let appointmentStatus: 'confirmed' | 'pending' | 'declined' | null = null;
  if (['booked', 'scheduled', 'confirmed'].includes(bookingStatus)) appointmentStatus = 'confirmed';
  else if (bookingStatus === 'declined' || interest === 'declined') appointmentStatus = 'declined';
  else if (['pending_confirmation', 'tool_failed'].includes(bookingStatus) || ['accepted', 'tentative'].includes(interest)) appointmentStatus = 'pending';

  return {
    connectionOutcome: CONNECTION_OUTCOMES.includes(connection as never) ? connection : null,
    phoneTreePath: clean(get('phone_tree_path'), 800) || null,
    voicemailLeft: toBoolean(get('voicemail_left')),
    contactName: clean(get('contact_name'), 120) || null,
    contactTitle: clean(get('contact_title'), 120) || null,
    contactEmail: validEmail(get('contact_email')),
    contactExtension: clean(get('contact_extension'), 20) || null,
    appointmentStatus,
    appointmentDetails: detailParts.length ? detailParts.join(' · ') : null,
    preferredDay: preferredDay || null,
    preferredTimeWindow: preferredTimeWindow || null,
    preferredTimezone: preferredTimezone || null,
    followUpPermission: toNullableBoolean(get('follow_up_permission')),
    optOut: toBoolean(get('opt_out')) || connection === 'do_not_call',
  };
}

function unwrap(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const item = value as Record<string, unknown>;
  if ('value' in item) return item.value;
  if ('result' in item && typeof item.result !== 'object') return item.result;
  return value;
}

function clean(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function validEmail(value: unknown) {
  const email = clean(value, 160);
  return /^\S+@\S+\.\S+$/.test(email) ? email : null;
}

function toBoolean(value: unknown) {
  if (typeof value === 'boolean') return value;
  return ['true', 'yes', '1'].includes(String(value || '').toLowerCase());
}

function toNullableBoolean(value: unknown): boolean | null {
  if (value === null || value === undefined || value === '') return null;
  return toBoolean(value);
}

function boolToDb(value: boolean | null) {
  return value === null ? null : value ? 1 : 0;
}
