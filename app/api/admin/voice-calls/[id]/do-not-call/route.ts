import { NextRequest, NextResponse } from 'next/server';
import { getD1 } from '@/db';
import { getAdminAuthorization } from '@/lib/admin-auth';
import { cleanText, serializeVoiceCall } from '@/lib/voice-calls';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await getAdminAuthorization();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.status === 401 ? 'Sign in required.' : 'Administrator access required.' }, { status: auth.status });
  }
  const { id } = await context.params;
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const reason = cleanText(body.reason, 300) || 'Recipient requested no further calls.';
    const db = getD1();
    const call = await db.prepare('SELECT * FROM voice_calls WHERE id = ?').bind(id).first<Record<string, unknown>>();
    if (!call) return NextResponse.json({ error: 'Call not found.' }, { status: 404 });
    const now = Date.now();
    await db.batch([
      db.prepare(`
        INSERT INTO do_not_call_numbers (phone_number, ccn, source_call_id, reason, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(phone_number) DO UPDATE SET reason = excluded.reason, source_call_id = excluded.source_call_id
      `).bind(String(call.phone_number), String(call.ccn), id, reason, auth.user.email, now),
      db.prepare(`UPDATE voice_calls SET opted_out = 1, outcome_notes = COALESCE(outcome_notes, ?), updated_at = ? WHERE id = ?`)
        .bind(reason, now, id),
    ]);
    const updated = await db.prepare('SELECT * FROM voice_calls WHERE id = ?').bind(id).first<Record<string, unknown>>();
    return NextResponse.json({ call: serializeVoiceCall(updated || {}), suppressed: true });
  } catch (error) {
    console.error('Do-not-call update failed', error);
    return NextResponse.json({ error: 'The number could not be added to the do-not-call list.' }, { status: 503 });
  }
}
