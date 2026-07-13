import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CMS_DATASET_ID = '4pq5-n9py';
const CMS_DATASET_NAME = 'Nursing Home General Information';
const CMS_RESOURCE_INDEX = '0';
const CMS_API_URL = `https://data.cms.gov/provider-data/api/1/datastore/query/${CMS_DATASET_ID}/${CMS_RESOURCE_INDEX}`;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;
const CMS_REQUEST_TIMEOUT_MS = 15_000;

type RawCmsRecord = Record<string, unknown>;

type CmsProvider = {
  ccn: string;
  facilityName: string;
  legalBusinessName: string | null;
  address: string;
  city: string;
  state: string;
  zip: string;
  beds: number | null;
  residents: number | null;
  overallRating: number | null;
  staffingRating: number | null;
  healthInspectionRating: number | null;
  qualityMeasureRating: number | null;
  longStayQualityMeasureRating: number | null;
  shortStayQualityMeasureRating: number | null;
  turnoverRate: number | null;
  rnTurnover: number | null;
  administratorDepartures: number | null;
  adminTurnover: string | null;
  reportedRnStaffing: number | null;
  reportedNurseAideStaffing: number | null;
  reportedTotalNurseStaffing: number | null;
  totalFines: number | null;
  healthDeficiencies: number | null;
  chainName: string | null;
  chainFacilities: number | null;
  reportedFields: string[];
  missingFields: string[];
};

const FIELD_ALIASES = {
  ccn: ['cms_certification_number_ccn', 'federal_provider_number'],
  facilityName: ['provider_name'],
  legalBusinessName: ['legal_business_name'],
  address: ['provider_address'],
  city: ['citytown', 'city_town'],
  state: ['state'],
  zip: ['zip_code'],
  beds: ['number_of_certified_beds'],
  residents: ['average_number_of_residents_per_day'],
  overallRating: ['overall_rating'],
  staffingRating: ['staffing_rating'],
  healthInspectionRating: ['health_inspection_rating'],
  qualityMeasureRating: ['qm_rating', 'quality_measure_rating'],
  longStayQualityMeasureRating: ['long_stay_qm_rating'],
  shortStayQualityMeasureRating: ['short_stay_qm_rating'],
  turnoverRate: ['total_nursing_staff_turnover'],
  rnTurnover: ['registered_nurse_turnover'],
  administratorDepartures: [
    'number_of_administrators_who_have_left_the_nursing_home',
    'administrator_turnover',
  ],
  reportedRnStaffing: ['reported_rn_staffing_hours_per_resident_per_day'],
  reportedNurseAideStaffing: [
    'reported_nurse_aide_staffing_hours_per_resident_per_day',
    'reported_cna_staffing_hours_per_resident_per_day',
  ],
  reportedTotalNurseStaffing: ['reported_total_nurse_staffing_hours_per_resident_per_day'],
  totalFines: ['total_amount_of_fines_in_dollars'],
  healthDeficiencies: [
    'rating_cycle_1_total_number_of_health_deficiencies',
    'total_number_of_health_deficiencies',
  ],
  chainName: ['chain_name'],
  chainFacilities: ['number_of_facilities_in_chain'],
} as const;

