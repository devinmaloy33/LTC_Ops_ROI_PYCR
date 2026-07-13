const CMS_DATASET_ID = '4pq5-n9py';
const CMS_RESOURCE_INDEX = '0';
const CMS_API_URL = `https://data.cms.gov/provider-data/api/1/datastore/query/${CMS_DATASET_ID}/${CMS_RESOURCE_INDEX}`;

type RawCmsRecord = Record<string, unknown>;

export type CmsFacilitySnapshot = {
  ccn: string;
  facilityName: string;
  legalBusinessName: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  chainName: string | null;
  chainFacilities: number | null;
  beds: number | null;
  residents: number | null;
  overallRating: number | null;
  staffingRating: number | null;
  healthInspectionRating: number | null;
  qualityMeasureRating: number | null;
  turnoverRate: number | null;
  rnTurnover: number | null;
  totalFines: number | null;
  healthDeficiencies: number | null;
  retrievedAt: number;
};

const aliases = {
  ccn: ['cms_certification_number_ccn', 'federal_provider_number'],
  facilityName: ['provider_name'],
  legalBusinessName: ['legal_business_name'],
  address: ['provider_address'],
  city: ['citytown', 'city_town'],
  state: ['state'],
  zip: ['zip_code'],
  chainName: ['chain_name'],
  chainFacilities: ['number_of_facilities_in_chain'],
  beds: ['number_of_certified_beds'],
  residents: ['average_number_of_residents_per_day'],
  overallRating: ['overall_rating'],
  staffingRating: ['staffing_rating'],
  healthInspectionRating: ['health_inspection_rating'],
  qualityMeasureRating: ['qm_rating', 'quality_measure_rating'],
  turnoverRate: ['total_nursing_staff_turnover'],
  rnTurnover: ['registered_nurse_turnover'],
  totalFines: ['total_amount_of_fines_in_dollars'],
  healthDeficiencies: ['rating_cycle_1_total_number_of_health_deficiencies', 'total_number_of_health_deficiencies'],
} as const;

function first(record: RawCmsRecord, names: readonly string[]) {
  for (const name of names) {
    const value = record[name];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return null;
}

function stringValue(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized || null;
}

function numberValue(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const normalized = typeof value === 'string' ? value.replace(/[$,%\s,]/g, '') : value;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapRecord(record: RawCmsRecord): CmsFacilitySnapshot {
  return {
    ccn: stringValue(first(record, aliases.ccn)) || '',
    facilityName: stringValue(first(record, aliases.facilityName)) || 'Unknown Facility',
    legalBusinessName: stringValue(first(record, aliases.legalBusinessName)),
    address: stringValue(first(record, aliases.address)),
    city: stringValue(first(record, aliases.city)),
    state: stringValue(first(record, aliases.state)),
    zip: stringValue(first(record, aliases.zip)),
    chainName: stringValue(first(record, aliases.chainName)),
    chainFacilities: numberValue(first(record, aliases.chainFacilities)),
    beds: numberValue(first(record, aliases.beds)),
    residents: numberValue(first(record, aliases.residents)),
    overallRating: numberValue(first(record, aliases.overallRating)),
    staffingRating: numberValue(first(record, aliases.staffingRating)),
    healthInspectionRating: numberValue(first(record, aliases.healthInspectionRating)),
    qualityMeasureRating: numberValue(first(record, aliases.qualityMeasureRating)),
    turnoverRate: numberValue(first(record, aliases.turnoverRate)),
    rnTurnover: numberValue(first(record, aliases.rnTurnover)),
    totalFines: numberValue(first(record, aliases.totalFines)),
    healthDeficiencies: numberValue(first(record, aliases.healthDeficiencies)),
    retrievedAt: Date.now(),
  };
}

export async function fetchCmsFacilityByCcn(ccn: string): Promise<CmsFacilitySnapshot | null> {
  if (!/^\d{6}$/.test(ccn)) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(CMS_API_URL, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        limit: 1,
        conditions: [{ property: 'cms_certification_number_ccn', value: ccn, operator: '=' }],
      }),
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`CMS provider lookup failed (${response.status}).`);
    const data = (await response.json()) as { results?: RawCmsRecord[] };
    const record = Array.isArray(data.results) ? data.results[0] : null;
    return record ? mapRecord(record) : null;
  } finally {
    clearTimeout(timeout);
  }
}
