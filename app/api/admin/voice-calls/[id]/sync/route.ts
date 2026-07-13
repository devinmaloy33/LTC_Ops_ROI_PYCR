import { NextResponse } from 'next/server';
import { getD1 } from '@/db';
import { getAdminAuthorization } from '@/lib/admin-auth';
import { normalizeConversation, serializeVoiceCall } from '@/lib/voice-calls';

export const dynamic = 'force-dynamic';

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await getAdminAuthorization();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.status === 401 ? 'Sign in required.' : 'Administrator access required.' }, { status: auth.status });
  }
  const { id } = await context.params;
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Outbound calling is not configured.' }, { status: 503 });

  try {
    const db = getD1();
    const current = await db.prepare('SELECT * FROM voice_calls WHERE id = ?').bind(id).first<Record<string, unknown>>();
    if (!current) return NextResponse.json({ error: 'Call not found.' }, { status: 404 });
    const conversationId = current.conversation_id ? String(current.conversation_id) : '';
    if (!conversationId) return NextResponse.json({ call: serializeVoiceCall(current) });

    const response = await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${encodeURIComponent(conversationId)}`, {
      headers: { 'xi-api-key': apiKey }, signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) return NextResponse.json({ error: 'The latest call status could not be retrieved.' }, { status: 502 });
    const payload = await response.json() as Record<string, unknown>;
    const normalized = normalizeConversation(payload);
    const terminal = normalized.status === 'done' || normalized.status === 'failed';
    const now = Date.now();
    await db.prepare(`
      UPDATE voice_calls SET status = ?, transcript_json = ?, summary = ?, call_successful = ?,
        duration_seconds = ?, cost_credits = ?, ended_at = CASE WHEN ? THEN COALESCE(ended_at, ?) ELSE ended_at END,
        failure_reason = CASE WHEN ? THEN COALESCE(failure_reason, 'ElevenLabs reported a failed call.') ELSE failure_reason END,
        updated_at = ? WHERE id = ?
    `).bind(
      normalized.status, JSON.stringify(normalized.transcript), normalized.summary || null,
      normalized.successful === null ? null : normalized.successful ? 1 : 0,
      normalized.durationSeconds, normalized.costCredits, terminal ? 1 : 0, now,
      normalized.status === 'failed' ? 1 : 0, now, id,
    ).run();
    const updated = await db.prepare('SELECT * FROM voice_calls WHERE id = ?').bind(id).first<Record<string, unknown>>();
    return NextResponse.json({ call: serializeVoiceCall(updated || {}) });
  } catch (error) {
    console.error('Call sync failed', error);
    return NextResponse.json({ error: 'The latest call status could not be retrieved.' }, { status: 503 });
  }
}
