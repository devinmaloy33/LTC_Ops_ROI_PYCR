'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Database,
  Loader2,
  MapPin,
  Search,
} from 'lucide-react';
import { FacilityInputSources, InputSourceRecord } from '@/lib/roi-types';

type NullableNumber = number | null;
type RatingType = 'overall' | 'staffing' | 'healthInspection' | 'qualityMeasure';

interface Provider {
  ccn: string;
  facilityName: string;
  legalBusinessName: string | null;
  address: string;
  city: string;
  state: string;
  zip: string;
  beds: NullableNumber;
  residents: NullableNumber;
  overallRating: NullableNumber;
  staffingRating: NullableNumber;
  healthInspectionRating: NullableNumber;
  qualityMeasureRating: NullableNumber;
  longStayQualityMeasureRating: NullableNumber;
  shortStayQualityMeasureRating: NullableNumber;
  turnoverRate: NullableNumber;
  rnTurnover: NullableNumber;
  administratorDepartures: NullableNumber;
  adminTurnover: string | null;
  reportedRnStaffing: NullableNumber;
  reportedNurseAideStaffing: NullableNumber;
  reportedTotalNurseStaffing: NullableNumber;
  totalFines: NullableNumber;
  healthDeficiencies: NullableNumber;
  chainName: string | null;
  chainFacilities: NullableNumber;
  reportedFields: string[];
  missingFields: string[];
}

interface ProviderResponse {
  providers: Provider[];
  pagination: {
    page: number;
    pageSize: number;
    hasMore: boolean;
    returned: number;
  };
  source: {
    system: string;
    datasetId: string;
    datasetName: string;
    resourceIndex: string;
    retrievedAt: string;
    valuesAreCmsReportedUnlessMarkedMissing: boolean;
    doesNotProvideEmployeeHeadcountOrFacilityRevenue: boolean;
  };
  error?: string;
}

interface CmsMetricPayload {
  facilityName?: string;
  facilityAddress?: string;
  city?: string;
  zip?: string;
  ccn?: string;
  state?: string;
  chainName?: string;
  chainFacilities?: number;
  certifiedBeds?: number;
  averageResidentsPerDay?: number;
  reportedRnStaffingHprd?: number;
  reportedNurseAideStaffingHprd?: number;
  reportedTotalNurseStaffingHprd?: number;
  turnoverRate?: number;
  rnTurnover?: number;
  adminTurnover?: string;
  overallRating?: number;
  staffingRating?: number;
  healthInspectionRating?: number;
  qualityMeasureRating?: number;
  projectedOverallRating?: number;
  totalFines?: number;
  healthDeficiencies?: number;
  inputSources?: FacilityInputSources;
}

interface SheetsSyncProps {
  onApplyMetrics: (metrics: CmsMetricPayload) => void;
  currentValues: {
    facilityName: string;
    headcount: number;
    hourlyRate: number;
    turnoverRate: number;
    pbjHours: number;
    overtimeHours: number;
    annualMedicareBilling: number;
  };
}

const PAGE_SIZE = 50;
const DATASET_ID = '4pq5-n9py';

const RATING_TYPES: Array<{ value: RatingType; label: string }> = [
  { value: 'overall', label: 'Overall Rating' },
  { value: 'staffing', label: 'Staffing Rating' },
  { value: 'healthInspection', label: 'Health Inspection Rating' },
  { value: 'qualityMeasure', label: 'Quality Measure Rating' },
];

const STAR_RATINGS = [1, 2, 3, 4, 5];

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA', 'HI',
  'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN',
  'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH',
  'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA',
  'WV', 'WI', 'WY',
];

const displayNumber = (
  value: number | null,
  options?: { suffix?: string; digits?: number; currency?: boolean },
) => {
  if (value === null || !Number.isFinite(value)) return 'Not reported';
  if (options?.currency) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  }
  return `${value.toLocaleString('en-US', {
    maximumFractionDigits: options?.digits ?? 1,
  })}${options?.suffix || ''}`;
};

