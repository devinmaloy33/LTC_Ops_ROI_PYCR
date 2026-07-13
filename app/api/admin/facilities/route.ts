import { NextRequest, NextResponse } from 'next/server';
import { getD1 } from '@/db';
import { getAdminAuthorization } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await getAdminAuthorization();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.status === 401 ? 'Sign in required.' : 'Administrator access required.' }, { status: auth.status });
  }

  const result = await getD1().prepare(`
    SELECT
      f.*,
      COALESCE((SELECT COUNT(*) FROM facility_engagements e WHERE e.ccn = f.ccn), 0) AS session_count,
      COALESCE((SELECT SUM(download_count) FROM facility_engagements e WHERE e.ccn = f.ccn), 0) AS download_count,
      COALESCE((SELECT is_complete FROM facility_engagements e WHERE e.ccn = f.ccn ORDER BY last_activity_at DESC LIMIT 1), 0) AS is_complete,
      COALESCE((SELECT missing_fields_json FROM facility_engagements e WHERE e.ccn = f.ccn ORDER BY last_activity_at DESC LIMIT 1), '[]') AS missing_fields_json,
      COALESCE((SELECT MAX(last_activity_at) FROM facility_engagements e WHERE e.ccn = f.ccn), f.last_seen_at) AS last_activity_at,
      (SELECT last_downloaded_at FROM facility_engagements e WHERE e.ccn = f.ccn AND last_downloaded_at IS NOT NULL ORDER BY last_downloaded_at DESC LIMIT 1) AS last_downloaded_at,
      COALESCE((SELECT COUNT(*) FROM voice_calls v WHERE v.ccn = f.ccn), 0) AS voice_call_count,
      COALESCE((SELECT COUNT(*) FROM voice_calls v WHERE v.ccn = f.ccn AND v.appointment_status = 'pending'), 0) AS pending_appointment_count,
      (SELECT status FROM voice_calls v WHERE v.ccn = f.ccn ORDER BY created_at DESC LIMIT 1) AS latest_call_status
    FROM facilities f
    ORDER BY last_activity_at DESC
  `).all<Record<string, unknown>>();

  const rows = (result.results || []).map(normalizeFacilityRow);
  const params = request.nextUrl.searchParams;
  const query = (params.get('q') || '').trim().toLowerCase();
  const status = params.get('status') || 'all';
  const downloaded = params.get('downloaded') || 'all';
  const state = (params.get('state') || 'all').toUpperCase();
  const facilities = rows.filter((row) => {
    const haystack = `${row.facilityName} ${row.ccn} ${row.city} ${row.state} ${row.chainName || ''}`.toLowerCase();
    if (query && !haystack.includes(query)) return false;
    if (status === 'complete' && !row.isComplete) return false;
    if (status === 'needs_completion' && row.isComplete) return false;
    if (downloaded === 'yes' && row.downloadCount < 1) return false;
    if (downloaded === 'no' && row.downloadCount > 0) return false;
    if (state !== 'ALL' && row.state !== state) return false;
    return true;
  });

  return NextResponse.json({
    summary: {
      facilities: rows.length,
      complete: rows.filter((row) => row.isComplete).length,
      needsCompletion: rows.filter((row) => !row.isComplete).length,
      downloaded: rows.filter((row) => row.downloadCount > 0).length,
      voiceCalls: rows.reduce((sum, row) => sum + row.voiceCallCount, 0),
      appointmentsPending: rows.reduce((sum, row) => sum + row.pendingAppointmentCount, 0),
    },
    states: Array.from(new Set(rows.map((row) => row.state).filter(Boolean))).sort(),
    facilities,
  });
}

function normalizeFacilityRow(row: Record<string, unknown>) {
  return {
    ccn: String(row.ccn), facilityName: String(row.facility_name),
    city: String(row.city || ''), state: String(row.state || ''), zip: String(row.zip || ''),
    chainName: row.chain_name ? String(row.chain_name) : null,
    overallRating: nullableNumber(row.overall_rating), staffingRating: nullableNumber(row.staffing_rating),
    healthInspectionRating: nullableNumber(row.health_inspection_rating), qualityMeasureRating: nullableNumber(row.quality_measure_rating),
    sessionCount: Number(row.session_count || 0), downloadCount: Number(row.download_count || 0),
    isComplete: Boolean(row.is_complete), missingFields: safeStringArray(row.missing_fields_json),
    lastActivityAt: Number(row.last_activity_at || 0), lastDownloadedAt: nullableNumber(row.last_downloaded_at),
    voiceCallCount: Number(row.voice_call_count || 0), pendingAppointmentCount: Number(row.pending_appointment_count || 0),
    latestCallStatus: row.latest_call_status ? String(row.latest_call_status) : null,
  };
}

function nullableNumber(value: unknown) { const parsed = Number(value); return value === null || value === undefined || !Number.isFinite(parsed) ? null : parsed; }
function safeStringArray(value: unknown) { try { const parsed = JSON.parse(String(value || '[]')); return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []; } catch { return []; } }
