import { NextResponse } from 'next/server';
import { getD1 } from '@/db';
import { getAdminAuthorization } from '@/lib/admin-auth';
import { persistConversationUpdate } from '@/lib/call-tracking';
import { serializeVoiceCall } from '@/lib/voice-calls';

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
    await persistConversationUpdate({ db, callId: id, payload, source: 'poll' });
    const updated = await db.prepare('SELECT * FROM voice_calls WHERE id = ?').bind(id).first<Record<string, unknown>>();
    return NextResponse.json({ call: serializeVoiceCall(updated || {}) });
  } catch (error) {
    console.error('Call sync failed', error);
    return NextResponse.json({ error: 'The latest call status could not be retrieved.' }, { status: 503 });
  }
}
