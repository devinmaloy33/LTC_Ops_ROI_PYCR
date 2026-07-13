export const ACTIVE_CALL_STATUSES = ['queued', 'initiated', 'in-progress', 'processing'] as const;
export const APPOINTMENT_STATUSES = ['none', 'pending', 'confirmed', 'declined'] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];
export type TranscriptEntry = { role: string; text: string; atSeconds: number | null };

export function normalizeUsBusinessPhone(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return null;
}

export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 10) return value;
  return `(***) ***-${digits.slice(-4)}`;
}

export function isActiveCallStatus(value: unknown): boolean {
  return ACTIVE_CALL_STATUSES.includes(String(value) as (typeof ACTIVE_CALL_STATUSES)[number]);
}

export function normalizeConversation(payload: Record<string, unknown>) {
  const status = normalizeStatus(payload.status);
  const transcript = normalizeTranscript(payload.transcript);
  const metadata = asObject(payload.metadata);
  const analysis = asObject(payload.analysis);
  const successful = normalizeSuccess(analysis.call_successful);
  const durationSeconds = finiteInteger(metadata.call_duration_secs ?? metadata.duration_seconds);
  const costCredits = finiteInteger(metadata.cost ?? metadata.cost_credits);
  const summary = cleanText(
    analysis.transcript_summary ?? analysis.call_summary ?? analysis.summary ?? payload.summary,
    4000,
  );
  return { status, transcript, summary, successful, durationSeconds, costCredits };
}

export function serializeVoiceCall(row: Record<string, unknown>) {
  return {
    id: String(row.id), ccn: String(row.ccn), campaignId: nullableText(row.campaign_id),
    phoneNumber: String(row.phone_number), persona: String(row.persona),
    knownContactName: nullableText(row.known_contact_name), knownContactTitle: nullableText(row.known_contact_title),
    knownContactEmail: nullableText(row.known_contact_email), knownContactExtension: nullableText(row.known_contact_extension),
    conversationId: nullableText(row.conversation_id), providerCallSid: nullableText(row.provider_call_sid),
    status: String(row.status), transcript: parseTranscript(row.transcript_json), summary: nullableText(row.summary),
    callSuccessful: row.call_successful === null || row.call_successful === undefined ? null : Boolean(row.call_successful),
    durationSeconds: nullableNumber(row.duration_seconds), costCredits: nullableNumber(row.cost_credits),
    capturedContactName: nullableText(row.captured_contact_name), capturedContactTitle: nullableText(row.captured_contact_title),
    capturedContactEmail: nullableText(row.captured_contact_email), capturedContactExtension: nullableText(row.captured_contact_extension),
    appointmentStatus: String(row.appointment_status || 'none'), appointmentDetails: nullableText(row.appointment_details),
    outcomeNotes: nullableText(row.outcome_notes), optedOut: Boolean(row.opted_out), failureReason: nullableText(row.failure_reason),
    complianceAttestedAt: Number(row.compliance_attested_at), startedAt: nullableNumber(row.started_at),
    endedAt: nullableNumber(row.ended_at), createdAt: Number(row.created_at), updatedAt: Number(row.updated_at),
  };
}

export function cleanText(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function normalizeStatus(value: unknown): string {
  const status = String(value || '').toLowerCase();
  return ['initiated', 'in-progress', 'processing', 'done', 'failed'].includes(status) ? status : 'processing';
}

function normalizeTranscript(value: unknown): TranscriptEntry[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 500).map((entry) => {
    const item = asObject(entry);
    const role = cleanText(item.role ?? item.type, 40) || 'unknown';
    const text = cleanText(item.message ?? item.text ?? item.content, 8000);
    return { role, text, atSeconds: nullableNumber(item.time_in_call_secs ?? item.time_seconds) };
  }).filter((entry) => entry.text);
}

function normalizeSuccess(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  const normalized = String(value || '').toLowerCase();
  if (['success', 'successful', 'true'].includes(normalized)) return true;
  if (['failure', 'failed', 'false'].includes(normalized)) return false;
  return null;
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function finiteInteger(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function nullableText(value: unknown): string | null {
  return value === null || value === undefined || value === '' ? null : String(value);
}

function parseTranscript(value: unknown): TranscriptEntry[] {
  try {
    const parsed = JSON.parse(String(value || '[]'));
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item === 'object') as TranscriptEntry[] : [];
  } catch { return []; }
}
