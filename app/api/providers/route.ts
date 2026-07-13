import { NextRequest, NextResponse } from 'next/server';

interface CmsProviderRecord {
  cms_certification_number_ccn?: string;
  provider_name?: string;
  legal_business_name?: string;
  provider_address?: string;
  citytown?: string;
  state?: string;
  zip_code?: string;
  number_of_certified_beds?: string;
  average_number_of_residents_per_day?: string;
  overall_rating?: string;
  staffing_rating?: string;
  health_inspection_rating?: string;
  qm_rating?: string;
  long_stay_qm_rating?: string;
  short_stay_qm_rating?: string;
  total_nursing_staff_turnover?: string;
  registered_nurse_turnover?: string;
  number_of_administrators_who_have_left_the_nursing_home?: string;
  reported_rn_staffing_hours_per_resident_per_day?: string;
  reported_nurse_aide_staffing_hours_per_resident_per_day?: string;
  reported_total_nurse_staffing_hours_per_resident_per_day?: string;
  total_amount_of_fines_in_dollars?: string;
  rating_cycle_1_total_number_of_health_deficiencies?: string;
  chain_name?: string;
  number_of_facilities_in_chain?: string;
}

function parseNumber(value: string | undefined | null): number | null {
  if (value === undefined || value === null) return null;
  const cleaned = value.replace(/[\$,]/g, '').trim();
  if (cleaned === '') return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get('pageSize') || '50', 10)),
    );
    const search = (searchParams.get('search') || '').trim();
    const chain = (searchParams.get('chain') || '').trim();
    const state = (searchParams.get('state') || 'All').trim();

    const limit = pageSize + 1;
    const offset = (page - 1) * pageSize;

    let select = [
      'cms_certification_number_ccn',
      'provider_name',
      'legal_business_name',
      'provider_address',
      'citytown',
      'state',
      'zip_code',
      'number_of_certified_beds',
      'average_number_of_residents_per_day',
      'overall_rating',
      'staffing_rating',
      'health_inspection_rating',
      'qm_rating',
      'long_stay_qm_rating',
      'short_stay_qm_rating',
      'total_nursing_staff_turnover',
      'registered_nurse_turnover',
      'number_of_administrators_who_have_left_the_nursing_home',
      'reported_rn_staffing_hours_per_resident_per_day',
      'reported_nurse_aide_staffing_hours_per_resident_per_day',
      'reported_total_nurse_staffing_hours_per_resident_per_day',
      'total_amount_of_fines_in_dollars',
      'rating_cycle_1_total_number_of_health_deficiencies',
      'chain_name',
      'number_of_facilities_in_chain',
    ].join(',');

    let where = 'cms_certification_number_ccn IS NOT NULL';

    if (state !== 'All') {
      where += ` AND state = '${state.replace(/'/g, "''")}'`;
    }

    if (search) {
      if (/^\d{6}$/.test(search)) {
        where += ` AND cms_certification_number_ccn = '${search}'`;
      } else {
        const sanitized = search.replace(/'/g, "''").toUpperCase();
        where += ` AND (upper(provider_name) LIKE '%${sanitized}%' OR upper(citytown) LIKE '%${sanitized}%')`;
      }
    }

    if (chain) {
      const sanitizedChain = chain.replace(/'/g, "''").toUpperCase();
      where += ` AND upper(chain_name) LIKE '%${sanitizedChain}%'`;
    }

    const socrataUrl = `https://data.cms.gov/resource/4pq5-n9py.json?$select=${select}&$where=${encodeURIComponent(
      where,
    )}&$limit=${limit}&$offset=${offset}&$order=provider_name ASC`;

    const headers: HeadersInit = {};
    if (process.env.CMS_SOCRATA_APP_TOKEN) {
      headers['X-App-Token'] = process.env.CMS_SOCRATA_APP_TOKEN;
    }

    const response = await fetch(socrataUrl, {
      headers,
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('CMS Socrata API request failed:', {
        status: response.status,
        text,
        url: socrataUrl,
      });
      throw new Error(`CMS API responded with status ${response.status}`);
    }

    const rawRecords = (await response.json()) as CmsProviderRecord[];
    const hasMore = rawRecords.length > pageSize;
    const paginatedRecords = hasMore
      ? rawRecords.slice(0, pageSize)
      : rawRecords;

    const providers = paginatedRecords.map((record) => {
      const reportedFields: string[] = [];
      const missingFields: string[] = [];

      const trackingFields: Array<[keyof CmsProviderRecord, string]> = [
        ['overall_rating', 'overallRating'],
        ['staffing_rating', 'staffingRating'],
        ['health_inspection_rating', 'healthInspectionRating'],
        ['qm_rating', 'qualityMeasureRating'],
        ['total_nursing_staff_turnover', 'turnoverRate'],
        ['registered_nurse_turnover', 'rnTurnover'],
        ['number_of_certified_beds', 'beds'],
        ['average_number_of_residents_per_day', 'residents'],
        ['rating_cycle_1_total_number_of_health_deficiencies', 'healthDeficiencies'],
        ['reported_rn_staffing_hours_per_resident_per_day', 'reportedRnStaffing'],
        ['reported_total_nurse_staffing_hours_per_resident_per_day', 'reportedTotalNurseStaffing'],
      ];

      for (const [key, label] of trackingFields) {
        if (
          record[key] !== undefined &&
          record[key] !== null &&
          record[key] !== ''
        ) {
          reportedFields.push(label);
        } else {
          missingFields.push(label);
        }
      }

      const departures = parseNumber(
        record.number_of_administrators_who_have_left_the_nursing_home,
      );
      let adminTurnover: string | null = null;
      if (departures !== null) {
        adminTurnover = departures >= 1 ? 'yes' : 'no';
      }

      return {
        ccn: record.cms_certification_number_ccn || 'Missing',
        facilityName: record.provider_name || 'Unnamed Facility',
        legalBusinessName: record.legal_business_name || null,
        address: record.provider_address || 'Address Not Reported',
        city: record.citytown || 'City Not Reported',
        state: record.state || 'State Not Reported',
        zip: record.zip_code || 'Zip Not Reported',
        beds: parseNumber(record.number_of_certified_beds),
        residents: parseNumber(record.average_number_of_residents_per_day),
        overallRating: parseNumber(record.overall_rating),
        staffingRating: parseNumber(record.staffing_rating),
        healthInspectionRating: parseNumber(record.health_inspection_rating),
        qualityMeasureRating: parseNumber(record.qm_rating),
        longStayQualityMeasureRating: parseNumber(record.long_stay_qm_rating),
        shortStayQualityMeasureRating: parseNumber(record.short_stay_qm_rating),
        turnoverRate: parseNumber(record.total_nursing_staff_turnover),
        rnTurnover: parseNumber(record.registered_nurse_turnover),
        administratorDepartures: departures,
        adminTurnover,
        reportedRnStaffing: parseNumber(
          record.reported_rn_staffing_hours_per_resident_per_day,
        ),
        reportedNurseAideStaffing: parseNumber(
          record.reported_nurse_aide_staffing_hours_per_resident_per_day,
        ),
        reportedTotalNurseStaffing: parseNumber(
          record.reported_total_nurse_staffing_hours_per_resident_per_day,
        ),
        totalFines: parseNumber(record.total_amount_of_fines_in_dollars),
        healthDeficiencies: parseNumber(
          record.rating_cycle_1_total_number_of_health_deficiencies,
        ),
        chainName: record.chain_name || null,
        chainFacilities: parseNumber(record.number_of_facilities_in_chain),
        reportedFields,
        missingFields,
      };
    });

    return NextResponse.json({
      providers,
      pagination: {
        page,
        pageSize,
        hasMore,
        returned: providers.length,
      },
      source: {
        system: 'Socrata API',
        datasetId: '4pq5-n9py',
        datasetName: 'Nursing Home Five-Star Quality Rating System — Provider Information',
        resourceIndex: 'https://data.cms.gov/resource/4pq5-n9py',
        retrievedAt: new Date().toISOString(),
        valuesAreCmsReportedUnlessMarkedMissing: true,
        doesNotProvideEmployeeHeadcountOrFacilityRevenue: true,
      },
    });
  } catch (error: any) {
    console.error('CMS Provider search failed:', error);
    return NextResponse.json(
      {
        error:
          'The CMS Provider Directory is currently offline or unreachable. Please try again or enter metrics manually.',
        code: 'CMS_API_UNREACHABLE',
      },
      { status: 503 },
    );
  }
}
