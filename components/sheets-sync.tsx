'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, Search, Check, AlertTriangle, FileSpreadsheet, 
  Info, ChevronDown, MapPin, Sparkles, Users, Award, TrendingUp 
} from 'lucide-react';
// @ts-ignore
import confetti from 'canvas-confetti';

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
  totalFines: number;
  healthDeficiencies: number;
  chainName?: string;
  chainFacilities?: number;
}

interface SheetsSyncProps {
  onApplyMetrics: (metrics: {
    facilityName?: string;
    headcount?: number;
    hourlyRate?: number;
    turnoverRate?: number;
    pbjHours?: number;
    overtimeHours?: number;
    annualMedicareBilling?: number;
    baselineVbpStars?: number;
    projectedVbpStars?: number;
    rnTurnover?: number;
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
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME',
  'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'Y', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI',
  'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

export default function SheetsSync({ onApplyMetrics, currentValues }: SheetsSyncProps) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);

  // Filter control states
  const [selectedState, setSelectedState] = useState('All');
  const [minStars, setMinStars] = useState('All');
  const [chainSize, setChainSize] = useState('All');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // State for debounced search term to avoid spamming the CMS API
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Debounce the search term (400ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch providers from our custom API route when state or debounced search changes
  useEffect(() => {
    let active = true;
    async function loadProviders() {
      try {
        setIsLoading(true);
        setError('');
        
        const params = new URLSearchParams();
        if (selectedState && selectedState !== 'All') {
          params.append('state', selectedState);
        }
        
        // Only pass search to server if it doesn't look like our fully-formatted selected provider string
        const isFullFormattedString = selectedProvider && 
          searchTerm === `${selectedProvider.facilityName} - ${selectedProvider.address}, ${selectedProvider.city}, ${selectedProvider.state}`;
          
        if (debouncedSearchTerm.trim() && !isFullFormattedString) {
          params.append('search', debouncedSearchTerm.trim());
        }
        
        const url = `/api/providers?${params.toString()}`;
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error('Could not retrieve facility list from CMS Provider API');
        }
        const data = await res.json();
        if (data.error) {
          throw new Error(data.error);
        }
        if (active) {
          setProviders(data.providers || []);
        }
      } catch (err: any) {
        console.error('Error loading providers:', err);
        if (active) {
          setError(err.message || 'Failed to fetch facility records.');
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }
    loadProviders();
    return () => {
      active = false;
    };
  }, [selectedState, debouncedSearchTerm, selectedProvider]);

  // Filter providers as the user types (client-side matching on the currently fetched state/query subset)
  const filteredProviders = React.useMemo(() => {
    let result = providers;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      
      // If the search term is a perfect match for our selected provider, don't filter it out
      const isFullFormattedString = selectedProvider && 
        searchTerm === `${selectedProvider.facilityName} - ${selectedProvider.address}, ${selectedProvider.city}, ${selectedProvider.state}`;
        
      if (!isFullFormattedString) {
        result = result.filter(p => 
          p.facilityName.toLowerCase().includes(term) ||
          p.city.toLowerCase().includes(term) ||
          p.state.toLowerCase().includes(term) ||
          p.ccn.toLowerCase().includes(term) ||
          (p.chainName && p.chainName.toLowerCase().includes(term))
        );
      }
    }

    if (selectedState !== 'All') {
      result = result.filter(p => p.state === selectedState);
    }

    if (minStars !== 'All') {
      const starVal = parseFloat(minStars);
      if (!isNaN(starVal)) {
        result = result.filter(p => p.overallRating >= starVal);
      }
    }

    if (chainSize !== 'All') {
      if (chainSize === 'independent') {
        result = result.filter(p => !(p.chainFacilities ?? 0) || (p.chainFacilities ?? 0) <= 1);
      } else if (chainSize === 'small') {
        result = result.filter(p => (p.chainFacilities ?? 0) >= 2 && (p.chainFacilities ?? 0) <= 10);
      } else if (chainSize === 'medium') {
        result = result.filter(p => (p.chainFacilities ?? 0) >= 11 && (p.chainFacilities ?? 0) <= 50);
      } else if (chainSize === 'large') {
        result = result.filter(p => (p.chainFacilities ?? 0) > 50);
      }
    }

    return result;
  }, [searchTerm, providers, selectedState, minStars, chainSize]);

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-select a provider if it matches the current facility name
  useEffect(() => {
    if (providers.length > 0 && !selectedProvider && currentValues.facilityName) {
      const match = providers.find(p => {
        const rawMatch = p.facilityName.toLowerCase() === currentValues.facilityName.toLowerCase();
        const formattedName = `${p.facilityName} - ${p.address}, ${p.city}, ${p.state}`.toLowerCase();
        const formattedMatch = formattedName === currentValues.facilityName.toLowerCase();
        return rawMatch || formattedMatch;
      });
      if (match) {
        setSelectedProvider(match);
      }
    }
  }, [providers, currentValues.facilityName, selectedProvider]);

  // Render Star Icons helper
  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);
    
    return (
      <span className="flex items-center gap-0.5 text-amber-500 font-bold" title={`${rating} Stars`}>
        {Array.from({ length: fullStars }).map((_, i) => (
          <span key={`f-${i}`}>★</span>
        ))}
        {hasHalf && <span className="opacity-70 text-xs">★</span>}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <span key={`e-${i}`} className="text-slate-200">★</span>
        ))}
        <span className="text-slate-500 text-xs ml-1">({rating}.0)</span>
      </span>
    );
  };

  const handleApply = () => {
    if (!selectedProvider) return;

    // Estimate FTE headcount realistically from average residents/day
    const estimatedFTEs = Math.max(10, Math.round(selectedProvider.residents * 1.2));
    
    // Estimate annual Medicare billing based on facility size
    const estimatedMedicareBilling = Math.round(selectedProvider.residents * 35000);

    onApplyMetrics({
      facilityName: `${selectedProvider.facilityName} - ${selectedProvider.address}, ${selectedProvider.city}, ${selectedProvider.state}`,
      headcount: estimatedFTEs,
      turnoverRate: selectedProvider.turnoverRate,
      baselineVbpStars: selectedProvider.overallRating,
      projectedVbpStars: Math.min(5, selectedProvider.overallRating + 1),
      annualMedicareBilling: estimatedMedicareBilling > 0 ? estimatedMedicareBilling : 4500000,
      rnTurnover: selectedProvider.rnTurnover,
      totalFines: selectedProvider.totalFines,
      healthDeficiencies: selectedProvider.healthDeficiencies
    });

    setApplySuccess(true);
    
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#F58220', '#E03C11', '#F1B326', '#388E3C']
      });
    } catch (e) {
      console.warn("Confetti animation failed to trigger", e);
    }

    setTimeout(() => {
      setApplySuccess(false);
    }, 4000);
  };

  return (
    <div className="bg-white border border-paycor-border-grey rounded-2xl p-5 shadow-sm" id="sheets-sync-container">
      {/* Module Header */}
      <div className="flex items-center justify-between mb-4 border-b border-paycor-border-grey pb-3">
        <div className="flex items-center gap-2">
          <div className="bg-[#FFF0E6] p-1.5 rounded-lg text-paycor-orange">
            <FileSpreadsheet className="w-5 h-5" id="sheets-sync-icon"/>
          </div>
          <div>
            <h3 className="text-sm font-bold text-paycor-charcoal" id="sheets-sync-title">CMS Provider Directory</h3>
            <p className="text-[11px] text-paycor-medium-grey" id="sheets-sync-desc">Exclusively synced with official CMS Facility records</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-start gap-2" id="sync-error-banner">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5"/>
          <span>{error}</span>
        </div>
      )}

      {applySuccess && (
        <div className="mb-4 p-3 bg-[#FFF9F5] border border-[#FFE0CC] text-paycor-orange rounded-xl text-xs flex items-center gap-2.5 animate-bounce" id="sync-success-banner">
          <div className="bg-paycor-orange text-white rounded-full p-0.5 animate-pulse">
            <Check className="w-3.5 h-3.5"/>
          </div>
          <span className="font-semibold text-paycor-orange">Facility metrics applied successfully to your ROI Calculator!</span>
        </div>
      )}

      {/* Main Selector Row */}
      <div className="flex flex-col gap-4 text-xs">
        <div className="relative" ref={dropdownRef}>
          <label className="block text-slate-600 font-bold mb-1.5 uppercase tracking-wider text-[10px]">
            Select Facility Name
          </label>
          
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3"/>
            <input 
              type="text"
              placeholder={isLoading ? "Loading facility list..." : "Search by Provider Name, CCN, City, State..."}
              value={searchTerm}
              disabled={isLoading}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              className="w-full bg-white border border-paycor-border-grey rounded-xl pl-9 pr-8 py-2.5 text-sm text-paycor-charcoal focus:outline-none focus:ring-2 focus:ring-paycor-orange/20 focus:border-paycor-orange transition shadow-sm"
              id="facility-search-input"
            />
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              id="toggle-dropdown-btn"
              type="button"
            >
              <ChevronDown className="w-4 h-4"/>
            </button>
          </div>

          {/* Advanced Search Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-3 mb-1" id="search-filters-grid">
            {/* State Filter */}
            <div>
              <label className="block text-[10px] text-slate-500 font-bold mb-1 uppercase tracking-wider">
                Filter by State
              </label>
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="w-full bg-white border border-paycor-border-grey rounded-xl px-2.5 py-2 text-xs text-paycor-medium-grey focus:outline-none focus:ring-2 focus:ring-paycor-orange/20 focus:border-paycor-orange transition shadow-sm"
                id="state-filter-select"
              >
                <option value="All">All States (US-wide)</option>
                {US_STATES.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>

            {/* Star Rating Filter */}
            <div>
              <label className="block text-[10px] text-slate-500 font-bold mb-1 uppercase tracking-wider">
                CMS Star Rating
              </label>
              <select
                value={minStars}
                onChange={(e) => setMinStars(e.target.value)}
                className="w-full bg-white border border-paycor-border-grey rounded-xl px-2.5 py-2 text-xs text-paycor-medium-grey focus:outline-none focus:ring-2 focus:ring-paycor-orange/20 focus:border-paycor-orange transition shadow-sm"
                id="star-filter-select"
              >
                <option value="All">All Ratings</option>
                <option value="5">5 Stars Only</option>
                <option value="4">4+ Stars</option>
                <option value="3">3+ Stars</option>
                <option value="2">2+ Stars</option>
              </select>
            </div>

            {/* Chain Size Filter */}
            <div>
              <label className="block text-[10px] text-slate-500 font-bold mb-1 uppercase tracking-wider">
                Chain Affiliation
              </label>
              <select
                value={chainSize}
                onChange={(e) => setChainSize(e.target.value)}
                className="w-full bg-white border border-paycor-border-grey rounded-xl px-2.5 py-2 text-xs text-paycor-medium-grey focus:outline-none focus:ring-2 focus:ring-paycor-orange/20 focus:border-paycor-orange transition shadow-sm"
                id="chain-filter-select"
              >
                <option value="All">All Sizes</option>
                <option value="independent">Independent (0-1 Fac.)</option>
                <option value="small">Small Chain (2-10 Fac.)</option>
                <option value="medium">Medium Chain (11-50 Fac.)</option>
                <option value="large">Large Chain (51+ Fac.)</option>
              </select>
            </div>
          </div>

          {/* Active filter count and reset */}
          {(selectedState !== 'All' || minStars !== 'All' || chainSize !== 'All') && (
            <div className="flex items-center justify-between mt-2 px-1 text-xs">
              <span className="text-[10px] text-paycor-orange font-semibold bg-[#FFF9F5] px-2 py-0.5 rounded-full border border-[#FFE0CC]">
                {filteredProviders.length} facilities match active filters
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedState('All');
                  setMinStars('All');
                  setChainSize('All');
                }}
                className="text-[10px] text-red-500 font-extrabold hover:underline"
              >
                Reset Filters
              </button>
            </div>
          )}

          {/* Search Dropdown list */}
          {isOpen && !isLoading && (
            <div className="absolute z-50 w-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto" id="facility-results-dropdown">
              {filteredProviders.length === 0 ? (
                <div className="p-3 text-slate-400 italic text-center">No facilities match your active search & filters.</div>
              ) : (
                filteredProviders.map((p, idx) => (
                  <button
                    key={`${p.ccn || 'no-ccn'}-${idx}`}
                    type="button"
                    onClick={() => {
                      setSelectedProvider(p);
                      setSearchTerm(`${p.facilityName} - ${p.address}, ${p.city}, ${p.state}`);
                      setIsOpen(false);
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-b-0 transition flex flex-col gap-1"
                  >
                    <div className="flex items-start justify-between gap-2 w-full">
                      <span className="font-semibold text-slate-800 text-xs">{p.facilityName}</span>
                      {p.overallRating && (
                        <span className="text-[10px] text-amber-500 font-bold shrink-0">
                            {p.overallRating}.0 ★
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-slate-400 flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-slate-300"/>
                        {p.city}, {p.state} &bull; CCN: {p.ccn}
                      </span>
                      {p.chainName && (
                        <span className="text-[9px] text-paycor-orange font-bold bg-[#FFF9F5] px-1.5 py-0.5 rounded self-start mt-1 border border-[#FFE0CC]">
                          Chain: {p.chainName} ({p.chainFacilities} facilities)
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Selected Provider Card */}
        {selectedProvider ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col gap-3.5" id="facility-detail-card">
            <div className="flex items-start justify-between">
              <div className="w-full">
                <span className="text-[9px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  CCN {selectedProvider.ccn}
                </span>
                <h4 className="font-extrabold text-slate-800 text-sm mt-1">{selectedProvider.facilityName}</h4>
                <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3"/> {selectedProvider.address}, {selectedProvider.city}, {selectedProvider.state} {selectedProvider.zip}
                </p>
                {selectedProvider.chainName && (
                  <div className="mt-2.5 p-2 bg-[#FFF9F5]/60 border border-[#FFE0CC]/50 rounded-xl flex items-start gap-2" id="facility-detail-chain">
                    <div className="bg-paycor-orange text-white font-extrabold text-[8px] px-1.5 py-0.5 rounded uppercase tracking-wider mt-0.5 shrink-0">
                      Chain Network
                    </div>
                    <div className="text-[10px] text-paycor-medium-grey">
                      <span className="font-bold text-paycor-charcoal block text-xs">{selectedProvider.chainName}</span>
                      {selectedProvider.chainFacilities ? (
                        <span>Part of a network of {selectedProvider.chainFacilities} certified facilities</span>
                      ) : (
                        <span>Affiliated chain facility</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Metrics grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 border-t border-b border-slate-100 py-3 text-center">
              <div className="flex flex-col items-center justify-center bg-slate-50/50 p-2 rounded-xl">
                <Users className="w-4.5 h-4.5 text-slate-400 mb-1"/>
                <span className="text-[9px] text-slate-400 uppercase tracking-wide">Beds / Residents</span>
                <span className="font-extrabold text-slate-800 text-xs mt-0.5">
                  {selectedProvider.beds} / {selectedProvider.residents.toFixed(1)}
                </span>
              </div>
              <div className="flex flex-col items-center justify-center bg-slate-50/50 p-2 rounded-xl">
                <TrendingUp className="w-4.5 h-4.5 text-red-400 mb-1"/>
                <span className="text-[9px] text-slate-400 uppercase tracking-wide">Staff Turnover</span>
                <span className="font-extrabold text-red-600 text-xs mt-0.5">{selectedProvider.turnoverRate.toFixed(1)}%</span>
              </div>
              <div className="flex flex-col items-center justify-center bg-slate-50/50 p-2 rounded-xl">
                <Award className="w-4.5 h-4.5 text-amber-400 mb-1"/>
                <span className="text-[9px] text-slate-400 uppercase tracking-wide">Overall Rating</span>
                <span className="text-[11px] mt-0.5">{renderStars(selectedProvider.overallRating)}</span>
              </div>
              <div className="flex flex-col items-center justify-center bg-slate-50/50 p-2 rounded-xl">
                <Building2 className="w-4.5 h-4.5 text-paycor-orange mb-1"/>
                <span className="text-[9px] text-paycor-grey uppercase tracking-wide">Staffing Rating</span>
                <span className="text-[11px] mt-0.5">{renderStars(selectedProvider.staffingRating)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 mt-1">
              <p className="text-[10px] text-paycor-medium-grey leading-tight">
                Applying will auto-estimate FTEs, set baseline ratings, and configure your turnover leakage metrics.
              </p>
              
              <button
                onClick={handleApply}
                type="button"
                className="flex items-center gap-1.5 bg-paycor-orange hover:bg-paycor-red-orange active:bg-paycor-red-orange text-white font-bold py-2 px-4 rounded-xl transition shadow-sm hover:shadow text-xs whitespace-nowrap"
                id="apply-facility-metrics-btn"
              >
                <Sparkles className="w-3.5 h-3.5"/>
                Apply to Calculator
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 bg-white border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center gap-2" id="facility-empty-state">
            <Building2 className="w-8 h-8 text-slate-300"/>
            <div>
              <p className="font-bold text-slate-600 text-xs">No Facility Selected</p>
              <p className="text-[10px] text-slate-400 max-w-[280px]">
                Search and select an active provider from the dropdown to automatically pre-populate facility details.
              </p>
            </div>
          </div>
        )}

        {/* Informative tips */}
        <div className="p-3 bg-[#FFF9F5]/40 rounded-xl text-[10px] text-paycor-medium-grey flex gap-2 border border-[#FFE0CC]/50" id="sheet-format-tips">
          <Info className="w-4 h-4 text-paycor-orange flex-shrink-0 mt-0.5"/>
          <div className="leading-normal">
            <p className="font-bold text-paycor-charcoal mb-0.5">Automated CMS Directory Integration</p>
            <p>Our database synchronizes with actual CMS nursing home records. By selecting a facility, we instantly extract bed occupancy, certified headcount averages, staff turnover records, and CMS stars rating to map your leakage perfectly.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
