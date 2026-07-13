'use client';

import React from 'react';
import {
  FacilityROICalculatorInputs,
  FacilityROIResults,
  ScenarioAssumptions,
  TurnoverCostMethod,
  TurnoverPopulation,
} from '@/lib/roi-types';

interface TurnoverInsightsCardProps {
  inputs: FacilityROICalculatorInputs;
  results: FacilityROIResults;
  assumptions: ScenarioAssumptions;
  onInputChange: <K extends keyof FacilityROICalculatorInputs>(
    key: K,
    value: FacilityROICalculatorInputs[K],
  ) => void;
  onAssumptionsChange: (assumptions: ScenarioAssumptions) => void;
}

const money = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value || 0);

const number = (value: number, digits = 0) =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value || 0);

export default function TurnoverInsightsCard({
  inputs,
  results,
  assumptions,
  onInputChange,
  onAssumptionsChange,
}: TurnoverInsightsCardProps) {
  const method: TurnoverCostMethod =
    inputs.turnoverCostMethod === 'fixed' ? 'fixed' : 'compensation-percentage';
  const population: TurnoverPopulation =
    inputs.turnoverPopulation === 'entire' ? 'entire' : 'nursing';
  const nursingShare = Math.max(0, Math.min(1, inputs.nursingWorkforceShare ?? 0.65));
  const turnoverSource = inputs.inputSources?.turnoverRate?.source;
  const costSource = inputs.inputSources?.turnoverCostMethod?.source || 'default';

  return (
    <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div>
          <h3 className="text-xs font-extrabold text-paycor-charcoal">
            Turnover Cost Model
          </h3>
          <p className="mt-1 max-w-3xl text-[10px] leading-relaxed text-paycor-medium-grey">
            Make the replacement-cost assumption and the workforce population explicit. CMS reports nursing-staff turnover, so CMS-sourced rates default to the nursing workforce rather than every employee.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="self-start rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[8px] font-extrabold uppercase text-amber-700">
            Editable planning assumption
          </span>
          <span className="self-start rounded-full border border-slate-200 bg-white px-2 py-1 text-[8px] font-extrabold uppercase text-paycor-medium-grey">
            {costSource}
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] font-extrabold text-paycor-charcoal">Apply turnover rate to</p>
          <select
            value={population}
            onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
              onInputChange('turnoverPopulation', event.target.value as TurnoverPopulation)
            }
            className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none focus:border-paycor-orange"
          >
            <option value="nursing">Nursing workforce only</option>
            <option value="entire">Entire workforce</option>
          </select>
          {population === 'nursing' && (
            <label className="mt-3 block">
              <span className="text-[9px] font-bold text-paycor-medium-grey">
                Nursing share of total headcount
              </span>
              <div className="relative mt-1">
                <input
                  type="number"
                  min="1"
                  max="100"
                  step="1"
                  value={Math.round(nursingShare * 100)}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    onInputChange(
                      'nursingWorkforceShare',
                      Math.max(0, Math.min(100, Number(event.target.value) || 0)) / 100,
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-8 text-xs outline-none focus:border-paycor-orange"
                />
                <span className="absolute right-3 top-2.5 text-xs text-paycor-grey">%</span>
              </div>
            </label>
          )}
          <p className="mt-2 text-[9px] leading-relaxed text-paycor-grey">
            {turnoverSource === 'cms'
              ? 'CMS nursing-staff turnover is currently loaded. Nursing workforce only is the recommended population.'
              : 'The rate has been entered or confirmed outside CMS. Select the population that matches the source.'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-2">
          <p className="text-[10px] font-extrabold text-paycor-charcoal">Turnover cost method</p>
          <div className="mt-2 inline-flex rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => onInputChange('turnoverCostMethod', 'compensation-percentage')}
              className={`rounded-lg px-3 py-2 text-[10px] font-extrabold ${
                method === 'compensation-percentage'
                  ? 'bg-white text-paycor-orange shadow-sm'
                  : 'text-paycor-medium-grey'
              }`}
            >
              % of annual compensation
            </button>
            <button
              type="button"
              onClick={() => {
                if (!inputs.fixedTurnoverCost) {
                  onInputChange('fixedTurnoverCost', Math.round(results.estimatedCostPerTurnover));
                }
                onInputChange('turnoverCostMethod', 'fixed');
              }}
              className={`rounded-lg px-3 py-2 text-[10px] font-extrabold ${
                method === 'fixed'
                  ? 'bg-white text-paycor-orange shadow-sm'
                  : 'text-paycor-medium-grey'
              }`}
            >
              Fixed cost per turnover
            </button>
          </div>

          {method === 'compensation-percentage' ? (
            <label className="mt-4 block max-w-sm">
              <span className="text-[9px] font-bold text-paycor-medium-grey">
                Replacement cost as a percentage of annual compensation
              </span>
              <div className="relative mt-1">
                <input
                  type="number"
                  min="0"
                  max="150"
                  step="5"
                  value={Number((assumptions.turnoverCostMultiple * 100).toFixed(0))}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                    onInputChange('turnoverCostMethod', 'compensation-percentage');
                    onAssumptionsChange({
                      ...assumptions,
                      turnoverCostMultiple:
                        Math.max(0, Number(event.target.value) || 0) / 100,
                    });
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-8 text-xs outline-none focus:border-paycor-orange"
                />
                <span className="absolute right-3 top-2.5 text-xs text-paycor-grey">%</span>
              </div>
              <p className="mt-2 text-[9px] text-paycor-grey">
                Scenario presets: Conservative 25% · Expected 40% · Opportunity 60%.
              </p>
            </label>
          ) : (
            <label className="mt-4 block max-w-sm">
              <span className="text-[9px] font-bold text-paycor-medium-grey">
                Fixed replacement cost per turnover
              </span>
              <div className="relative mt-1">
                <span className="absolute left-3 top-2.5 text-xs text-paycor-grey">$</span>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={Math.round(inputs.fixedTurnoverCost || results.estimatedCostPerTurnover)}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    onInputChange('fixedTurnoverCost', Number(event.target.value) || 0)
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-7 pr-3 text-xs outline-none focus:border-paycor-orange"
                />
              </div>
              <p className="mt-2 text-[9px] text-paycor-grey">
                This value remains fixed when the scenario changes unless a user edits it.
              </p>
            </label>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric label="Eligible workforce" value={number(results.turnoverEligibleHeadcount)} />
        <Metric label="Estimated turnover events" value={number(results.estimatedTurnoverEvents, 1)} />
        <Metric label="Cost per turnover" value={money(results.estimatedCostPerTurnover)} />
        <Metric label="Modeled turnover burden" value={money(results.baselineTurnoverBurden)} emphasis />
      </div>

      <p className="mt-3 text-[9px] leading-relaxed text-paycor-grey">
        Formula: {number(results.turnoverEligibleHeadcount)} eligible employees × {number(inputs.turnoverRate, 1)}% turnover × {money(results.estimatedCostPerTurnover)} per turnover = {money(results.baselineTurnoverBurden)} current modeled burden.
      </p>
    </div>
  );
}

function Metric({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-3 ${emphasis ? 'border-paycor-orange/30 bg-paycor-orange/5' : 'border-slate-200 bg-white'}`}>
      <p className="text-[8px] font-bold uppercase tracking-wider text-paycor-grey">{label}</p>
      <p className={`mt-1 text-base font-black ${emphasis ? 'text-paycor-orange' : 'text-paycor-charcoal'}`}>{value}</p>
    </div>
  );
}
