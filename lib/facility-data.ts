import { getD1 } from '@/db';
import { fetchCmsFacilityByCcn, CmsFacilitySnapshot } from '@/lib/cms-provider';
import { CRITICAL_INPUT_FIELDS } from '@/lib/readiness';

export type ActivityEventType = 'facility_applied' | 'progress_updated' | 'report_opened' | 'report_downloaded';

export type CalculatorSnapshot = {
  headcount?: number;
  turnoverRate?: number;
  overtimeHoursPerYear?: number;
  weeklyAgencyHours?: number;
  agencyHourlyRate?: number;
  pbjHoursPerMonth?: number;
  softwareCost?: number;
  totalPaycorInfluencedBenefit?: number;
  netAnnualBenefit?: number;
  roiPercent?: number | null;
  paybackMonths?: number | null;
};

export type OutreachFact = {
  id: string;
  label: string;
  value: string;
  source: 'CMS-reported' | 'Calculator-provided estimate';
};

type FacilityRow = Record<string, unknown>;

export async function ensureFacility(ccn: string): Promise<FacilityRow> {
  const db = getD1();
  const cached = await db.prepare('SELECT * FROM facilities WHERE ccn = ?').bind(ccn).first<FacilityRow>();
  const now = Date.now();
  const retrievedAt = Number(cached?.cms_retrieved_at || 0);
  if (cached && now - retrievedAt < 12 * 60 * 60 * 1000) {
    await db.prepare('UPDATE facilities SET last_seen_at = ? WHERE ccn = ?').bind(now, ccn).run();
    return { ...cached, last_seen_at: now };
  }

  const facility = await fetchCmsFacilityByCcn(ccn);
  if (!facility) throw new Error('The selected CMS facility could not be resolved.');
  await upsertFacility(facility, now);
  const stored = await db.prepare('SELECT * FROM facilities WHERE ccn = ?').bind(ccn).first<FacilityRow>();
  if (!stored) throw new Error('The CMS facility could not be stored.');
  return stored;
}

async function upsertFacility(facility: CmsFacilitySnapshot, now: number) {
  await getD1().prepare(`
    INSERT INTO facilities (
      ccn, facility_name, legal_business_name, address, city, state, zip,
      chain_name, chain_facilities, beds, residents, overall_rating,
      staffing_rating, health_inspection_rating, quality_measure_rating,
      turnover_rate, rn_turnover, total_fines, health_deficiencies,
      cms_retrieved_at, first_seen_at, last_seen_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(ccn) DO UPDATE SET
      facility_name = excluded.facility_name,
      legal_business_name = excluded.legal_business_name,
      address = excluded.address,
      city = excluded.city,
      state = excluded.state,
      zip = excluded.zip,
      chain_name = excluded.chain_name,
      chain_facilities = excluded.chain_facilities,
      beds = excluded.beds,
      residents = excluded.residents,
      overall_rating = excluded.overall_rating,
      staffing_rating = excluded.staffing_rating,
      health_inspection_rating = excluded.health_inspection_rating,
      quality_measure_rating = excluded.quality_measure_rating,
      turnover_rate = excluded.turnover_rate,
      rn_turnover = excluded.rn_turnover,
      total_fines = excluded.total_fines,
      health_deficiencies = excluded.health_deficiencies,
      cms_retrieved_at = excluded.cms_retrieved_at,
      last_seen_at = excluded.last_seen_at
  `).bind(
    facility.ccn, facility.facilityName, facility.legalBusinessName, facility.address,
    facility.city, facility.state, facility.zip, facility.chainName,
    facility.chainFacilities, facility.beds, facility.residents, facility.overallRating,
    facility.staffingRating, facility.healthInspectionRating, facility.qualityMeasureRating,
    facility.turnoverRate, facility.rnTurnover, facility.totalFines,
    facility.healthDeficiencies, facility.retrievedAt, now, now,
  ).run();
}

