'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Check,
  Loader2,
  MapPin,
  Search,
} from 'lucide-react';

interface Provider {
  ccn: string;
  facilityName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  beds: number;
  residents: number;
  overallRating: number;
  staffingRating: number;
  turnoverRate: number;
  rnTurnover: number;
  adminTurnover?: string;
  totalFines: number;
  healthDeficiencies: number;
  chainName?: string;
  chainFacilities?: number;
}

interface SheetsSyncProps {
  onApplyMetrics: (metrics: {
    facilityName?: string;
    ccn?: string;
    state?: string;
    chainName?: string;
    headcount?: number;
    turnoverRate?: number;
    rnTurnover?: number;
    adminTurnover?: string;
    overallRating?: number;
    staffingRating?: number;
    projectedOverallRating?: number;
    annualMedicarePartARevenue?: number;
    totalFines?: number;
    healthDeficiencies?: number;
  }) => void;
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

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA', 'HI',
  'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN',
  'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH',
  'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA',
  'WV', 'WI', 'WY',
];

export default function SheetsSync({ onApplyMetrics }: SheetsSyncProps) {
  const [state, setState] = useState('All');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedCcn, setSelectedCcn] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    async function loadProviders() {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams();
        if (state !== 'All') params.set('state', state);
        if (debouncedSearch) params.set('search', debouncedSearch);
        const response = await fetch(`/api/providers?${params.toString()}`);
        const data = await response.json();
        if (!response.ok || data.error) {
          throw new Error(data.error || 'CMS provider records could not be retrieved.');
        }
        if (active) {
          setProviders(Array.isArray(data.providers) ? data.providers : []);
        }
      } catch (loadError: any) {
        if (active) setError(loadError.message || 'Unable to load CMS provider records.');
      } finally {
        if (active) setLoading(false);
      }
    }
    loadProviders();
    return () => {
      active = false;
    };
  }, [state, debouncedSearch]);

  const selectedProvider = useMemo(
    () => providers.find((provider) => provider.ccn === selectedCcn),
    [providers, selectedCcn],
  );

  const applyProvider = () => {
    if (!selectedProvider) return;

    // These two values are explicit sizing proxies, not CMS-reported finance/FTE values.
    // They must be confirmed with the prospect during discovery.
    const estimatedHeadcount = Math.max(
      10,
      Math.round((selectedProvider.residents || selectedProvider.beds || 0) * 1.2),
    );
    const estimatedMedicarePartARevenue = Math.max(
      0,
      Math.round((selectedProvider.residents || 0) * 35_000),
    );

    onApplyMetrics({
      ccn: selectedProvider.ccn,
      state: selectedProvider.state,
      chainName: selectedProvider.chainName,
      facilityName: `${selectedProvider.facilityName} - ${selectedProvider.address}, ${selectedProvider.city}, ${selectedProvider.state}`,
      headcount: estimatedHeadcount,
      turnoverRate: selectedProvider.turnoverRate,
      rnTurnover: selectedProvider.rnTurnover,
      adminTurnover: selectedProvider.adminTurnover,
      overallRating: selectedProvider.overallRating,
      staffingRating: selectedProvider.staffingRating,
      projectedOverallRating: Math.min(5, selectedProvider.overallRating + 1),
      annualMedicarePartARevenue: estimatedMedicarePartARevenue,
      totalFines: selectedProvider.totalFines,
      healthDeficiencies: selectedProvider.healthDeficiencies,
    });

    setApplied(true);
    window.setTimeout(() => setApplied(false), 3000);
  };

  return (
    <section className="bg-white border border-paycor-border-grey rounded-2xl p-5 shadow-sm animate-fadeIn">
      <div className="flex items-start gap-3 border-b border-slate-100 pb-4 mb-4">
        <div className="rounded-xl bg-paycor-orange/10 p-2 text-paycor-orange">
          <Building2 className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-sm font-extrabold text-paycor-charcoal">CMS Nursing Home Provider Directory</h2>
          <p className="text-[10px] text-paycor-medium-grey mt-1 leading-relaxed">
            Uses CMS provider records for Medicare- and Medicaid-certified nursing homes, including skilled nursing and rehabilitation providers. Confirm all sizing and financial proxies with the prospect.
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
          <Check className="w-4 h-4" /> CMS facility metrics applied. Review estimated headcount and Medicare revenue.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-3">
        <label>
          <span className="block text-[10px] uppercase tracking-wider font-bold text-paycor-grey mb-1.5">State</span>
          <select
            value={state}
            onChange={(event: React.ChangeEvent<HTMLSelectElement>) => {
              setState(event.target.value);
              setSelectedCcn('');
            }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-paycor-orange cursor-pointer"
          >
            <option value="All">All States</option>
            {US_STATES.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>

        <label>
          <span className="block text-[10px] uppercase tracking-wider font-bold text-paycor-grey mb-1.5">Search name or six-digit CCN</span>
          <div className="relative">
            <Search className="absolute left-3 top-3.5 w-4 h-4 text-paycor-grey" />
            <input
              type="text"
              value={search}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                setSearch(event.target.value);
                setSelectedCcn('');
              }}
              placeholder="Search CMS provider records"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2.5 text-sm outline-none focus:border-paycor-orange"
            />
            {loading && <Loader2 className="absolute right-3 top-3.5 w-4 h-4 animate-spin text-paycor-orange" />}
          </div>
        </label>
      </div>

      <div className="mt-4">
        <label>
          <span className="block text-[10px] uppercase tracking-wider font-bold text-paycor-grey mb-1.5">Matching facility</span>
          <select
            value={selectedCcn}
            onChange={(event: React.ChangeEvent<HTMLSelectElement>) => setSelectedCcn(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-paycor-orange cursor-pointer"
          >
            <option value="">Select a facility ({providers.length} results)</option>
            {providers.map((provider) => (
              <option key={provider.ccn} value={provider.ccn}>
                {provider.facilityName} — {provider.city}, {provider.state} — CCN {provider.ccn}
              </option>
            ))}
          </select>
        </label>
      </div>

      {selectedProvider && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-extrabold">{selectedProvider.facilityName}</h3>
              <p className="text-[10px] text-paycor-medium-grey mt-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {selectedProvider.address}, {selectedProvider.city}, {selectedProvider.state} {selectedProvider.zip}
              </p>
              <div className="flex flex-wrap gap-3 mt-3 text-[10px]">
                <span><strong>Overall:</strong> {selectedProvider.overallRating} Stars</span>
                <span><strong>Staffing:</strong> {selectedProvider.staffingRating} Stars</span>
                <span><strong>Turnover:</strong> {selectedProvider.turnoverRate}%</span>
                <span><strong>Residents/day:</strong> {selectedProvider.residents}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={applyProvider}
              className="shrink-0 bg-paycor-orange hover:bg-paycor-red-orange text-white px-4 py-2.5 rounded-xl text-xs font-extrabold cursor-pointer shadow-sm transition-colors"
            >
              Apply CMS Metrics
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