export default function SheetsSync({ onApplyMetrics }: SheetsSyncProps) {
  const [state, setState] = useState('All');
  const [search, setSearch] = useState('');
  const [chainSearch, setChainSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [debouncedChainSearch, setDebouncedChainSearch] = useState('');
  const [ratingType, setRatingType] = useState<RatingType>('overall');
  const [rating, setRating] = useState('');
  const [page, setPage] = useState(1);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedCcn, setSelectedCcn] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [applied, setApplied] = useState(false);
  const [pagination, setPagination] = useState<ProviderResponse['pagination']>({
    page: 1,
    pageSize: PAGE_SIZE,
    hasMore: false,
    returned: 0,
  });
  const [source, setSource] = useState<ProviderResponse['source'] | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedChainSearch(chainSearch.trim());
      setPage(1);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [chainSearch]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadProviders() {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(PAGE_SIZE),
        });
        if (state !== 'All') params.set('state', state);
        if (debouncedSearch) params.set('search', debouncedSearch);
        if (debouncedChainSearch) params.set('chain', debouncedChainSearch);
        if (rating) {
          params.set('ratingType', ratingType);
          params.set('rating', rating);
        }

        const response = await fetch(`/api/providers?${params.toString()}`, {
          signal: controller.signal,
        });
        const data = (await response.json()) as ProviderResponse;
        if (!response.ok || data.error) {
          throw new Error(data.error || 'CMS provider records could not be retrieved.');
        }

        if (active) {
          setProviders(Array.isArray(data.providers) ? data.providers : []);
          setPagination(data.pagination);
          setSource(data.source);
          setSelectedCcn('');
        }
      } catch (loadError: unknown) {
        if (
          active &&
          !(loadError instanceof Error && loadError.name === 'AbortError')
        ) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Unable to load CMS provider records.',
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProviders();
    return () => {
      active = false;
      controller.abort();
    };
  }, [state, debouncedSearch, debouncedChainSearch, ratingType, rating, page]);

  const selectedProvider = useMemo(
    () => providers.find((provider) => provider.ccn === selectedCcn),
    [providers, selectedCcn],
  );

  const applyProvider = () => {
    if (!selectedProvider || !source) return;

    const retrievedAt = source.retrievedAt;
    const cmsSource = (
      sourceField: string,
      note?: string,
    ): InputSourceRecord => ({
      source: 'cms',
      label: `${source.datasetName} — CMS Provider Data API`,
      datasetId: source.datasetId,
      sourceField,
      retrievedAt,
      note,
    });

    const inputSources: FacilityInputSources = {
      facilityName: cmsSource('provider_name'),
      facilityAddress: cmsSource('provider_address'),
      city: cmsSource('citytown'),
      state: cmsSource('state'),
      zip: cmsSource('zip_code'),
      ccn: cmsSource('cms_certification_number_ccn'),
    };

    const payload: CmsMetricPayload = {
      ccn: selectedProvider.ccn,
      state: selectedProvider.state,
      facilityName: selectedProvider.facilityName,
      facilityAddress: selectedProvider.address,
      city: selectedProvider.city,
      zip: selectedProvider.zip,
      chainName: selectedProvider.chainName || '',
      chainFacilities: selectedProvider.chainFacilities || 0,
      inputSources,
    };

    if (selectedProvider.chainName) {
      inputSources.chainName = cmsSource('chain_name');
    }
    if (selectedProvider.chainFacilities !== null) {
      inputSources.chainFacilities = cmsSource('number_of_facilities_in_chain');
    }
    if (selectedProvider.beds !== null) {
      payload.certifiedBeds = selectedProvider.beds;
      inputSources.certifiedBeds = cmsSource('number_of_certified_beds');
    }
    if (selectedProvider.residents !== null) {
      payload.averageResidentsPerDay = selectedProvider.residents;
      inputSources.averageResidentsPerDay = cmsSource('average_number_of_residents_per_day');
    }
    if (selectedProvider.reportedRnStaffing !== null) {
      payload.reportedRnStaffingHprd = selectedProvider.reportedRnStaffing;
      inputSources.reportedRnStaffingHprd = cmsSource('reported_rn_staffing_hours_per_resident_per_day');
    }
    if (selectedProvider.reportedNurseAideStaffing !== null) {
      payload.reportedNurseAideStaffingHprd = selectedProvider.reportedNurseAideStaffing;
      inputSources.reportedNurseAideStaffingHprd = cmsSource('reported_nurse_aide_staffing_hours_per_resident_per_day');
    }
    if (selectedProvider.reportedTotalNurseStaffing !== null) {
      payload.reportedTotalNurseStaffingHprd = selectedProvider.reportedTotalNurseStaffing;
      inputSources.reportedTotalNurseStaffingHprd = cmsSource('reported_total_nurse_staffing_hours_per_resident_per_day');
    }
    if (selectedProvider.turnoverRate !== null) {
      payload.turnoverRate = selectedProvider.turnoverRate;
      inputSources.turnoverRate = cmsSource('total_nursing_staff_turnover');
    }
    if (selectedProvider.rnTurnover !== null) {
      payload.rnTurnover = selectedProvider.rnTurnover;
      inputSources.rnTurnover = cmsSource('registered_nurse_turnover');
    }
    if (selectedProvider.adminTurnover) {
      payload.adminTurnover = selectedProvider.adminTurnover;
      inputSources.adminTurnover = cmsSource(
        'number_of_administrators_who_have_left_the_nursing_home',
      );
    }
    if (selectedProvider.overallRating !== null) {
      payload.overallRating = selectedProvider.overallRating;
      payload.projectedOverallRating = Math.min(5, selectedProvider.overallRating + 1);
      inputSources.overallRating = cmsSource('overall_rating');
      inputSources.projectedOverallRating = {
        source: 'consultant',
        label: 'Modeled target based on consultant review',
        note: 'Not a CMS forecast or guarantee.',
      };
    }
    if (selectedProvider.staffingRating !== null) {
      payload.staffingRating = selectedProvider.staffingRating;
      inputSources.staffingRating = cmsSource('staffing_rating');
    }
    if (selectedProvider.healthInspectionRating !== null) {
      payload.healthInspectionRating = selectedProvider.healthInspectionRating;
      inputSources.healthInspectionRating = cmsSource('health_inspection_rating');
    }
    if (selectedProvider.qualityMeasureRating !== null) {
      payload.qualityMeasureRating = selectedProvider.qualityMeasureRating;
      inputSources.qualityMeasureRating = cmsSource('qm_rating');
    }
    if (selectedProvider.totalFines !== null) {
      payload.totalFines = selectedProvider.totalFines;
      inputSources.totalFines = cmsSource('total_amount_of_fines_in_dollars');
    }
    if (selectedProvider.healthDeficiencies !== null) {
      payload.healthDeficiencies = selectedProvider.healthDeficiencies;
      inputSources.healthDeficiencies = cmsSource(
        'rating_cycle_1_total_number_of_health_deficiencies',
      );
    }

    onApplyMetrics(payload);
    setApplied(true);
    window.setTimeout(() => setApplied(false), 3500);
  };

  return (
    <section className="bg-white border border-paycor-border-grey rounded-2xl p-5 shadow-sm">
      <div className="flex items-start gap-3 border-b border-slate-100 pb-4 mb-4">
        <div className="rounded-xl bg-paycor-orange/10 p-2 text-paycor-orange">
          <Database className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-sm font-extrabold text-paycor-charcoal">
            CMS Nursing Home Provider Directory
          </h2>
          <p className="text-[10px] text-paycor-medium-grey mt-1 leading-relaxed">
            Applies only values reported by CMS. Employee headcount, wage rates, labor hours,
            software cost and Medicare Part A revenue remain prospect-entered discovery inputs.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}
      {applied && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-700">
          <Check className="w-4 h-4" /> CMS-reported fields applied. Prospect-entered financial
          and workforce fields were not overwritten.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[140px_1fr_1fr] gap-3">
        <label>
          <span className="block text-[10px] uppercase tracking-wider font-bold text-paycor-grey mb-1.5">
            State
          </span>
          <select
            value={state}
            onChange={(event: React.ChangeEvent<HTMLSelectElement>) => {
              setState(event.target.value);
              setPage(1);
              setSelectedCcn('');
            }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-paycor-orange"
          >
            <option value="All">All States</option>
            {US_STATES.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>

        <label>
          <span className="block text-[10px] uppercase tracking-wider font-bold text-paycor-grey mb-1.5">
            Search provider name or six-digit CCN
          </span>
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-paycor-grey" />
            <input
              type="text"
              value={search}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                setSearch(event.target.value);
                setSelectedCcn('');
              }}
              placeholder="Search CMS provider records"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-10 py-2.5 text-sm outline-none focus:border-paycor-orange"
            />
            {loading && (
              <Loader2 className="absolute right-3 top-3 w-4 h-4 animate-spin text-paycor-orange" />
            )}
          </div>
        </label>

        <label>
          <span className="block text-[10px] uppercase tracking-wider font-bold text-paycor-grey mb-1.5">
            Chain / operator name (optional)
          </span>
          <div className="relative">
            <Building2 className="absolute left-3 top-3 w-4 h-4 text-paycor-grey" />
            <input
              type="text"
              value={chainSearch}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                setChainSearch(event.target.value);
                setSelectedCcn('');
              }}
              placeholder="Find facilities in a reported chain"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2.5 text-sm outline-none focus:border-paycor-orange"
            />
          </div>
        </label>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label>
          <span className="block text-[10px] uppercase tracking-wider font-bold text-paycor-grey mb-1.5">
            Rating category
          </span>
          <select
            value={ratingType}
            onChange={(event: React.ChangeEvent<HTMLSelectElement>) => {
              setRatingType(event.target.value as RatingType);
              setPage(1);
              setSelectedCcn('');
            }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-paycor-orange"
          >
            {RATING_TYPES.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </label>

        <label>
          <span className="block text-[10px] uppercase tracking-wider font-bold text-paycor-grey mb-1.5">
            Star rating
          </span>
          <select
            value={rating}
            onChange={(event: React.ChangeEvent<HTMLSelectElement>) => {
              setRating(event.target.value);
              setPage(1);
              setSelectedCcn('');
            }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-paycor-orange"
          >
            <option value="">All Ratings</option>
            {STAR_RATINGS.map((stars) => (
              <option key={stars} value={stars}>
                {stars} {stars === 1 ? 'Star' : 'Stars'}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4">
        <label>
          <span className="block text-[10px] uppercase tracking-wider font-bold text-paycor-grey mb-1.5">
            Matching facility
          </span>
          <select
            value={selectedCcn}
            onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
              setSelectedCcn(event.target.value)
            }
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-paycor-orange"
          >
            <option value="">
              Select a facility ({pagination.returned} results on page {pagination.page})
            </option>
            {providers.map((provider) => (
              <option key={provider.ccn} value={provider.ccn}>
                {provider.facilityName} — {provider.city}, {provider.state} — CCN {provider.ccn}{provider.chainName ? ` — ${provider.chainName}` : ''}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-[9px] text-paycor-grey">
          Dataset {source?.datasetId || DATASET_ID}. Missing CMS values remain unchanged and are
          not replaced with averages.
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-bold disabled:opacity-40"
          >
            <ChevronLeft className="w-3 h-3" /> Previous
          </button>
          <button
            type="button"
            disabled={!pagination.hasMore || loading}
            onClick={() => setPage((current) => current + 1)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-bold disabled:opacity-40"
          >
            Next <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {selectedProvider && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-extrabold">{selectedProvider.facilityName}</h3>
                <p className="text-[10px] text-paycor-medium-grey mt-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {selectedProvider.address},{' '}
                  {selectedProvider.city}, {selectedProvider.state} {selectedProvider.zip}
                </p>
                <p className="text-[9px] text-paycor-grey mt-1">
                  CCN {selectedProvider.ccn}
                  {selectedProvider.chainName ? ` • ${selectedProvider.chainName}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={applyProvider}
                className="shrink-0 bg-paycor-orange text-white px-4 py-2.5 rounded-xl text-xs font-extrabold"
              >
                Apply CMS-Reported Metrics
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px]">
              <CmsValue label="Overall rating" value={displayNumber(selectedProvider.overallRating, { suffix: ' Stars' })} reported={selectedProvider.overallRating !== null} />
              <CmsValue label="Staffing rating" value={displayNumber(selectedProvider.staffingRating, { suffix: ' Stars' })} reported={selectedProvider.staffingRating !== null} />
              <CmsValue label="Health inspection" value={displayNumber(selectedProvider.healthInspectionRating, { suffix: ' Stars' })} reported={selectedProvider.healthInspectionRating !== null} />
              <CmsValue label="Quality measure" value={displayNumber(selectedProvider.qualityMeasureRating, { suffix: ' Stars' })} reported={selectedProvider.qualityMeasureRating !== null} />
              <CmsValue label="Nursing turnover" value={displayNumber(selectedProvider.turnoverRate, { suffix: '%' })} reported={selectedProvider.turnoverRate !== null} />
              <CmsValue label="RN turnover" value={displayNumber(selectedProvider.rnTurnover, { suffix: '%' })} reported={selectedProvider.rnTurnover !== null} />
              <CmsValue label="Residents/day" value={displayNumber(selectedProvider.residents)} reported={selectedProvider.residents !== null} />
              <CmsValue label="Certified beds" value={displayNumber(selectedProvider.beds)} reported={selectedProvider.beds !== null} />
              <CmsValue label="Health deficiencies" value={displayNumber(selectedProvider.healthDeficiencies)} reported={selectedProvider.healthDeficiencies !== null} />
              <CmsValue label="Fines" value={displayNumber(selectedProvider.totalFines, { currency: true })} reported={selectedProvider.totalFines !== null} />
              <CmsValue label="RN HPRD" value={displayNumber(selectedProvider.reportedRnStaffing, { digits: 3 })} reported={selectedProvider.reportedRnStaffing !== null} />
              <CmsValue label="Total nurse HPRD" value={displayNumber(selectedProvider.reportedTotalNurseStaffing, { digits: 3 })} reported={selectedProvider.reportedTotalNurseStaffing !== null} />
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[10px] leading-relaxed text-amber-900">
              <strong>Discovery safeguard:</strong> CMS provider data does not supply actual employee
              headcount, wage rates, annual overtime, agency utilization, software investment or
              facility Medicare Part A revenue. Those fields must be confirmed by the prospect or
              clearly retained as planning assumptions.
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function CmsValue({
  label,
  value,
  reported,
}: {
  label: string;
  value: string;
  reported: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-paycor-grey uppercase tracking-wider text-[8px]">
          {label}
        </span>
        <span
          className={`rounded-full px-1.5 py-0.5 text-[7px] font-extrabold uppercase ${
            reported
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-slate-100 text-slate-500'
          }`}
        >
          {reported ? 'CMS' : 'Missing'}
        </span>
      </div>
      <p className="font-extrabold text-paycor-charcoal mt-1">{value}</p>
    </div>
  );
}
