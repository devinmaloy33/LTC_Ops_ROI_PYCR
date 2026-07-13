'use client';

import React, { useMemo, useState } from 'react';
import { Download, Printer, X } from 'lucide-react';
import { ASSUMPTION_DEFINITIONS } from '@/lib/assumptions';
import { buildExecutiveNarrative } from '@/lib/executive-narrative';
import { downloadRoiPdf } from '@/lib/pdf-report';
import {
  AnalysisMode,
  FacilityROICalculatorInputs,
  FacilityROIResults,
  PortfolioROIResults,
  ScenarioAssumptions,
  ScenarioKey,
  StrategicOpportunitySummary,
  TrackedInputField,
} from '@/lib/roi-types';

interface PrintableReportProps {
  onClose: () => void;
  mode: AnalysisMode;
  facilityInputs: FacilityROICalculatorInputs;
  facilityResults: FacilityROIResults;
  portfolioResults?: PortfolioROIResults;
  scenario: ScenarioKey;
  assumptions: ScenarioAssumptions;
  proposerName: string;
  proposerTitle: string;
  targetAudience: string;
  strategicOpportunity: StrategicOpportunitySummary;
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

const percent = (value: number | null) =>
  value === null ? 'N/A' : `${value.toFixed(0)}%`;

const CRITICAL_FIELDS: TrackedInputField[] = [
  'headcount',
  'hourlyRate',
  'overtimeHoursPerYear',
  'weeklyAgencyHours',
  'agencyHourlyRate',
  'pbjHoursPerMonth',
  'softwareCost',
];

export default function PrintableReport({
  onClose,
  mode,
  facilityInputs,
  facilityResults,
  portfolioResults,
  scenario,
  assumptions,
  proposerName,
  proposerTitle,
  targetAudience,
  strategicOpportunity,
}: PrintableReportProps) {
  const [includeAppendix, setIncludeAppendix] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const isPortfolio = mode === 'portfolio' && Boolean(portfolioResults);

  const baseBenefit = isPortfolio
    ? portfolioResults!.totalPaycorInfluencedBenefit
    : facilityResults.totalPaycorInfluencedBenefit;
  const investment = isPortfolio
    ? portfolioResults!.totalSoftwareCost
    : facilityResults.softwareCost;
  const netBenefit = isPortfolio
    ? portfolioResults!.netAnnualBenefit
    : facilityResults.netAnnualBenefit;
  const roi = isPortfolio ? portfolioResults!.roiPercent : facilityResults.roiPercent;
  const benefitCostRatio = isPortfolio
    ? portfolioResults!.benefitCostRatio
    : facilityResults.benefitCostRatio;
  const payback = isPortfolio
    ? portfolioResults!.paybackMonths
    : facilityResults.paybackMonths;
  const breakEven = isPortfolio
    ? portfolioResults!.breakEvenRealizationRate
    : facilityResults.breakEvenRealizationRate;
  const currentBurden = isPortfolio
    ? portfolioResults!.totalDirectOpportunity
    : facilityResults.totalDirectOpportunity;
  const headcount = isPortfolio ? portfolioResults!.totalHeadcount : facilityInputs.headcount;
  const investmentPepm = headcount > 0 ? investment / headcount / 12 : 0;

  const blockingInputs = useMemo(() => {
    if (isPortfolio) {
      return portfolioResults!.facilities.flatMap(({ inputs }) =>
        CRITICAL_FIELDS.filter((field) => {
          const record = inputs.inputSources?.[field];
          return !record || record.source === 'default' || record.reportable === false;
        }).map((field) => `${inputs.facilityName}: ${formatInputField(field)}`),
      );
    }
    return CRITICAL_FIELDS.filter((field) => {
      const record = facilityInputs.inputSources?.[field];
      return !record || record.source === 'default' || record.reportable === false;
    }).map(formatInputField);
  }, [facilityInputs, isPortfolio, portfolioResults]);

  const customerReady = blockingInputs.length === 0;
  const narrative = buildExecutiveNarrative({
    mode,
    targetAudience,
    facility: facilityInputs,
    facilityResults,
    portfolioResults,
    strategicOpportunity,
    customerReady,
  });

  const title = isPortfolio
    ? `${facilityInputs.chainName || 'Portfolio'} — ${portfolioResults!.facilityCount}-Facility Business Case`
    : `Facility Business Case — ${facilityInputs.facilityName}`;
  const location = [
    facilityInputs.facilityAddress,
    facilityInputs.city,
    facilityInputs.state,
    facilityInputs.zip,
  ]
    .filter(Boolean)
    .join(' · ');

  const handleDownload = async () => {
    setDownloading(true);
    setDownloadError('');
    try {
      await downloadRoiPdf({
        mode,
        facilityInputs,
        facilityResults,
        portfolioResults,
        scenario,
        assumptions,
        proposerName,
        proposerTitle,
        targetAudience,
        strategicOpportunity,
        includeAppendix,
        customerReady,
      });
    } catch (error) {
      console.error('PDF download failed', error);
      setDownloadError(
        'The PDF could not be generated. You can still use Print and choose Save as PDF.',
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4 print:static print:bg-white print:p-0">
      <div className="relative mx-auto max-w-5xl rounded-2xl bg-white shadow-2xl print:rounded-none print:shadow-none">
        <div className="sticky top-0 z-20 flex flex-col justify-between gap-3 border-b border-slate-200 bg-white p-4 md:flex-row md:items-center print:hidden">
          <div>
            <h2 className="font-extrabold text-paycor-charcoal">Customer-Facing ROI Report</h2>
            <p className="text-xs text-paycor-medium-grey">
              Download the official PDF or use browser printing as a fallback. Drafts remain clearly labeled until key inputs are confirmed.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-[10px] font-bold text-paycor-medium-grey">
              <input
                type="checkbox"
                checked={includeAppendix}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setIncludeAppendix(event.target.checked)}
              />
              Include methodology appendix
            </label>
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center gap-2 rounded-xl bg-paycor-orange px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              {downloading ? 'Generating…' : 'Download PDF'}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-paycor-medium-grey"
            >
              <Printer className="h-4 w-4" /> Print
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 p-2 text-paycor-medium-grey"
              aria-label="Close report"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <main className="relative p-8 text-paycor-charcoal md:p-12 print:p-8">
          {downloadError && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 print:hidden">
              {downloadError}
            </div>
          )}

          <header className="mb-8 break-inside-avoid border-b-4 border-paycor-orange pb-6">
            <div className="flex items-start justify-between gap-5">
              <img
                src="/paycor-empowering-leaders.jpg"
                alt="Paycor — Empowering Leaders"
                className="w-[140px] h-auto object-contain"
              />
              {!customerReady && (
                <span className="rounded-md border border-amber-300 bg-amber-50 px-3 py-1 text-[9px] font-extrabold uppercase tracking-wider text-amber-800">
                  Planning Draft
                </span>
              )}
            </div>
            <p className="mt-5 text-[11px] font-extrabold uppercase tracking-[0.2em] text-paycor-orange">
              Long-Term Care &amp; Skilled Nursing Operational ROI
            </p>
            <h1 className="mt-2 text-3xl font-black">{title}</h1>
            {!isPortfolio && location && (
              <p className="mt-2 text-xs text-paycor-grey">{location}</p>
            )}
            {facilityInputs.chainName && (
              <p className="mt-1 text-xs text-paycor-grey">
                Chain / operator: {facilityInputs.chainName}
              </p>
            )}
            <p className="mt-3 text-sm text-paycor-medium-grey">
              Prepared for {targetAudience || 'Executive Leadership'} by{' '}
              {proposerName || 'Paycor Consultant'}
              {proposerTitle ? `, ${proposerTitle}` : ''}.
            </p>
            <p className="mt-2 text-xs text-paycor-grey">
              Scenario: <strong className="capitalize">{scenario}</strong>. Base ROI includes direct and Paycor-influenced financial value only. Strategic business context is disclosed separately.
            </p>
          </header>

          {!customerReady && (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 break-inside-avoid">
              <strong>Planning draft:</strong> these material fields remain unconfirmed or internal-only: {blockingInputs.join(', ')}.
            </div>
          )}

          <section className="mb-8 break-inside-avoid">
            <h2 className="mb-4 text-lg font-extrabold">Executive Summary</h2>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-base font-black">{narrative.headline}</h3>
              <div className="mt-4 space-y-3">
                {narrative.paragraphs.map((paragraph, index) => {
                  const [label, ...rest] = paragraph.split(': ');
                  return (
                    <div key={index} className="grid gap-1 md:grid-cols-[170px_1fr]">
                      <p className="text-[10px] font-extrabold text-paycor-charcoal">{label}</p>
                      <p className="text-[10px] leading-relaxed text-paycor-medium-grey">
                        {rest.join(': ')}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="mb-8 break-inside-avoid">
            <h2 className="mb-4 text-lg font-extrabold">Executive Financial Summary</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Metric label="Annual Paycor-Influenced Benefit" value={money(baseBenefit)} />
              <Metric label="Annual Investment" value={money(investment)} />
              <Metric label="Net Annual Benefit" value={money(netBenefit)} />
              <Metric label="Net ROI" value={percent(roi)} />
              <Metric
                label="Benefit-Cost Ratio"
                value={benefitCostRatio === null ? 'N/A' : `${benefitCostRatio.toFixed(2)}x`}
              />
              <Metric
                label="Payback Period"
                value={payback === null ? 'N/A' : `${payback.toFixed(1)} months`}
              />
              <Metric
                label="Break-Even Realization"
                value={breakEven === null ? 'N/A' : `${(breakEven * 100).toFixed(0)}%`}
              />
              <Metric
                label="Investment per Employee"
                value={investmentPepm > 0 ? `${money(investmentPepm)} PEPM` : 'N/A'}
              />
            </div>
          </section>

          <section className="mb-8 break-inside-avoid">
            <h2 className="mb-4 text-lg font-extrabold">Status Quo Run Rate</h2>
            <div className="grid gap-3 md:grid-cols-3">
              <RunRate
                label="Current modeled operating burden"
                annual={currentBurden}
                monthly={currentBurden / 12}
                note="Gross modeled burden. Not all of this amount is addressable by Paycor."
              />
              <RunRate
                label="Paycor-influenced opportunity"
                annual={baseBenefit}
                monthly={baseBenefit / 12}
                emphasis
                note="The amount used in the base ROI calculation after improvement and contribution assumptions."
              />
              <RunRate
                label="Modeled cost of delay"
                annual={baseBenefit}
                monthly={baseBenefit / 12}
                note="Opportunity not yet pursued, subject to validation and successful implementation and adoption."
              />
            </div>
          </section>

          {!isPortfolio ? (
            <>
              <section className="mb-8 break-inside-avoid">
                <h2 className="mb-4 text-lg font-extrabold">Facility Operational Profile</h2>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <Metric label="Headcount" value={number(facilityInputs.headcount)} />
                  <Metric label="Turnover Rate Used" value={`${number(facilityInputs.turnoverRate, 1)}%`} />
                  <Metric label="Eligible Workforce" value={number(facilityResults.turnoverEligibleHeadcount)} />
                  <Metric label="Turnover Events / Year" value={number(facilityResults.estimatedTurnoverEvents, 1)} />
                  <Metric label="Cost per Turnover" value={money(facilityResults.estimatedCostPerTurnover)} />
                  <Metric label="Overtime Hours / Week" value={number(facilityResults.weeklyOvertimeHours, 1)} />
                  <Metric label="Overtime FTE Equivalent" value={number(facilityResults.overtimeFteEquivalent, 2)} />
                  <Metric label="Agency FTE Equivalent" value={number(facilityResults.agencyFteEquivalent, 2)} />
                </div>
                <p className="mt-3 text-[9px] leading-relaxed text-paycor-grey">
                  Turnover model: {facilityResults.turnoverPopulationLabel}; {facilityResults.turnoverCostMethodLabel}. Estimated turnover burden equals {number(facilityResults.estimatedTurnoverEvents, 1)} events × {money(facilityResults.estimatedCostPerTurnover)} per event.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="mb-4 text-lg font-extrabold">Value Build Detail</h2>
                <div className="space-y-3">
                  {facilityResults.valueLineItems
                    .filter((item) => item.includedInBaseROI)
                    .map((item) => (
                      <ValueDriverCard key={item.key} item={item} />
                    ))}
                </div>
              </section>
            </>
          ) : (
            <section className="mb-8">
              <h2 className="mb-4 text-lg font-extrabold">Portfolio Facilities</h2>
              <div className="space-y-3">
                {portfolioResults!.facilities.map(({ inputs, results }) => (
                  <div key={inputs.id || inputs.ccn || inputs.facilityName} className="break-inside-avoid rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                      <div>
                        <h3 className="text-xs font-extrabold">{inputs.facilityName}</h3>
                        <p className="mt-1 text-[9px] text-paycor-grey">
                          {[inputs.city, inputs.state].filter(Boolean).join(', ') || 'Location not reported'}
                          {inputs.chainName ? ` · ${inputs.chainName}` : ''}
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-right">
                        <MiniMetric label="Annual Benefit" value={money(results.totalPaycorInfluencedBenefit)} />
                        <MiniMetric label="Investment" value={money(results.softwareCost)} />
                        <MiniMetric label="Net ROI" value={percent(results.roiPercent)} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="mb-8">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-extrabold">Strategic Business Context</h2>
              <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[8px] font-extrabold uppercase text-sky-700">
                Correlated
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[8px] font-extrabold uppercase text-slate-600">
                Outside Base ROI
              </span>
            </div>
            <p className="mb-4 text-[10px] leading-relaxed text-paycor-medium-grey">
              {strategicOpportunity.disclosure}
            </p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {strategicOpportunity.modules.map((module) => (
                <div key={module.key} className="break-inside-avoid rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xs font-extrabold">{module.title}</h3>
                      <p className="mt-1 text-[9px] text-paycor-grey">{module.statusLabel}</p>
                    </div>
                    {module.valueIncludedInRange && (
                      <strong className="shrink-0 text-xs text-paycor-orange">
                        {module.valueHigh > 0
                          ? `${money(module.valueLow)}–${money(module.valueHigh)}`
                          : 'Not monetized'}
                      </strong>
                    )}
                  </div>
                  <p className="mt-3 text-[10px] leading-relaxed text-paycor-medium-grey">
                    {module.narrative.replace(/→/g, 'to')}
                  </p>
                  <p className="mt-3 rounded-lg bg-slate-50 p-2 text-[8px] leading-relaxed text-paycor-grey">
                    Methodology: {module.methodology.replace(/→/g, 'to')}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-8 break-inside-avoid">
            <h2 className="mb-4 text-lg font-extrabold">Recommended Next Step</h2>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-[10px] leading-relaxed text-paycor-medium-grey">
              {narrative.nextStep}
            </div>
          </section>

          {includeAppendix && (
            <section className="break-before-page">
              <h2 className="mb-4 text-lg font-extrabold">Methodology Appendix</h2>
              <div className="space-y-3">
                {ASSUMPTION_DEFINITIONS.map((definition) => (
                  <div key={definition.key} className="break-inside-avoid rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-xs font-extrabold">{definition.label}</h3>
                      <strong className="text-xs text-paycor-orange">
                        {definition.isPercentage
                          ? `${(assumptions[definition.key] * 100).toFixed(1)}%`
                          : assumptions[definition.key]}
                      </strong>
                    </div>
                    <p className="mt-2 text-[9px] leading-relaxed text-paycor-medium-grey">
                      {definition.description}
                    </p>
                    <p className="mt-2 text-[8px] text-paycor-grey">
                      Evidence: {definition.evidenceClass} · Source context: {definition.sourceLabel}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <footer className="mt-10 border-t border-slate-200 pt-4 text-[8px] leading-relaxed text-paycor-grey">
            This analysis is an estimate for business-planning purposes and is not a guarantee of savings, clinical results, CMS ratings, reimbursement, or census. Strategic values remain separate from base ROI. Methodology version 7.0.
          </footer>
        </main>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="break-inside-avoid rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-[8px] font-bold uppercase tracking-wider text-paycor-grey">{label}</p>
      <p className="mt-1 text-base font-black">{value}</p>
    </div>
  );
}

function RunRate({
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
    <div className={`break-inside-avoid rounded-xl border p-4 ${emphasis ? 'border-paycor-orange/30 bg-paycor-orange/5' : 'border-slate-200 bg-slate-50'}`}>
      <p className="text-[8px] font-bold uppercase tracking-wider text-paycor-grey">{label}</p>
      <p className={`mt-2 text-lg font-black ${emphasis ? 'text-paycor-orange' : ''}`}>{money(annual)} / year</p>
      <p className="mt-1 text-sm font-bold text-paycor-medium-grey">{money(monthly)} / month</p>
      <p className="mt-3 text-[8px] leading-relaxed text-paycor-grey">{note}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[7px] font-bold uppercase tracking-wider text-paycor-grey">{label}</p>
      <p className="mt-1 text-xs font-extrabold">{value}</p>
    </div>
  );
}

function ValueDriverCard({
  item,
}: {
  item: FacilityROIResults['valueLineItems'][number];
}) {
  return (
    <div className="break-inside-avoid rounded-xl border border-slate-200 p-4">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xs font-extrabold">{item.label}</h3>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[7px] font-extrabold uppercase text-paycor-medium-grey">
              {item.evidenceClass}
            </span>
          </div>
          <p className="mt-2 text-[9px] leading-relaxed text-paycor-medium-grey">
            {item.explanation}
          </p>
        </div>
        <strong className="shrink-0 text-lg text-paycor-orange">{money(item.annualBenefit)}</strong>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3 rounded-xl bg-slate-50 p-3">
        <MiniMetric label="Current Burden" value={item.currentBurden > 0 ? money(item.currentBurden) : '—'} />
        <MiniMetric label="Modeled Improvement" value={`${(item.attainableImprovement * 100).toFixed(0)}%`} />
        <MiniMetric label="Paycor Contribution" value={`${(item.paycorAttribution * 100).toFixed(0)}%`} />
      </div>
    </div>
  );
}

function formatInputField(field: TrackedInputField): string {
  return field
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\bpbj\b/i, 'PBJ')
    .replace(/\bRN\b/i, 'RN')
    .replace(/^./, (character) => character.toUpperCase());
}