export async function recordFacilityActivity(input: {
  eventType: ActivityEventType;
  sessionId: string;
  ccn: string;
  currentStep?: number;
  isComplete?: boolean;
  missingFields?: string[];
  calculatorSnapshot?: CalculatorSnapshot;
}) {
  await ensureFacility(input.ccn);
  const db = getD1();
  const now = Date.now();
  const existing = await db.prepare(
    'SELECT * FROM facility_engagements WHERE session_id = ? AND ccn = ?',
  ).bind(input.sessionId, input.ccn).first<Record<string, unknown>>();
  const engagementId = String(existing?.id || crypto.randomUUID());
  const missingFields = input.missingFields || (existing ? safeStringArray(existing.missing_fields_json) : [...CRITICAL_INPUT_FIELDS]);
  const isComplete = input.isComplete ?? Boolean(existing?.is_complete);
  const currentStep = input.currentStep ?? Number(existing?.current_step || 1);
  const snapshotJson = input.calculatorSnapshot
    ? JSON.stringify(input.calculatorSnapshot)
    : (existing?.calculator_snapshot_json as string | null) || null;

  if (!existing) {
    await db.prepare(`
      INSERT INTO facility_engagements (
        id, session_id, ccn, started_at, last_activity_at, current_step,
        is_complete, missing_fields_json, calculator_snapshot_json,
        download_count, last_downloaded_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      engagementId, input.sessionId, input.ccn, now, now, currentStep,
      isComplete ? 1 : 0, JSON.stringify(missingFields), snapshotJson,
      input.eventType === 'report_downloaded' ? 1 : 0,
      input.eventType === 'report_downloaded' ? now : null,
    ).run();
  } else {
    await db.prepare(`
      UPDATE facility_engagements SET
        last_activity_at = ?, current_step = ?, is_complete = ?,
        missing_fields_json = ?, calculator_snapshot_json = ?,
        download_count = download_count + ?,
        last_downloaded_at = CASE WHEN ? = 1 THEN ? ELSE last_downloaded_at END
      WHERE id = ?
    `).bind(
      now, currentStep, isComplete ? 1 : 0, JSON.stringify(missingFields), snapshotJson,
      input.eventType === 'report_downloaded' ? 1 : 0,
      input.eventType === 'report_downloaded' ? 1 : 0, now, engagementId,
    ).run();
  }

  const priorMissing = existing ? safeStringArray(existing.missing_fields_json) : [];
  const progressChanged = !existing || Boolean(existing.is_complete) !== isComplete ||
    Number(existing.current_step || 1) !== currentStep || JSON.stringify(priorMissing) !== JSON.stringify(missingFields);
  if (input.eventType !== 'progress_updated' || progressChanged) {
    await db.prepare(`
      INSERT INTO facility_events (id, engagement_id, ccn, event_type, metadata_json, occurred_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(), engagementId, input.ccn, input.eventType,
      JSON.stringify({ currentStep, isComplete, missingFields }), now,
    ).run();
  }
}

export function buildAvailableFacts(facility: FacilityRow, snapshot: CalculatorSnapshot | null): OutreachFact[] {
  const facts: OutreachFact[] = [];
  const add = (id: string, label: string, raw: unknown, formatter: (value: number) => string = String) => {
    if (raw === null || raw === undefined || raw === '') return;
    const numeric = Number(raw);
    facts.push({ id, label, value: Number.isFinite(numeric) ? formatter(numeric) : String(raw), source: 'CMS-reported' });
  };
  add('cms.overall_rating', 'Overall rating', facility.overall_rating, (v) => `${v} of 5 stars`);
  add('cms.staffing_rating', 'Staffing rating', facility.staffing_rating, (v) => `${v} of 5 stars`);
  add('cms.health_inspection_rating', 'Health inspection rating', facility.health_inspection_rating, (v) => `${v} of 5 stars`);
  add('cms.quality_measure_rating', 'Quality measure rating', facility.quality_measure_rating, (v) => `${v} of 5 stars`);
  add('cms.turnover_rate', 'Nursing staff turnover', facility.turnover_rate, (v) => `${v}%`);
  add('cms.rn_turnover', 'Registered nurse turnover', facility.rn_turnover, (v) => `${v}%`);
  add('cms.beds', 'Certified beds', facility.beds, (v) => `${Math.round(v)} beds`);
  add('cms.residents', 'Average residents per day', facility.residents, (v) => `${Math.round(v)} residents per day`);
  add('cms.health_deficiencies', 'Health deficiencies', facility.health_deficiencies, (v) => `${Math.round(v)} deficiencies`);
  add('cms.total_fines', 'Total CMS-reported fines', facility.total_fines, (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v));
  if (facility.chain_name) facts.push({ id: 'cms.chain_name', label: 'Chain affiliation', value: String(facility.chain_name), source: 'CMS-reported' });

  if (snapshot) {
    const labels: Record<keyof CalculatorSnapshot, string> = {
      headcount: 'Employee headcount', turnoverRate: 'Turnover rate used',
      overtimeHoursPerYear: 'Annual overtime hours', weeklyAgencyHours: 'Weekly agency hours',
      agencyHourlyRate: 'Agency hourly rate', pbjHoursPerMonth: 'Monthly PBJ administration hours',
      softwareCost: 'Annual Paycor investment', totalPaycorInfluencedBenefit: 'Modeled annual Paycor-influenced benefit',
      netAnnualBenefit: 'Modeled net annual benefit', roiPercent: 'Modeled net ROI', paybackMonths: 'Modeled payback period',
    };
    for (const [key, raw] of Object.entries(snapshot) as Array<[keyof CalculatorSnapshot, number | null | undefined]>) {
      if (raw === null || raw === undefined || !Number.isFinite(raw)) continue;
      let value = String(raw);
      if (['softwareCost', 'totalPaycorInfluencedBenefit', 'netAnnualBenefit'].includes(key)) {
        value = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(raw);
      } else if (key === 'roiPercent' || key === 'turnoverRate') value = `${raw}%`;
      else if (key === 'paybackMonths') value = `${raw.toFixed(1)} months`;
      facts.push({ id: `calculator.${key}`, label: labels[key], value, source: 'Calculator-provided estimate' });
    }
  }
  return facts;
}

export function safeJsonObject<T>(value: unknown): T | null {
  if (!value || typeof value !== 'string') return null;
  try { return JSON.parse(value) as T; } catch { return null; }
}

function safeStringArray(value: unknown): string[] {
  const parsed = safeJsonObject<unknown>(value);
  return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
}
