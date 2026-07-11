'use client';

import React, { useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, FileDown, ShieldCheck } from 'lucide-react';
import HelpTooltip from './help-tooltip';
import {
  AnalysisMode,
  StrategicOpportunityRefinements,
  StrategicOpportunitySummary,
} from '@/lib/roi-types';

interface StrategicOpportunityCardProps {
  mode: AnalysisMode;
  summary: StrategicOpportunitySummary;
  refinements?: StrategicOpportunityRefinements;
  onRefinementsChange?: (refinements: StrategicOpportunityRefinements) => void;
}

const money = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value || 0);

export default function StrategicOpportunityCard({
  mode,
  summary,
  refinements,
  onRefinementsChange,
}: StrategicOpportunityCardProps) {
  const [expanded, setExpanded] = useState(false);

  const updateRefinement = (
    key: keyof StrategicOpportunityRefinements,
    value: StrategicOpportunityRefinements[keyOf],
  ) => {
    if (!refinements || !onRefinementsChange) return;
    onRefinementsChange({
      ...refinements,
      [key]: value,
    });
  };

  type keyOf = keyof StrategicOpportunityRefinements;

  return (
    <section className="bg-white border border-paycor-border-grey rounded-2xl shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="w-full p-5 flex items-center justify-between gap-4 text-left"
      >
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-sky-50 p-2 text-sky-700">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-extrabold text-paycor-charcoal">
                Strategic Downstream Opportunity
              </h2>
              <HelpTooltip 
                content="Models downstream opportunities including staffing-stabilized census admissions (referrals × star projected rating × conversion), SNF VBP withhold recovery, and compliance risk reduction. These are kept separate from core ROI."
                title="Strategic Opportunities"
              />
              <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[8px] uppercase font-extrabold text-sky-700">Correlated</span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[8px] uppercase font-extrabold text-slate-600">Outside Base ROI</span>
            </div>
            <p className="text-[11px] text-paycor-medium-grey mt-1 max-w-3xl">
              CMS rating improvements, staffing-related admissions capacity, compliance-exposure mitigation, and SNF VBP recovery reside outside base business-case ROI.
            </p>
            {summary.valueHigh > 0 && (
              <span className="inline-block mt-2 text-xs font-black text-sky-700">
                Modeled strategic range: {money(summary.valueLow)} – {money(summary.valueHigh)}
              </span>
            )}
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-paycor-grey shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-paycor-grey shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-slate-100 p-5 space-y-5">
          <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-4 text-[10px] leading-relaxed text-sky-900 flex gap-2.5">
            <AlertCircle className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
            <div>
              <strong>Disclosure statement:</strong> {summary.disclosure}
            </div>
          </div>

          {mode === 'facility' && refinements && onRefinementsChange && (
            <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50/50">
              <h3 className="text-xs font-extrabold text-paycor-charcoal mb-3">Optional Refinement Questions</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <label>
                  <span className="block text-[10px] uppercase tracking-wider font-bold text-paycor-grey mb-1.5">
                    Staffing constrained admissions?
                  </span>
                  <select
                    value={refinements.staffingConstrainedAdmissions}
                    onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
                      updateRefinement(
                        'staffingConstrainedAdmissions',
                        event.target.value as any,
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
                  >
                    <option value="unknown">Unknown / Not confirmed</option>
                    <option value="yes">Yes — active referral turning</option>
                    <option value="no">No — census at maximum physical capacity</option>
                  </select>
                </label>

                <label>
                  <span className="block text-[10px] uppercase tracking-wider font-bold text-paycor-grey mb-1.5">
                    Corporate CMS objective?
                  </span>
                  <select
                    value={refinements.cmsObjective}
                    onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
                      updateRefinement('cmsObjective', event.target.value as any)
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
                  >
                    <option value="unknown">Unknown / Not confirmed</option>
                    <option value="yes">Yes — star level is tied to corporate goals</option>
                    <option value="no">No — no active star-rating target</option>
                  </select>
                </label>

                <label>
                  <span className="block text-[10px] uppercase tracking-wider font-bold text-paycor-grey mb-1.5">
                    Active compliance remediation?
                  </span>
                  <select
                    value={refinements.activeComplianceRemediation}
                    onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
                      updateRefinement(
                        'activeComplianceRemediation',
                        event.target.value as any,
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
                  >
                    <option value="unknown">Unknown / Not confirmed</option>
                    <option value="yes">Yes — active corrective plan or fine risk</option>
                    <option value="no">No — no current open compliance remediation</option>
                  </select>
                </label>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {summary.modules.map((module) => (
              <article
                key={module.key}
                className="border border-slate-200 rounded-2xl p-4 bg-slate-50/60 break-inside-avoid"
              >
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-xs font-extrabold text-paycor-charcoal">{module.title}</h3>
                    <span className="inline-block mt-1 text-[9px] font-bold text-paycor-grey uppercase">
                      {module.statusLabel}
                    </span>
                  </div>
                  {module.valueIncludedInRange && (
                    <strong className="text-xs font-black text-paycor-orange">
                      {module.valueHigh > 0 ? `${money(module.valueLow)} – ${money(module.valueHigh)}` : 'Not monetized'}
                    </strong>
                  )}
                </div>

                <div className="mt-3 space-y-2.5 text-[10px] leading-relaxed">
                  <p>
                    <strong className="text-paycor-grey uppercase tracking-wider text-[8px] block mb-0.5">Current Condition</strong>
                    {module.currentCondition}
                  </p>
                  <p>
                    <strong className="text-paycor-grey uppercase tracking-wider text-[8px] block mb-0.5">Narrative Explanation</strong>
                    {module.narrative}
                  </p>
                  <p className="text-[9px] text-paycor-grey bg-slate-100/50 p-2 rounded-lg border border-slate-100">
                    <strong className="text-paycor-grey uppercase tracking-wider text-[7px] block mb-0.5">Methodology &amp; Evidence</strong>
                    {module.methodology}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
