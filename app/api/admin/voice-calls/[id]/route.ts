import { NextRequest, NextResponse } from 'next/server';
import { getD1 } from '@/db';
import { getAdminAuthorization } from '@/lib/admin-auth';
import { APPOINTMENT_STATUSES, cleanText, serializeVoiceCall } from '@/lib/voice-calls';

export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await getAdminAuthorization();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.status === 401 ? 'Sign in required.' : 'Administrator access required.' }, { status: auth.status });
  }
  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: 'Call ID is required.' }, { status: 400 });

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const appointmentStatus = cleanText(body.appointmentStatus, 20);
    if (!APPOINTMENT_STATUSES.includes(appointmentStatus as never)) {
      return NextResponse.json({ error: 'Choose a valid appointment status.' }, { status: 400 });
    }
    const values = {
      capturedContactName: cleanText(body.capturedContactName, 120),
      capturedContactTitle: cleanText(body.capturedContactTitle, 120),
      capturedContactEmail: cleanText(body.capturedContactEmail, 160),
      capturedContactExtension: cleanText(body.capturedContactExtension, 20),
      appointmentDetails: cleanText(body.appointmentDetails, 500),
      outcomeNotes: cleanText(body.outcomeNotes, 1500),
    };
    if (values.capturedContactEmail && !/^\S+@\S+\.\S+$/.test(values.capturedContactEmail)) {
      return NextResponse.json({ error: 'Enter a valid captured contact email or leave it blank.' }, { status: 400 });
    }
    const db = getD1();
    const existing = await db.prepare('SELECT id FROM voice_calls WHERE id = ?').bind(id).first();
    if (!existing) return NextResponse.json({ error: 'Call not found.' }, { status: 404 });
    await db.prepare(`
      UPDATE voice_calls SET
        captured_contact_name = ?, captured_contact_title = ?, captured_contact_email = ?, captured_contact_extension = ?,
        appointment_status = ?, appointment_details = ?, outcome_notes = ?, updated_at = ?
      WHERE id = ?
    `).bind(
      values.capturedContactName || null, values.capturedContactTitle || null,
      values.capturedContactEmail || null, values.capturedContactExtension || null,
      appointmentStatus, values.appointmentDetails || null, values.outcomeNotes || null, Date.now(), id,
    ).run();
    const row = await db.prepare('SELECT * FROM voice_calls WHERE id = ?').bind(id).first<Record<string, unknown>>();
    return NextResponse.json({ call: serializeVoiceCall(row || {}) });
  } catch (error) {
    console.error('Call outcome update failed', error);
    return NextResponse.json({ error: 'The call outcome could not be saved.' }, { status: 503 });
  }
}
