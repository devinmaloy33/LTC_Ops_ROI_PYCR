'use client';

import React from 'react';
import { CheckCircle2, Database, FileDown, SlidersHorizontal, WandSparkles, X } from 'lucide-react';

interface FirstUseGuideProps {
  open: boolean;
  onClose: () => void;
}

const steps = [
  {
    icon: Database,
    title: 'Select the facility',
    body: 'Search CMS by provider name, CCN, state, or reported chain. CMS values remain labeled and missing values stay missing.',
  },
  {
    icon: CheckCircle2,
    title: 'Review CMS context',
    body: 'Confirm the facility, chain, ratings, nursing turnover, deficiencies, fines, census, and staffing information that CMS reports.',
  },
  {
    icon: WandSparkles,
    title: 'Confirm or estimate key inputs',
    body: 'Use actual headcount, wages, overtime, agency, PBJ, technology, and pricing when available. The estimate assistant clearly labels fallbacks.',
  },
  {
    icon: SlidersHorizontal,
    title: 'Review assumptions',
    body: 'Choose a scenario, adjust turnover cost and population, and validate the assumptions that materially affect the business case.',
  },
  {
    icon: FileDown,
    title: 'Create the executive case',
    body: 'Review base ROI separately from strategic business context, select the audience role, and download the customer-facing report.',
  },
];

export default function FirstUseGuide({ open, onClose }: FirstUseGuideProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white p-5">
          <div>
            <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-paycor-orange">
              60-second walkthrough
            </p>
            <h2 className="mt-1 text-lg font-black text-paycor-charcoal">
              How to build a defensible LTC business case
            </h2>
            <p className="mt-1 text-[10px] leading-relaxed text-paycor-medium-grey">
              The tool is designed to support a live consultant conversation while preserving enough methodology for finance, HR, operations, IT, and clinical stakeholders to validate the result.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 p-2 text-paycor-medium-grey"
            aria-label="Close walkthrough"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 p-5">
          {steps.map(({ icon: Icon, title, body }, index) => (
            <div key={title} className="flex gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-paycor-orange/10 text-paycor-orange">
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[9px] font-extrabold uppercase tracking-wider text-paycor-grey">
                  Step {index + 1}
                </p>
                <h3 className="mt-0.5 text-xs font-extrabold text-paycor-charcoal">{title}</h3>
                <p className="mt-1 text-[10px] leading-relaxed text-paycor-medium-grey">{body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-slate-200 p-5">
          <p className="text-[9px] leading-relaxed text-paycor-grey">
            The walkthrough will not open automatically again on this browser. It remains available from the application header.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl bg-paycor-orange px-4 py-2.5 text-xs font-extrabold text-white"
          >
            Start assessment
          </button>
        </div>
      </div>
    </div>
  );
}
