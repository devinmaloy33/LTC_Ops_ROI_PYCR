import { NextResponse } from 'next/server';
import { getD1 } from '@/db';
import { getAdminAuthorization } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await getAdminAuthorization();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.status === 401 ? 'Sign in required.' : 'Administrator access required.' }, { status: auth.status });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Outbound calling is not configured.' }, { status: 503 });

  try {
    const { id } = await context.params;
    const row = await getD1().prepare('SELECT conversation_id FROM voice_calls WHERE id = ?').bind(id)
      .first<Record<string, unknown>>();
    if (!row) return NextResponse.json({ error: 'Call not found.' }, { status: 404 });

    const conversationId = typeof row.conversation_id === 'string' ? row.conversation_id.trim() : '';
    if (!conversationId) {
      return NextResponse.json({ error: 'Audio is not available until ElevenLabs creates the conversation.' }, { status: 409 });
    }

    const providerHeaders = new Headers({ 'xi-api-key': apiKey });
    const range = request.headers.get('range');
    if (range) providerHeaders.set('range', range);
    const providerResponse = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversations/${encodeURIComponent(conversationId)}/audio`,
      { headers: providerHeaders, signal: AbortSignal.timeout(20_000) },
    );

    if (providerResponse.status === 404 || providerResponse.status === 422) {
      return NextResponse.json({
        error: 'No recording is available for this call. Calls placed before recording was enabled cannot be recovered.',
      }, { status: 404 });
    }
    if (!providerResponse.ok) {
      return NextResponse.json({ error: 'The call recording could not be retrieved from ElevenLabs.' }, { status: 502 });
    }

    const responseHeaders = new Headers({
      'Content-Type': providerResponse.headers.get('content-type') || 'audio/mpeg',
      'Cache-Control': 'private, no-store, max-age=0',
      'Content-Disposition': `inline; filename="call-${id}.mp3"`,
    });
    for (const name of ['accept-ranges', 'content-length', 'content-range']) {
      const value = providerResponse.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    return new Response(providerResponse.body, { status: providerResponse.status, headers: responseHeaders });
  } catch (error) {
    console.error('Call audio retrieval failed', error);
    return NextResponse.json({ error: 'The call recording could not be retrieved.' }, { status: 503 });
  }
}