function getFirstValue(record: RawCmsRecord, aliases: readonly string[]): unknown {
  for (const alias of aliases) {
    const value = record[alias];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return null;
}

function parseNullableNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const normalized = typeof value === 'string' ? value.replace(/[$,%\s,]/g, '') : value;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseNullableInteger(value: unknown): number | null {
  const parsed = parseNullableNumber(value);
  return parsed === null ? null : Math.trunc(parsed);
}

function parseNullableString(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const parsed = String(value).trim();
  return parsed.length > 0 ? parsed : null;
}

function normalizeAdministratorTurnover(value: unknown): {
  departures: number | null;
  label: string | null;
} {
  const numeric = parseNullableNumber(value);
  if (numeric !== null) {
    return {
      departures: numeric,
      label: numeric > 0 ? 'Yes' : 'No',
    };
  }

  const text = parseNullableString(value);
  if (!text) return { departures: null, label: null };
  const normalized = text.toUpperCase();
  if (['Y', 'YES', 'TRUE'].includes(normalized)) return { departures: null, label: 'Yes' };
  if (['N', 'NO', 'FALSE'].includes(normalized)) return { departures: null, label: 'No' };
  return { departures: null, label: text };
}

function mapProvider(record: RawCmsRecord): CmsProvider {
  const values = {
    ccn: parseNullableString(getFirstValue(record, FIELD_ALIASES.ccn)) || '',
    facilityName:
      parseNullableString(getFirstValue(record, FIELD_ALIASES.facilityName)) ||
      'Unknown Facility',
    legalBusinessName: parseNullableString(
      getFirstValue(record, FIELD_ALIASES.legalBusinessName),
    ),
    address: parseNullableString(getFirstValue(record, FIELD_ALIASES.address)) || '',
    city: parseNullableString(getFirstValue(record, FIELD_ALIASES.city)) || '',
    state: parseNullableString(getFirstValue(record, FIELD_ALIASES.state)) || '',
    zip: parseNullableString(getFirstValue(record, FIELD_ALIASES.zip)) || '',
    beds: parseNullableInteger(getFirstValue(record, FIELD_ALIASES.beds)),
    residents: parseNullableNumber(getFirstValue(record, FIELD_ALIASES.residents)),
    overallRating: parseNullableNumber(
      getFirstValue(record, FIELD_ALIASES.overallRating),
    ),
    staffingRating: parseNullableNumber(
      getFirstValue(record, FIELD_ALIASES.staffingRating),
    ),
    healthInspectionRating: parseNullableNumber(
      getFirstValue(record, FIELD_ALIASES.healthInspectionRating),
    ),
    qualityMeasureRating: parseNullableNumber(
      getFirstValue(record, FIELD_ALIASES.qualityMeasureRating),
    ),
    longStayQualityMeasureRating: parseNullableNumber(
      getFirstValue(record, FIELD_ALIASES.longStayQualityMeasureRating),
    ),
    shortStayQualityMeasureRating: parseNullableNumber(
      getFirstValue(record, FIELD_ALIASES.shortStayQualityMeasureRating),
    ),
    turnoverRate: parseNullableNumber(
      getFirstValue(record, FIELD_ALIASES.turnoverRate),
    ),
    rnTurnover: parseNullableNumber(getFirstValue(record, FIELD_ALIASES.rnTurnover)),
    reportedRnStaffing: parseNullableNumber(
      getFirstValue(record, FIELD_ALIASES.reportedRnStaffing),
    ),
    reportedNurseAideStaffing: parseNullableNumber(
      getFirstValue(record, FIELD_ALIASES.reportedNurseAideStaffing),
    ),
    reportedTotalNurseStaffing: parseNullableNumber(
      getFirstValue(record, FIELD_ALIASES.reportedTotalNurseStaffing),
    ),
    totalFines: parseNullableNumber(getFirstValue(record, FIELD_ALIASES.totalFines)),
    healthDeficiencies: parseNullableInteger(
      getFirstValue(record, FIELD_ALIASES.healthDeficiencies),
    ),
    chainName: parseNullableString(getFirstValue(record, FIELD_ALIASES.chainName)),
    chainFacilities: parseNullableInteger(
      getFirstValue(record, FIELD_ALIASES.chainFacilities),
    ),
  };

  const administrator = normalizeAdministratorTurnover(
    getFirstValue(record, FIELD_ALIASES.administratorDepartures),
  );

  const trackableFields: Array<[string, unknown]> = [
    ['beds', values.beds],
    ['residents', values.residents],
    ['overallRating', values.overallRating],
    ['staffingRating', values.staffingRating],
    ['healthInspectionRating', values.healthInspectionRating],
    ['qualityMeasureRating', values.qualityMeasureRating],
    ['turnoverRate', values.turnoverRate],
    ['rnTurnover', values.rnTurnover],
    ['administratorDepartures', administrator.departures ?? administrator.label],
    ['reportedRnStaffing', values.reportedRnStaffing],
    ['reportedNurseAideStaffing', values.reportedNurseAideStaffing],
    ['reportedTotalNurseStaffing', values.reportedTotalNurseStaffing],
    ['totalFines', values.totalFines],
    ['healthDeficiencies', values.healthDeficiencies],
    ['chainName', values.chainName],
    ['chainFacilities', values.chainFacilities],
  ];

  return {
    ...values,
    administratorDepartures: administrator.departures,
    adminTurnover: administrator.label,
    reportedFields: trackableFields
      .filter(([, value]) => value !== null && value !== undefined && value !== '')
      .map(([field]) => field),
    missingFields: trackableFields
      .filter(([, value]) => value === null || value === undefined || value === '')
      .map(([field]) => field),
  };
}

function parsePositiveInteger(
  value: string | null,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const parsed = Number.parseInt(value || '', 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const stateParam = (searchParams.get('state') || '').trim().toUpperCase();
  const searchParam = (searchParams.get('search') || '').trim().slice(0, 100);
  const chainParam = (searchParams.get('chain') || '').trim().slice(0, 100);
  const page = parsePositiveInteger(searchParams.get('page'), 1, 1, 10_000);
  const pageSize = parsePositiveInteger(
    searchParams.get('pageSize'),
    DEFAULT_PAGE_SIZE,
    1,
    MAX_PAGE_SIZE,
  );
  const includeSchema = searchParams.get('debug') === '1';

  if (stateParam && stateParam !== 'ALL' && !/^[A-Z]{2}$/.test(stateParam)) {
    return NextResponse.json({ error: 'State must be a two-letter abbreviation.' }, { status: 400 });
  }

  const conditions: Array<{
    property: string;
    value: string;
    operator: '=' | 'LIKE';
  }> = [];

  if (stateParam && stateParam !== 'ALL') {
    conditions.push({ property: 'state', value: stateParam, operator: '=' });
  }

  if (searchParam) {
    if (/^\d{6}$/.test(searchParam)) {
      conditions.push({
        property: 'cms_certification_number_ccn',
        value: searchParam,
        operator: '=',
      });
    } else {
      conditions.push({
        property: 'provider_name',
        value: `%${searchParam}%`,
        operator: 'LIKE',
      });
    }
  }

  if (chainParam) {
    conditions.push({
      property: 'chain_name',
      value: `%${chainParam}%`,
      operator: 'LIKE',
    });
  }

  const offset = (page - 1) * pageSize;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CMS_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(CMS_API_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        limit: pageSize + 1,
        offset,
        ...(conditions.length > 0 ? { conditions } : {}),
      }),
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!response.ok) {
      const responseText = await response.text().catch(() => '');
      console.error('CMS Provider Data API error', {
        status: response.status,
        responseText: responseText.slice(0, 500),
      });
      return NextResponse.json(
        { error: `CMS provider data is temporarily unavailable (${response.status}).` },
        { status: 502 },
      );
    }

    const data = (await response.json()) as { results?: RawCmsRecord[] };
    if (!Array.isArray(data.results)) {
      console.error('Unexpected CMS Provider Data API response', data);
      return NextResponse.json(
        { error: 'CMS returned an unexpected provider-data response.' },
        { status: 502 },
      );
    }

    const hasMore = data.results.length > pageSize;
    const pageRecords = data.results.slice(0, pageSize);
    const providers = pageRecords.map(mapProvider);
    const sourceColumns = pageRecords[0] ? Object.keys(pageRecords[0]).sort() : [];
    const recognizedSourceColumns: string[] = Array.from(
      new Set(
        Object.values(FIELD_ALIASES)
          .flat()
          .filter((field) => sourceColumns.includes(field)),
      ),
    ).sort();

    return NextResponse.json({
      providers,
      pagination: {
        page,
        pageSize,
        hasMore,
        returned: providers.length,
      },
      source: {
        system: 'CMS Provider Data API',
        datasetId: CMS_DATASET_ID,
        datasetName: CMS_DATASET_NAME,
        resourceIndex: CMS_RESOURCE_INDEX,
        retrievedAt: new Date().toISOString(),
        valuesAreCmsReportedUnlessMarkedMissing: true,
        doesNotProvideEmployeeHeadcountOrFacilityRevenue: true,
      },
      ...(includeSchema
        ? {
            schemaDiagnostics: {
              sourceColumns,
              recognizedSourceColumns,
              unrecognizedSourceColumns: sourceColumns.filter(
                (field) => !recognizedSourceColumns.includes(field),
              ),
            },
          }
        : {}),
    });
  } catch (error: unknown) {
    const isAbort = error instanceof Error && error.name === 'AbortError';
    console.error('Failed to retrieve CMS provider data', error);
    return NextResponse.json(
      {
        error: isAbort
          ? 'The CMS provider-data request timed out. Please try again.'
          : 'CMS provider data could not be retrieved.',
      },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
