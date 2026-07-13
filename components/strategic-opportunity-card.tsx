'use client';

import React from 'react';
import {
  BedDouble,
  ChevronDown,
  CircleDollarSign,
  ShieldCheck,
  Sparkles,
  Star,
} from 'lucide-react';
import {
  AnalysisMode,
  FacilityROICalculatorInputs,
  StrategicOpportunityModule,
  StrategicOpportunitySummary,
  StrategicRefinements,
} from '@/lib/roi-types';

type StrategicInputField =
  | 'projectedOverallRating'
  | 'referralsPerStarLevel'
  | 'avgMonthlyResidentValue'
  | 'annualMedicarePartARevenue'
  | 'complianceRiskExposure';

interface StrategicOpportunityCardProps {
  mode: AnalysisMode;
  summary: StrategicOpportunitySummary;
  inputs?: FacilityROICalculatorInputs;
  refinements?: StrategicRefinements;
  onRefinementsChange?: (refinements: StrategicRefinements) => void;
  onStrategicInputChange?: (field: StrategicInputField, value: number) => void;
}

const money = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Math.max(0, value || 0));

const icons: Record<StrategicOpportunityModule['key'], React.ReactNode> = {
  census: <BedDouble className="w-4 h-4" />,
  cms: <Star className="w-4 h-4" />,
  vbp: <CircleDollarSign className="w-4 h-4" />,
  compliance: <ShieldCheck className="w-4 h-4" />,
};

const priorityStyle = {
  lower: 'bg-slate-100 text-slate-600 border-slate-200',
  moderate: 'bg-amber-50 text-amber-700 border-amber-200',
  high: 'bg-red-50 text-red-700 border-red-200',
};

