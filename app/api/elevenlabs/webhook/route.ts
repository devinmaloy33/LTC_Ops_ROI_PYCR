import { NextResponse } from 'next/server';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { getD1 } from '@/db';
import { persistConversationUpdate } from '@/lib/call-tracking';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const secret = process.env.ELEVENLABS_WEBHOOK_SECRET;
  const signature = request.headers.get('elevenlabs-signature');
  if (!secret) return NextResponse.json({ error: 'Webhook verification is not configured.' }, { status: 503 });
  if (!signature) return NextResponse.json({ error: 'Missing signature.' }, { status: 401 });

  const rawBody = await request.text();
  let event: Record<string, unknown>;
  try {
    const client = new ElevenLabsClient();
    event = await client.webhooks.constructEvent(rawBody, signature, secret) as unknown as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 });
  }

  const eventType = clean(event.type, 80);
  if (!['post_call_transcription', 'call_initiation_failure'].includes(eventType)) {
    return NextResponse.json({ received: true });
  }
  const data = asObject(event.data);
  const configuredAgentId = process.env.ELEVENLABS_AGENT_ID;
  if (configuredAgentId && clean(data.agent_id, 120) !== configuredAgentId) {
    return NextResponse.json({ received: true });
  }

  const conversationId = clean(data.conversation_id, 120);
  const eventTimestamp = Math.round(Number(event.event_timestamp || 0));
  if (!conversationId || !Number.isFinite(eventTimestamp) || eventTimestamp < 1) {
    return NextResponse.json({ error: 'Invalid webhook payload.' }, { status: 400 });
  }

  const db = getD1();
  const eventId = `${eventType}:${conversationId}:${eventTimestamp}`;
  const inserted = await db.prepare(`
    INSERT OR IGNORE INTO voice_webhook_events (id, event_type, conversation_id, event_timestamp, received_at)
    VALUES (?, ?, ?, ?, ?)
  `).bind(eventId, eventType, conversationId, eventTimestamp, Date.now()).run();
  if (Number(inserted.meta.changes || 0) === 0) return NextResponse.json({ received: true, duplicate: true });

  const callRecordId = dynamicCallRecordId(data);
  const call = callRecordId
    ? await db.prepare('SELECT id FROM voice_calls WHERE id = ? OR conversation_id = ? LIMIT 1').bind(callRecordId, conversationId).first<Record<string, unknown>>()
    : await db.prepare('SELECT id FROM voice_calls WHERE conversation_id = ? LIMIT 1').bind(conversationId).first<Record<string, unknown>>();
  if (!call?.id) return NextResponse.json({ received: true, unmatched: true });

  if (eventType === 'call_initiation_failure') {
    const now = Date.now();
    await db.prepare(`
      UPDATE voice_calls SET status = 'failed', failure_reason = ?, ended_at = COALESCE(ended_at, ?), updated_at = ? WHERE id = ?
    `).bind(clean(data.failure_reason, 500) || 'Call initiation failed.', now, now, String(call.id)).run();
  } else {
    await persistConversationUpdate({ db, callId: String(call.id), payload: data, source: 'webhook' });
  }

  return NextResponse.json({ received: true });
}

function dynamicCallRecordId(data: Record<string, unknown>) {
  const initiation = asObject(data.conversation_initiation_client_data);
  const variables = asObject(initiation.dynamic_variables);
  return clean(variables._call_record_id_, 120);
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function clean(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}
