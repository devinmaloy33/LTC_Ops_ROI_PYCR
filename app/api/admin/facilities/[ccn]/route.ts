import { NextResponse } from 'next/server';
import { getD1 } from '@/db';
import { getAdminAuthorization } from '@/lib/admin-auth';
import { buildAvailableFacts, CalculatorSnapshot, safeJsonObject } from '@/lib/facility-data';
import { serializeVoiceCall } from '@/lib/voice-calls';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, context: { params: Promise<{ ccn: string }> }) {
  const auth = await getAdminAuthorization();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.status === 401 ? 'Sign in required.' : 'Administrator access required.' }, { status: auth.status });
  }
  const { ccn } = await context.params;
  if (!/^\d{6}$/.test(ccn)) return NextResponse.json({ error: 'Invalid CCN.' }, { status: 400 });
  const db = getD1();
  const facility = await db.prepare('SELECT * FROM facilities WHERE ccn = ?').bind(ccn).first<Record<string, unknown>>();
  if (!facility) return NextResponse.json({ error: 'Facility not found.' }, { status: 404 });

  const [engagementResult, eventResult, campaignResult, callResult, suppressionResult] = await Promise.all([
    db.prepare('SELECT * FROM facility_engagements WHERE ccn = ? ORDER BY last_activity_at DESC LIMIT 25').bind(ccn).all<Record<string, unknown>>(),
    db.prepare('SELECT * FROM facility_events WHERE ccn = ? ORDER BY occurred_at DESC LIMIT 100').bind(ccn).all<Record<string, unknown>>(),
    db.prepare('SELECT * FROM outreach_campaigns WHERE ccn = ? ORDER BY created_at DESC LIMIT 25').bind(ccn).all<Record<string, unknown>>(),
    db.prepare('SELECT * FROM voice_calls WHERE ccn = ? ORDER BY created_at DESC LIMIT 25').bind(ccn).all<Record<string, unknown>>(),
    db.prepare('SELECT phone_number, reason, created_at FROM do_not_call_numbers WHERE ccn = ? ORDER BY created_at DESC').bind(ccn).all<Record<string, unknown>>(),
  ]);
  const engagements = (engagementResult.results || []).map((row) => ({
    id: String(row.id), startedAt: Number(row.started_at), lastActivityAt: Number(row.last_activity_at),
    currentStep: Number(row.current_step), isComplete: Boolean(row.is_complete),
    missingFields: parseArray(row.missing_fields_json), downloadCount: Number(row.download_count || 0),
    lastDownloadedAt: row.last_downloaded_at === null ? null : Number(row.last_downloaded_at),
  }));
  const latestSnapshot = safeJsonObject<CalculatorSnapshot>(
    (engagementResult.results || []).find((row) => row.calculator_snapshot_json)?.calculator_snapshot_json,
  );
  const events = (eventResult.results || []).map((row) => ({
    id: String(row.id), eventType: String(row.event_type), occurredAt: Number(row.occurred_at),
    metadata: safeJsonObject<Record<string, unknown>>(row.metadata_json) || {},
  }));
  const campaigns = (campaignResult.results || []).map((row) => ({
    id: String(row.id), persona: String(row.persona), contactName: row.contact_name ? String(row.contact_name) : null,
    contactTitle: row.contact_title ? String(row.contact_title) : null, createdAt: Number(row.created_at),
    selectedFacts: parseArray(row.selected_facts_json, true),
    campaign: safeJsonObject<Record<string, unknown>>(row.campaign_json), model: String(row.model),
  }));
  const voiceCalls = (callResult.results || []).map(serializeVoiceCall);
  const doNotCallNumbers = (suppressionResult.results || []).map((row) => ({
    phoneNumber: String(row.phone_number), reason: String(row.reason), createdAt: Number(row.created_at),
  }));

  return NextResponse.json({
    facility: {
      ccn: String(facility.ccn), facilityName: String(facility.facility_name), legalBusinessName: facility.legal_business_name,
      address: facility.address, city: facility.city, state: facility.state, zip: facility.zip,
      chainName: facility.chain_name, chainFacilities: facility.chain_facilities, beds: facility.beds, residents: facility.residents,
      overallRating: facility.overall_rating, staffingRating: facility.staffing_rating,
      healthInspectionRating: facility.health_inspection_rating, qualityMeasureRating: facility.quality_measure_rating,
      turnoverRate: facility.turnover_rate, rnTurnover: facility.rn_turnover,
      totalFines: facility.total_fines, healthDeficiencies: facility.health_deficiencies,
      cmsRetrievedAt: Number(facility.cms_retrieved_at), firstSeenAt: Number(facility.first_seen_at), lastSeenAt: Number(facility.last_seen_at),
    },
    engagements, events, campaigns, voiceCalls, doNotCallNumbers,
    availableFacts: buildAvailableFacts(facility, latestSnapshot),
  });
}

function parseArray(value: unknown, allowObjects = false): unknown[] {
  try { const parsed = JSON.parse(String(value || '[]')); return Array.isArray(parsed) ? parsed.filter((item) => allowObjects || typeof item === 'string') : []; } catch { return []; }
}