export default function StrategicOpportunityCard({
  mode,
  summary,
  inputs,
  refinements = {},
  onRefinementsChange,
  onStrategicInputChange,
}: StrategicOpportunityCardProps) {
  const updateRefinement = <K extends keyof StrategicRefinements>(
    key: K,
    value: StrategicRefinements[K],
  ) => {
    onRefinementsChange?.({ ...refinements, [key]: value });
  };

  return (
    <section className="bg-white border border-paycor-border-grey rounded-2xl shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
          <div className="flex gap-3">
            <div className="rounded-xl bg-sky-50 text-sky-700 p-2.5 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-extrabold text-paycor-charcoal">
                  Strategic Downstream Opportunity
                </h2>
                <span className="border border-sky-200 bg-sky-50 text-sky-700 rounded-full px-2 py-0.5 text-[8px] uppercase font-extrabold">
                  Correlated
                </span>
                <span className="border border-slate-200 bg-white text-slate-600 rounded-full px-2 py-0.5 text-[8px] uppercase font-extrabold">
                  Outside Base ROI
                </span>
              </div>
              <p className="text-[11px] text-paycor-medium-grey mt-1 max-w-3xl leading-relaxed">
                Potential enterprise value associated with workforce stability, operational capacity and risk reduction. These scenarios are displayed separately because Paycor may influence—but does not independently cause—these outcomes.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 min-w-[300px]">
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-[8px] uppercase tracking-wider font-extrabold text-paycor-grey">
                Strategic Range
              </p>
              <p className="text-lg font-black mt-1 text-paycor-charcoal">
                {summary.valueHigh > 0
                  ? `${money(summary.valueLow)}–${money(summary.valueHigh)}`
                  : 'Not yet monetized'}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-[8px] uppercase tracking-wider font-extrabold text-paycor-grey">
                High-Priority Facilities
              </p>
              <p className="text-lg font-black mt-1 text-paycor-charcoal">
                {summary.highPriorityFacilityCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {summary.modules.map((module) => (
            <article key={module.key} className="border border-slate-200 rounded-2xl p-4 bg-white">
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  <div className="rounded-lg bg-slate-100 text-paycor-charcoal p-2 shrink-0">
                    {icons[module.key]}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xs font-extrabold">{module.title}</h3>
                      <span className={`border rounded-full px-2 py-0.5 text-[8px] uppercase font-extrabold ${priorityStyle[module.priority]}`}>
                        {module.priority} priority
                      </span>
                    </div>
                    <p className="text-[9px] text-paycor-grey mt-1">{module.subtitle}</p>
                  </div>
                </div>
                {module.valueIncludedInRange && (
                  <div className="text-right shrink-0">
                    <p className="text-[8px] uppercase tracking-wider font-bold text-paycor-grey">
                      Scenario Range
                    </p>
                    <p className="text-sm font-black text-paycor-orange mt-1">
                      {module.valueHigh > 0
                        ? `${money(module.valueLow)}–${money(module.valueHigh)}`
                        : 'Not monetized'}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100 p-3">
                <p className="text-[9px] uppercase tracking-wider font-extrabold text-paycor-grey">
                  Current condition
                </p>
                <p className="text-[10px] text-paycor-charcoal mt-1 leading-relaxed">
                  {module.currentCondition}
                </p>
                <p className="text-[10px] font-bold text-paycor-medium-grey mt-2">
                  {module.statusLabel}
                </p>
              </div>

              <p className="text-[10px] text-paycor-medium-grey leading-relaxed mt-3">
                {module.narrative}
              </p>

              {mode === 'facility' && module.key === 'census' && onRefinementsChange && (
                <RefinementSelect
                  label="Have staffing constraints caused declined or delayed admissions?"
                  value={refinements.staffingConstrainedAdmissions || 'unknown'}
                  options={[
                    ['unknown', 'Unknown'],
                    ['yes', 'Yes'],
                    ['no', 'No'],
                  ]}
                  onChange={(value) =>
                    updateRefinement(
                      'staffingConstrainedAdmissions',
                      value as StrategicRefinements['staffingConstrainedAdmissions'],
                    )
                  }
                />
              )}

              {mode === 'facility' && module.key === 'census' && inputs && onStrategicInputChange && (
                <details className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <summary className="cursor-pointer text-[9px] font-extrabold text-paycor-medium-grey">Refine census assumptions</summary>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <RefinementNumber label="Additional monthly referrals per rating-level improvement" value={inputs.referralsPerStarLevel} onChange={(value) => onStrategicInputChange('referralsPerStarLevel', value)} />
                    <RefinementNumber label="Average monthly resident value" value={inputs.avgMonthlyResidentValue} prefix="$" onChange={(value) => onStrategicInputChange('avgMonthlyResidentValue', value)} />
                  </div>
                  <p className="text-[8px] text-paycor-grey mt-2">The referral assumption is applied only to the positive change between the current and modeled overall rating—not to the full target rating.</p>
                </details>
              )}

              {mode === 'facility' && module.key === 'cms' && onRefinementsChange && (
                <RefinementSelect
                  label="What is the stated CMS strategy?"
                  value={refinements.cmsObjective || 'unknown'}
                  options={[
                    ['unknown', 'Not confirmed'],
                    ['protect', 'Protect current rating'],
                    ['improve', 'Improve rating'],
                  ]}
                  onChange={(value) =>
                    updateRefinement(
                      'cmsObjective',
                      value as StrategicRefinements['cmsObjective'],
                    )
                  }
                />
              )}

              {mode === 'facility' && module.key === 'cms' && inputs && onStrategicInputChange && (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <RefinementStar label="Modeled overall rating" value={inputs.projectedOverallRating} onChange={(value) => onStrategicInputChange('projectedOverallRating', value)} />
                  <p className="text-[8px] text-paycor-grey mt-2">This is a consultant scenario—not a CMS rating forecast or guarantee.</p>
                </div>
              )}

              {mode === 'facility' && module.key === 'vbp' && inputs && onStrategicInputChange && (
                <details className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <summary className="cursor-pointer text-[9px] font-extrabold text-paycor-medium-grey">Refine SNF VBP exposure</summary>
                  <div className="mt-3">
                    <RefinementNumber label="Annual Medicare FFS Part A revenue" value={inputs.annualMedicarePartARevenue} prefix="$" onChange={(value) => onStrategicInputChange('annualMedicarePartARevenue', value)} />
                  </div>
                </details>
              )}

              {mode === 'facility' && module.key === 'compliance' && onRefinementsChange && (
                <RefinementSelect
                  label="Is an active compliance or survey remediation plan underway?"
                  value={refinements.activeComplianceRemediation || 'unknown'}
                  options={[
                    ['unknown', 'Unknown'],
                    ['yes', 'Yes'],
                    ['no', 'No'],
                  ]}
                  onChange={(value) =>
                    updateRefinement(
                      'activeComplianceRemediation',
                      value as StrategicRefinements['activeComplianceRemediation'],
                    )
                  }
                />
              )}

              {mode === 'facility' && module.key === 'compliance' && inputs && onStrategicInputChange && (
                <details className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <summary className="cursor-pointer text-[9px] font-extrabold text-paycor-medium-grey">Refine financial exposure</summary>
                  <div className="mt-3">
                    <RefinementNumber label="Prospect-estimated prospective compliance exposure" value={inputs.complianceRiskExposure} prefix="$" onChange={(value) => onStrategicInputChange('complianceRiskExposure', value)} />
                  </div>
                  <p className="text-[8px] text-paycor-grey mt-2">Historical fines remain context only and are not automatically treated as future avoidable value.</p>
                </details>
              )}

              <details className="mt-3 group">
                <summary className="list-none cursor-pointer inline-flex items-center gap-1 text-[9px] font-extrabold text-sky-700">
                  <ChevronDown className="w-3.5 h-3.5 transition group-open:rotate-180" />
                  How this was determined
                </summary>
                <div className="mt-3 border-t border-slate-100 pt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-[9px] leading-relaxed text-paycor-medium-grey">
                  <Detail label="Method" value={module.methodology} />
                  <Detail label="Source context" value={module.sourceSummary} />
                  <Detail label="How Paycor may influence it" value={module.paycorInfluence} />
                  <Detail label="What Paycor does not control" value={module.outsidePaycorControl} />
                </div>
              </details>
            </article>
          ))}
        </div>

        <div className="mt-5 rounded-xl border border-sky-200 bg-sky-50 p-4 text-[10px] leading-relaxed text-sky-900">
          <strong>Reconciliation rule:</strong> {summary.disclosure}
        </div>
      </div>
    </section>
  );
}

function RefinementSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<[string, string]>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <label className="block text-[9px] font-bold text-paycor-medium-grey mb-1.5">
        Optional refinement: {label}
      </label>
      <select
        value={value}
        onChange={(event: React.ChangeEvent<HTMLSelectElement>) => onChange(event.target.value)}
        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[10px] outline-none focus:border-paycor-orange"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </div>
  );
}

function RefinementNumber({
  label,
  value,
  prefix,
  onChange,
}: {
  label: string;
  value: number;
  prefix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label>
      <span className="block text-[8px] font-bold text-paycor-grey mb-1">{label}</span>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-2 text-xs text-paycor-grey">{prefix}</span>}
        <input type="number" min="0" step="any" value={Number.isFinite(value) ? value : 0} onChange={(event: React.ChangeEvent<HTMLInputElement>) => onChange(Number(event.target.value) || 0)} className={`w-full rounded-xl border border-slate-200 bg-white py-2 text-[10px] outline-none focus:border-paycor-orange ${prefix ? 'pl-7 pr-3' : 'px-3'}`} />
      </div>
    </label>
  );
}

function RefinementStar({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label>
      <span className="block text-[8px] font-bold text-paycor-grey mb-1">{label}</span>
      <select value={value} onChange={(event: React.ChangeEvent<HTMLSelectElement>) => onChange(Number(event.target.value))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] outline-none focus:border-paycor-orange">
        {[1, 2, 3, 4, 5].map((star) => <option key={star} value={star}>{star}.0 Stars</option>)}
      </select>
    </label>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="uppercase tracking-wider font-extrabold text-paycor-grey">{label}</p>
      <p className="mt-1">{value}</p>
    </div>
  );
}
