import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const state = searchParams.get('state');
    const search = searchParams.get('search');
    
    // CMS Dataset UUID for Nursing Home Provider Information (4pq5-n9py)
    const cmsApiUrl = 'https://data.cms.gov/provider-data/api/1/datastore/query/4pq5-n9py/0';
    
    // Build query conditions
    const conditions: any[] = [];
    
    if (state && state !== 'All') {
      conditions.push({
        property: 'state',
        value: state.toUpperCase(),
        operator: '='
      });
    }
    
    if (search && search.trim() !== '') {
      const cleanSearch = search.trim();
      // If it looks like a 6-digit numeric CCN, filter directly by CCN
      if (/^\d{6}$/.test(cleanSearch)) {
        conditions.push({
          property: 'cms_certification_number_ccn',
          value: cleanSearch,
          operator: '='
        });
      } else {
        conditions.push({
          property: 'provider_name',
          value: `%${cleanSearch}%`,
          operator: 'LIKE'
        });
      }
    }
    
    // Determine dynamic limit:
    // If no specific state or search is filtered, we fetch a fast default set of 200 records.
    // If filtered, we can fetch up to 1500 records which is guaranteed to fit within budget and return complete results.
    const hasFilters = conditions.length > 0;
    const limit = hasFilters ? 1500 : 200;
    
    const requestBody: any = {
      limit: limit
    };
    
    if (conditions.length > 0) {
      requestBody.conditions = conditions;
    }
    
    const response = await fetch(cmsApiUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody),
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`CMS API responded with status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.results || !Array.isArray(data.results)) {
      throw new Error('Invalid data structure returned from CMS API');
    }

    // Map the raw CMS columns to our clean TypeScript interface
    const mappedProviders = data.results.map((p: any) => ({
      ccn: p.cms_certification_number_ccn || '',
      facilityName: p.provider_name || 'Unknown Facility',
      address: p.provider_address || '',
      city: p.citytown || '',
      state: p.state || '',
      zip: p.zip_code || '',
      beds: parseInt(p.number_of_certified_beds) || 0,
      residents: parseFloat(p.average_number_of_residents_per_day) || 0,
      overallRating: parseInt(p.overall_rating) || 3, // Industry average baseline
      staffingRating: parseInt(p.staffing_rating) || 3, // Industry average baseline
      
      // All-In Strategy: Deep CMS Metrics
      turnoverRate: parseFloat(p.total_nursing_staff_turnover) || 52.0, // National median baseline
      rnTurnover: parseFloat(p.registered_nurse_turnover) || 45.0, // Critical expensive churn
      adminTurnover: p.administrator_turnover || 'N', // Leadership instability flag
      reportedRnStaffing: parseFloat(p.reported_rn_staffing_hours_per_resident_per_day) || 0.5,
      reportedCnaStaffing: parseFloat(p.reported_cna_staffing_hours_per_resident_per_day) || 2.0,
      totalFines: parseFloat(p.total_amount_of_fines_in_dollars) || 0,
      healthDeficiencies: parseInt(p.rating_cycle_1_total_number_of_health_deficiencies) || 0,
      
      chainName: p.chain_name || (p.legal_business_name !== p.provider_name ? p.legal_business_name : undefined),
      chainFacilities: parseInt(p.number_of_facilities_in_chain) || undefined,
    }));

    return NextResponse.json({ providers: mappedProviders });

  } catch (error: any) {
    console.error('Failed to fetch CMS Provider Data:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error while fetching CMS data' },
      { status: 500 }
    );
  }
}
