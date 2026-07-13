'use client';

import React from 'react';

interface StatusQuoCardProps {
  currentBurden: number;
  paycorInfluencedBenefit: number;
}

const money = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value || 0);

export default function StatusQuoCard({
  currentBurden,
  paycorInfluencedBenefit,
}: StatusQuoCardProps) {
  const currentMonthly = currentBurden / 12;
  const opportunityMonthly = paycorInfluencedBenefit / 12;

  return (
    <section className="rounded-2xl border border-paycor-border-grey bg-white p-6 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-sm font-extrabold text-paycor-charcoal">Status Quo Run Rate</h2>
          <p className="mt-1 max-w-3xl text-[10px] leading-relaxed text-paycor-medium-grey">
            Distinguish the full operating burden from the smaller portion modeled as Paycor-influenced. This prevents the business case from implying that every current cost is removable.
          </p>
        </div>
        <span className="self-start rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[8px] font-extrabold uppercase text-paycor-medium-grey">
          Cost of delay context
        </span>
      </div>

      <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Metric
          label="Current modeled operating burden"
          annual={currentBurden}
          monthly={currentMonthly}
          note="Gross turnover, overtime premium, agency premium, PBJ labor, and technology burden. Not all of this is addressable by Paycor."
        />
        <Metric
          label="Paycor-influenced opportunity"
          annual={paycorInfluencedBenefit}
          monthly={opportunityMonthly}
          emphasis
          note="Applies the selected improvement and contribution assumptions. This is the value used in base ROI."
        />
        <Metric
          label="Modeled cost of delay"
          annual={paycorInfluencedBenefit}
          monthly={opportunityMonthly}
          note="Each month of delay represents modeled opportunity not yet pursued, subject to validation, implementation, adoption, and management execution."
        />
      </div>
    </section>
  );
}

function Metric({
  label,
  annual,
  monthly,
  note,
  emphasis = false,
}: {
  label: string;
  annual: number;
  monthly: number;
  note: string;
  emphasis?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${emphasis ? 'border-paycor-orange/30 bg-paycor-orange/5' : 'border-slate-200 bg-slate-50'}`}>
      <p className="text-[9px] font-bold uppercase tracking-wider text-paycor-grey">{label}</p>
      <p className={`mt-2 text-xl font-black ${emphasis ? 'text-paycor-orange' : 'text-paycor-charcoal'}`}>{money(annual)} / year</p>
      <p className="mt-1 text-sm font-extrabold text-paycor-medium-grey">{money(monthly)} / month</p>
      <p className="mt-3 text-[9px] leading-relaxed text-paycor-grey">{note}</p>
    </div>
  );
}
