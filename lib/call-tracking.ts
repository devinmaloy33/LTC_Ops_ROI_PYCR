// lib/call-tracking.ts
import { CONNECTION_OUTCOMES, normalizeConversation } from '@/lib/voice-calls';
import { bookAppointmentFromCallOutcome } from '@/lib/calendly';

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
      status = ?, transcript_json = ?, summary = ?, call_successful = ?,
      duration_seconds = ?, cost_credits = ?,
      agent_version_id = COALESCE(?, agent_version_id),
      data_collection_json = ?, evaluations_json = ?,
      captured_contact_name  = COALESCE(?, captured_contact_name),
      captured_contact_title = COALESCE(?, captured_contact_title),
      captured_contact_email = COALESCE(?, captured_contact_email),
      captured_contact_extension = COALESCE(?, captured_contact_extension),
      connection_outcome = COALESCE(?, connection_outcome),
      phone_tree_path    = COALESCE(?, phone_tree_path),
      voicemail_left     = CASE WHEN ? = 1 THEN 1 ELSE voicemail_left END,
      appointment_status  = COALESCE(?, appointment_status),
      appointment_details = COALESCE(?, appointment_details),
      preferred_day         = COALESCE(?, preferred_day),
      preferred_time_window = COALESCE(?, preferred_time_window),
      preferred_timezone    = COALESCE(?, preferred_timezone),
      follow_up_permission  = COALESCE(?, follow_up_permission),
      opted_out      = CASE WHEN ? = 1 THEN 1 ELSE opted_out END,
      auto_extracted_at = CASE WHEN ? = 1 THEN ? ELSE auto_extracted_at END,
      ended_at    = CASE WHEN ? = 1 THEN COALESCE(ended_at, ?) ELSE ended_at END,
      failure_reason = CASE WHEN ? = 1 THEN COALESCE(failure_reason, 'ElevenLabs reported a failed call.') ELSE failure_reason END,
      updated_at = ?
    WHERE id = ?
  `).bind(
    normalized.status,
    JSON.stringify(normalized.transcript),
    normalized.summary || null,
    normalized.successful === null ? null : normalized.successful ? 1 : 0,
    normalized.durationSeconds,
    normalized.costCredits,
    normalized.agentVersionId,
    JSON.stringify(normalized.dataCollection),
    JSON.stringify(normalized.evaluations),
    extracted.contactName,
    extracted.contactTitle,
    extracted.contactEmail,
    extracted.contactExtension,
    extracted.connectionOutcome,
    extracted.phoneTreePath,
    extracted.voicemailLeft ? 1 : 0,
    appointmentStatus,
    appointmentDetails,
    extracted.preferredDay,
    extracted.preferredTimeWindow,
    extracted.preferredTimezone,
    boolToDb(extracted.followUpPermission),
    extracted.optOut ? 1 : 0,
    Object.keys(normalized.dataCollection).length > 0 ? 1 : 0,
    now,
    terminal ? 1 : 0,
    now,
    normalized.
