'use client';

import React, { useMemo, useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, RotateCcw, ShieldCheck } from 'lucide-react';
import {
  ASSUMPTION_DEFINITIONS,
  getScenarioAssumptions,
} from '@/lib/assumptions';
import {
  ScenarioAssumptions,
  ScenarioKey,
} from '@/lib/roi-types';

interface AssumptionsPanelProps {
  scenario: ScenarioKey;
  assumptions: ScenarioAssumptions;
  onScenarioChange: (scenario: ScenarioKey, assumptions: ScenarioAssumptions) => void;
  onAssumptionsChange: (assumptions: ScenarioAssumptions) => void;
}

const evidenceStyles = {
  direct: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  influenced: 'bg-amber-50 text-amber-700 border-amber-200',
  correlated: 'bg-sky-50 text-sky-700 border-sky-200',
};

const PRIMARY_KEYS: Array<keyof ScenarioAssumptions> = [
  'turnoverCostMultiple',
  'turnoverImprovementRate',
  'overtimeReductionRate',
  'agencyReductionRate',
  'pbjEfficiencyRate',
  'techRetirementRate',
];

const ADVANCED_KEYS: Array<keyof ScenarioAssumptions> = [
  'turnoverPaycorAttribution',
  'overtimePaycorAttribution',
  'agencyPaycorAttribution',
  'pbjPaycorAttribution',
];

export default function AssumptionsPanel({
  scenario,
  assumptions,
  onScenarioChange,
  onAssumptionsChange,
}: AssumptionsPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const changedCount = useMemo(() => {
    const defaults = getScenarioAssumptions(scenario);
    return ASSUMPTION_DEFINITIONS.filter(
      (definition) =>
        [...PRIMARY_KEYS, ...ADVANCED_KEYS].includes(definition.key) &&
        Math.abs(assumptions[definition.key] - defaults[definition.key]) > 0.000001,
    ).length;
  }, [assumptions, scenario]);

  const updateAssumption = (
    key: keyof ScenarioAssumptions,
    value: number,
  ) => {
    onAssumptionsChange({
      ...assumptions,
      [key]: value,
    });
  };

  const selectScenario = (nextScenario: ScenarioKey) => {
    onScenarioChange(nextScenario, getScenarioAssumptions(nextScenario));
  };

  const resetScenario = () => {
    onAssumptionsChange(getScenarioAssumptions(scenario));
  };

  const visibleDefinitions = ASSUMPTION_DEFINITIONS.filter((definition) =>
    PRIMARY_KEYS.includes(definition.key) || (showAdvanced && ADVANCED_KEYS.includes(definition.key)),
  );

  return (
    <section className="bg-white border border-paycor-border-grey rounded-2xl shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="w-full p-5 flex items-center justify-between gap-4 text-left"
      >
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-paycor-orange/10 p-2 text-paycor-orange">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-paycor-charcoal">
              Assumptions, Attribution &amp; Evidence
            </h2>
            <p className="text-[11px] text-paycor-medium-grey mt-1 max-w-3xl">
              Scenario rates are editable planning assumptions—not guaranteed outcomes. Base ROI includes direct and Paycor-influenced value; correlated strategic upside remains separate.
            </p>
            {changedCount > 0 && (
              <span className="inline-block mt-2 text-[10px] font-bold text-paycor-orange">
                {changedCount} assumption{changedCount === 1 ? '' : 's'} customized
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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {(['conservative', 'expected', 'opportunity'] as ScenarioKey[]).map(
                (option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => selectScenario(option)}
                    className={`px-3 py-2 rounded-xl border text-xs font-bold capitalize transition ${
                      scenario === option
                        ? 'bg-paycor-orange text-white border-paycor-orange'
                        : 'bg-white text-paycor-medium-grey border-slate-200 hover:border-paycor-orange'
                    }`}
                  >
                    {option}
                  </button>
                ),
              )}
            </div>
            <button
              type="button"
              onClick={resetScenario}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-paycor-medium-grey hover:text-paycor-orange"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset selected scenario
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-extrabold text-paycor-charcoal">Keep the live conversation focused</p>
              <p className="text-[9px] text-paycor-grey mt-1">Strategic census, SNF VBP and compliance assumptions are refined inside the Strategic Downstream Opportunity card, where their effect is visible.</p>
            </div>
            <button type="button" onClick={() => setShowAdvanced((value) => !value)} className="text-[10px] font-bold text-paycor-orange shrink-0">
              {showAdvanced ? 'Hide causation guardrails' : 'Show causation guardrails'}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {visibleDefinitions.map((definition) => {
              const rawValue = assumptions[definition.key];
              const displayValue = definition.isPercentage
                ? Math.round(rawValue * 1000) / 10
                : rawValue;
              const inputValue = definition.isPercentage
                ? rawValue * 100
                : rawValue;
              const inputMin = definition.isPercentage
                ? definition.min * 100
                : definition.min;
              const inputMax = definition.isPercentage
                ? definition.max * 100
                : definition.max;
              const inputStep = definition.isPercentage
                ? definition.step * 100
                : definition.step;

              return (
                <article
                  key={definition.key}
                  className="border border-slate-200 rounded-2xl p-4 bg-slate-50/60"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xs font-extrabold text-paycor-charcoal">
                        {definition.label}
                      </h3>
                      <p className="text-[10px] leading-relaxed text-paycor-medium-grey mt-1">
                        {definition.description}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 border rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${evidenceStyles[definition.evidenceClass]}`}
                    >
                      {definition.evidenceClass}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <input
                      type="range"
                      min={inputMin}
                      max={inputMax}
                      step={inputStep}
                      value={inputValue}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                        updateAssumption(
                          definition.key,
                          definition.isPercentage
                            ? Number(event.target.value) / 100
                            : Number(event.target.value),
                        )
                      }
                      className="flex-1 accent-paycor-orange"
                    />
                    <div className="w-24 relative">
                      <input
                        type="number"
                        min={inputMin}
                        max={inputMax}
                        step={inputStep}
                        value={Number.isFinite(displayValue) ? displayValue : 0}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                          updateAssumption(
                            definition.key,
                            definition.isPercentage
                              ? Number(event.target.value) / 100
                              : Number(event.target.value),
                          )
                        }
                        className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 pr-7 text-xs font-bold text-paycor-charcoal outline-none focus:border-paycor-orange"
                      />
                      {definition.isPercentage && (
                        <span className="absolute right-2 top-1.5 text-xs text-paycor-grey">%</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex items-start gap-1.5 text-[9px] text-paycor-grey">
                    <BookOpen className="w-3 h-3 mt-0.5 shrink-0" />
                    {definition.sourceUrl ? (
                      <a
                        href={definition.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-paycor-orange underline underline-offset-2"
                      >
                        {definition.sourceLabel}
                      </a>
                    ) : (
                      <span>{definition.sourceLabel}</span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
