'use client';

import React from 'react';
import { FacilityROICalculatorInputs, FacilityROIResults } from '@/lib/roi-types';

interface OperationalTranslationCardProps {
  inputs: FacilityROICalculatorInputs;
  results: FacilityROIResults;
}

const number = (value: number, digits = 0) =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value || 0);

export default function OperationalTranslationCard({
  inputs,
  results,
}: OperationalTranslationCardProps) {
  return (
    <details className="mt-4 rounded-2xl border border-slate-200 bg-white">
      <summary className="cursor-pointer list-none p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xs font-extrabold text-paycor-charcoal">
              What these numbers mean operationally
            </h3>
            <p className="mt-1 text-[10px] leading-relaxed text-paycor-medium-grey">
              Translate annual inputs into events, weekly hours, and full-time-equivalent workload without adding more discovery questions.
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[8px] font-extrabold uppercase text-paycor-medium-grey">
            View calculations
          </span>
        </div>
      </summary>

      <div className="border-t border-slate-100 p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Metric
            label="Turnover events / year"
            value={number(results.estimatedTurnoverEvents, 1)}
            note={`${number(results.turnoverEligibleHeadcount)} eligible employees`}
          />
          <Metric
            label="Cost per turnover"
            value={new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              maximumFractionDigits: 0,
            }).format(results.estimatedCostPerTurnover || 0)}
            note={results.turnoverCostMethodLabel}
          />
          <Metric
            label="Overtime hours / week"
            value={number(results.weeklyOvertimeHours, 1)}
            note={`${number(results.overtimeHoursPerEmployeePerWeek, 2)} hrs per employee / week`}
          />
          <Metric
            label="Overtime share"
            value={`${number(results.overtimeShareOfPaidHours * 100, 1)}%`}
            note="of total theoretical paid hours"
          />
          <Metric
            label="Overtime FTE equivalent"
            value={number(results.overtimeFteEquivalent, 2)}
            note="annual overtime hours ÷ 2,080"
          />
          <Metric
            label="Agency FTE equivalent"
            value={number(results.agencyFteEquivalent, 2)}
            note={`${number(inputs.weeklyAgencyHours, 1)} agency hours / week`}
          />
          <Metric
            label="PBJ admin days / year"
            value={number(results.pbjAdminDaysPerYear, 1)}
            note="8-hour workday equivalent"
          />
        </div>

        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[9px] leading-relaxed text-amber-900">
          <strong>Sensitivity note:</strong> Results are most affected by the turnover population, replacement-cost method, annual overtime hours, technology contracts, and approved Paycor investment. Overtime normalization currently uses total headcount × 2,080 as a planning denominator and should be replaced with overtime-eligible paid hours when available.
        </div>
      </div>
    </details>
  );
}

function Metric({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-[8px] font-bold uppercase tracking-wider text-paycor-grey">{label}</p>
      <p className="mt-1 text-base font-black text-paycor-charcoal">{value}</p>
      <p className="mt-1 text-[8px] leading-relaxed text-paycor-grey">{note}</p>
    </div>
  );
}
