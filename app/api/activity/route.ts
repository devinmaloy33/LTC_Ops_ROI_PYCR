import { NextRequest, NextResponse } from 'next/server';
import { recordFacilityActivity, ActivityEventType, CalculatorSnapshot } from '@/lib/facility-data';
import { CRITICAL_INPUT_FIELDS } from '@/lib/readiness';

export const dynamic = 'force-dynamic';

const EVENT_TYPES = new Set<ActivityEventType>([
  'facility_applied', 'progress_updated', 'report_opened', 'report_downloaded',
]);
const SESSION_COOKIE = 'ltc_activity_session';
const SNAPSHOT_LIMITS: Record<keyof CalculatorSnapshot, [number, number]> = {
  headcount: [0, 100_000], turnoverRate: [0, 1_000], overtimeHoursPerYear: [0, 100_000_000],
  weeklyAgencyHours: [0, 10_000_000], agencyHourlyRate: [0, 10_000], pbjHoursPerMonth: [0, 100_000],
  softwareCost: [0, 1_000_000_000], totalPaycorInfluencedBenefit: [-1_000_000_000, 1_000_000_000],
  netAnnualBenefit: [-1_000_000_000, 1_000_000_000], roiPercent: [-100_000, 100_000], paybackMonths: [0, 100_000],
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const eventType = typeof body.eventType === 'string' ? body.eventType as ActivityEventType : null;
    const ccn = typeof body.ccn === 'string' ? body.ccn.trim() : '';
    if (!eventType || !EVENT_TYPES.has(eventType)) {
      return NextResponse.json({ error: 'Unsupported activity event.' }, { status: 400 });
    }
    if (!/^\d{6}$/.test(ccn)) {
      return NextResponse.json({ error: 'A valid six-digit CCN is required.' }, { status: 400 });
    }

    const missingFields = Array.isArray(body.missingFields)
      ? body.missingFields.filter((value): value is string =>
          typeof value === 'string' && CRITICAL_INPUT_FIELDS.includes(value as never),
        )
      : undefined;
    const isComplete = typeof body.isComplete === 'boolean' ? body.isComplete : undefined;
    if (missingFields && isComplete !== undefined && isComplete !== (missingFields.length === 0)) {
      return NextResponse.json({ error: 'Completion state does not match the missing fields.' }, { status: 400 });
    }

    const currentStep = Number.isInteger(body.currentStep) && Number(body.currentStep) >= 1 && Number(body.currentStep) <= 3
      ? Number(body.currentStep)
      : undefined;
    const calculatorSnapshot = sanitizeSnapshot(body.calculatorSnapshot);
    const sessionId = request.cookies.get(SESSION_COOKIE)?.value || crypto.randomUUID();

    await recordFacilityActivity({
      eventType, sessionId, ccn, currentStep, isComplete, missingFields, calculatorSnapshot,
    });

    const response = NextResponse.json({ recorded: true });
    if (!request.cookies.get(SESSION_COOKIE)?.value) {
      response.cookies.set(SESSION_COOKIE, sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
      });
    }
    return response;
  } catch (error) {
    console.error('Activity tracking failed', error);
    return NextResponse.json({ error: 'Activity could not be recorded.' }, { status: 503 });
  }
}

function sanitizeSnapshot(value: unknown): CalculatorSnapshot | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const input = value as Record<string, unknown>;
  const output: CalculatorSnapshot = {};
  for (const [key, [min, max]] of Object.entries(SNAPSHOT_LIMITS) as Array<[keyof CalculatorSnapshot, [number, number]]>) {
    if (input[key] === null && (key === 'roiPercent' || key === 'paybackMonths')) {
      output[key] = null as never;
      continue;
    }
    const number = Number(input[key]);
    if (Number.isFinite(number) && number >= min && number <= max) output[key] = number as never;
  }
  return Object.keys(output).length > 0 ? output : undefined;
}
