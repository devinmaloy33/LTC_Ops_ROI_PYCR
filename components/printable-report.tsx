'use client';

import React from 'react';
import { Printer, X } from 'lucide-react';
import { ASSUMPTION_DEFINITIONS } from '@/lib/assumptions';
import {
  AnalysisMode,
  FacilityROICalculatorInputs,
  FacilityROIResults,
  PortfolioROIResults,
  ScenarioAssumptions,
  ScenarioKey,
  StrategicOpportunitySummary,
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

const percent = (value: number | null) =>
  value === null ? 'N/A' : `${value.toFixed(0)}%`;

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
  const isPortfolio = mode === 'portfolio' && portfolioResults;
  const title = isPortfolio
    ? `Portfolio Business Case — ${portfolioResults.facilityCount} Facilities`
    : `Facility Business Case — ${facilityInputs.facilityName}`;

  const baseBenefit = isPortfolio
    ? portfolioResults.totalPaycorInfluencedBenefit
    : facilityResults.totalPaycorInfluencedBenefit;
  const investment = isPortfolio
    ? portfolioResults.totalSoftwareCost
    : facilityResults.inputs.softwareCost;
  const netBenefit = isPortfolio
    ? portfolioResults.netAnnualBenefit
    : facilityResults.netAnnualBenefit;
  const roi = isPortfolio ? portfolioResults.roiPercent : facilityResults.roiPercent;
  const benefitCostRatio = isPortfolio
    ? portfolioResults.benefitCostRatio
    : facilityResults.benefitCostRatio;
  const payback = isPortfolio
    ? portfolioResults.paybackMonths
    : facilityResults.paybackMonths;

  const sourceEntries = Object.entries(facilityInputs.inputSources || {}).sort(
    ([left], [right]) => left.localeCompare(right),
  );
  const portfolioSourceCounts = isPortfolio
    ? portfolioResults.facilities.reduce<Record<string, number>>((counts, item) => {
        Object.values(item.inputs.inputSources || {}).forEach((record) => {
          counts[record.source] = (counts[record.source] || 0) + 1;
        });
        return counts;
      }, {})
    : {};

  const criticalFields = [
    'headcount',
    'hourlyRate',
    'overtimeHoursPerYear',
    'weeklyAgencyHours',
    'agencyHourlyRate',
    'pbjHoursPerMonth',
    'softwareCost',
  ];
  const blockingInputs = isPortfolio
    ? portfolioResults.facilities.flatMap(({ inputs }) =>
        criticalFields
          .filter((field) => {
            const record = inputs.inputSources?.[field as keyof typeof inputs.inputSources];
            return record?.source === 'default' || record?.reportable === false;
          })
          .map((field) => `${inputs.facilityName}: ${formatInputField(field)}`),
      )
    : criticalFields.filter((field) => {
        const record = facilityInputs.inputSources?.[field as keyof typeof facilityInputs.inputSources];
        return record?.source === 'default' || record?.reportable === false;
      }).map(formatInputField);
  const customerReady = blockingInputs.length === 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 p-4 overflow-y-auto print:static print:bg-white print:p-0">
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-2xl print:shadow-none print:rounded-none">
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 p-4 flex items-center justify-between print:hidden">
          <div>
            <h2 className="font-extrabold text-paycor-charcoal">Customer-Facing ROI Report</h2>
            <p className="text-xs text-paycor-medium-grey">Review assumptions before printing or saving as PDF.</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => customerReady && window.print()}
              disabled={!customerReady}
              title={customerReady ? 'Print or save the customer-ready report' : 'Resolve draft or internal-only inputs before printing'}
              className={`inline-flex items-center gap-2 font-bold px-4 py-2 rounded-xl text-xs ${customerReady ? 'bg-paycor-orange text-white' : 'bg-slate-200 text-slate-500 cursor-not-allowed'}`}
            >
              <Printer className="w-4 h-4" /> Print / Save PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl border border-slate-200 text-paycor-medium-grey"
              aria-label="Close report"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <main className="p-8 md:p-12 text-paycor-charcoal print:p-8">
          {!customerReady && (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 print:hidden">
              <strong>Draft report:</strong> printing is disabled until these material fields are confirmed or replaced with customer-reportable estimates: {blockingInputs.join(', ')}.
            </div>
          )}
          <header className="border-b-4 border-paycor-orange pb-6 mb-8">
            <p className="text-[11px] uppercase tracking-[0.2em] font-extrabold text-paycor-orange">
              Long-Term Care &amp; Skilled Nursing Operational ROI
            </p>
            <h1 className="text-3xl font-black mt-2">{title}</h1>
            <p className="text-sm text-paycor-medium-grey mt-3">
              Prepared for {targetAudience || 'Executive Leadership'} by {proposerName || 'Paycor Consultant'}
              {proposerTitle ? `, ${proposerTitle}` : ''}.
            </p>
            <p className="text-xs text-paycor-grey mt-2">
              Scenario: <strong className="capitalize">{scenario}</strong>. Base ROI includes direct and Paycor-influenced financial value only. Correlated strategic upside is disclosed separately.
            </p>
          </header>

          <section className="mb-8">
            <h2 className="text-lg font-extrabold mb-4">Executive Financial Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
              <Metric label="Strategic Opportunity (Separate)" value={strategicOpportunity.valueHigh > 0 ? `${money(strategicOpportunity.valueLow)}–${money(strategicOpportunity.valueHigh)}` : 'Not yet monetized'} />
              <Metric label="Potential Enterprise Context" value={strategicOpportunity.valueHigh > 0 ? `${money(baseBenefit + strategicOpportunity.valueLow)}–${money(baseBenefit + strategicOpportunity.valueHigh)}` : money(baseBenefit)} />
            </div>
          </section>

          <section className="mb-8 break-inside-avoid">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h2 className="text-lg font-extrabold">Strategic Downstream Opportunity</h2>
              <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[8px] uppercase font-extrabold text-sky-700">Correlated</span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[8px] uppercase font-extrabold text-slate-600">Outside Base ROI</span>
            </div>
            <p className="text-[10px] text-paycor-medium-grey leading-relaxed mb-4">
              {strategicOpportunity.disclosure}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {strategicOpportunity.modules.map((module) => (
                <div key={module.key} className="border border-slate-200 rounded-xl p-4 break-inside-avoid">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xs font-extrabold">{module.title}</h3>
                      <p className="text-[9px] text-paycor-grey mt-1">{module.statusLabel}</p>
                    </div>
                    {module.valueIncludedInRange && (
                      <strong className="text-xs text-paycor-orange shrink-0">
                        {module.valueHigh > 0 ? `${money(module.valueLow)}–${money(module.valueHigh)}` : 'Not monetized'}
                      </strong>
                    )}
                  </div>
                  <p className="text-[10px] mt-3 leading-relaxed">{module.currentCondition}</p>
                  <p className="text-[10px] text-paycor-medium-grey mt-2 leading-relaxed">{module.narrative}</p>
                  <p className="text-[9px] text-paycor-grey mt-2 leading-relaxed"><strong>Method:</strong> {module.methodology}</p>
                </div>
              ))}
            </div>
          </section>

          {isPortfolio ? (
            <section className="mb-8">
              <h2 className="text-lg font-extrabold mb-4">Portfolio Detail</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-left">
                      <Th>Facility</Th>
                      <Th>Headcount</Th>
                      <Th>Current Opportunity</Th>
                      <Th>Paycor-Influenced Benefit</Th>
                      <Th>Investment</Th>
                      <Th>Net ROI</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolioResults.facilities.map(({ inputs, results }) => (
                      <tr key={inputs.id || inputs.ccn || inputs.facilityName} className="border-b border-slate-200">
                        <Td>{inputs.facilityName}</Td>
                        <Td>{Math.round(inputs.headcount).toLocaleString()}</Td>
                        <Td>{money(results.totalDirectOpportunity)}</Td>
                        <Td>{money(results.totalPaycorInfluencedBenefit)}</Td>
                        <Td>{money(results.inputs.softwareCost)}</Td>
                        <Td>{percent(results.roiPercent)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : (
            <>
              <section className="mb-8">
                <h2 className="text-lg font-extrabold mb-4">Facility Profile</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <Profile label="Headcount" value={Math.round(facilityInputs.headcount).toLocaleString()} />
                  <Profile label="Turnover" value={`${facilityInputs.turnoverRate.toFixed(1)}%`} />
                  <Profile label="CMS Overall Rating" value={`${facilityInputs.overallRating.toFixed(1)} Stars`} />
                  <Profile label="CMS Staffing Rating" value={`${facilityInputs.staffingRating.toFixed(1)} Stars`} />
                  <Profile label="Annual Overtime Hours" value={Math.round(facilityInputs.overtimeHoursPerYear).toLocaleString()} />
                  <Profile label="Weekly Agency Hours" value={Math.round(facilityInputs.weeklyAgencyHours).toLocaleString()} />
                  <Profile label="PBJ Prep Hours / Month" value={facilityInputs.pbjHoursPerMonth.toFixed(1)} />
                  <Profile label="Health Deficiencies" value={Math.round(facilityInputs.healthDeficiencies).toLocaleString()} />
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-lg font-extrabold mb-4">Value Build</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-left">
                        <Th>Value Driver</Th>
                        <Th>Evidence</Th>
                        <Th>Current Burden</Th>
                        <Th>Attainable Change</Th>
                        <Th>Paycor Attribution</Th>
                        <Th>Annual Benefit</Th>
                        <Th>Base ROI?</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {facilityResults.valueLineItems.filter((item) => item.includedInBaseROI).map((item) => (
                        <tr key={item.key} className="border-b border-slate-200 align-top">
                          <Td>
                            <strong>{item.label}</strong>
                            <p className="text-[10px] text-paycor-grey mt-1 leading-relaxed">{item.explanation}</p>
                          </Td>
                          <Td className="capitalize">{item.evidenceClass}</Td>
                          <Td>{item.currentBurden > 0 ? money(item.currentBurden) : '—'}</Td>
                          <Td>{item.attainableImprovement > 0 ? `${(item.attainableImprovement * 100).toFixed(1)}%` : '—'}</Td>
                          <Td>{item.paycorAttribution > 0 ? `${(item.paycorAttribution * 100).toFixed(1)}%` : '—'}</Td>
                          <Td>{money(item.annualBenefit)}</Td>
                          <Td>{item.includedInBaseROI ? 'Yes' : 'No'}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}

          <section className="mb-8">
            <h2 className="text-lg font-extrabold mb-4">Input Data Provenance</h2>
            {isPortfolio ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                {Object.entries(portfolioSourceCounts).map(([source, count]) => (
                  <Profile key={source} label={`${source} fields`} value={count.toLocaleString()} />
                ))}
                {Object.keys(portfolioSourceCounts).length === 0 && (
                  <p className="text-paycor-grey col-span-full">No source metadata was recorded.</p>
                )}
              </div>
            ) : sourceEntries.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-left">
                      <Th>Input</Th>
                      <Th>Source Type</Th>
                      <Th>Source / Context</Th>
                      <Th>Retrieved</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {sourceEntries.map(([field, record]) => (
                      <tr key={field} className="border-b border-slate-200 align-top">
                        <Td>{formatInputField(field)}</Td>
                        <Td className="capitalize">{record.source}</Td>
                        <Td>
                          {record.label}
                          {record.datasetId ? ` (Dataset ${record.datasetId})` : ''}
                          {record.confidence ? <p className="text-[9px] text-paycor-grey mt-1 capitalize">Confidence: {record.confidence}</p> : null}
                          {record.method ? <p className="text-[9px] text-paycor-grey mt-1">Method: {record.method}</p> : null}
                          {record.note ? <p className="text-[9px] text-paycor-grey mt-1">{record.note}</p> : null}
                        </Td>
                        <Td>{record.retrievedAt ? new Date(record.retrievedAt).toLocaleDateString() : '—'}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-paycor-grey">No source metadata was recorded for these inputs.</p>
            )}
            <p className="text-[9px] text-paycor-grey mt-3 leading-relaxed">
              CMS-reported values are imported only when present in the source record. Missing CMS
              values are not replaced with national averages. Employee headcount, compensation,
              labor utilization, technology investment and Medicare Part A revenue require
              prospect confirmation.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-extrabold mb-4">Methodology &amp; Assumptions</h2>
            <div className="space-y-3">
              {ASSUMPTION_DEFINITIONS.map((definition) => (
                <div key={definition.key} className="border border-slate-200 rounded-xl p-3 break-inside-avoid">
                  <div className="flex justify-between gap-4 text-xs">
                    <strong>{definition.label}</strong>
                    <span className="font-bold text-paycor-orange">
                      {(assumptions[definition.key] * 100).toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-[10px] text-paycor-medium-grey mt-1 leading-relaxed">{definition.description}</p>
                  <p className="text-[9px] text-paycor-grey mt-1">
                    Evidence: {definition.evidenceClass}. Source context: {definition.sourceLabel}.
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="border-t border-slate-200 pt-5 text-[10px] leading-relaxed text-paycor-grey">
            <p>
              <strong>Important:</strong> This analysis is an estimate for business-planning purposes and is not a guarantee of savings, clinical results, CMS ratings, reimbursement or census. Results depend on implementation, adoption, management execution, market conditions and the accuracy of prospect-provided data.
            </p>
            <p className="mt-2">
              CMS Five-Star ratings and the Skilled Nursing Facility Value-Based Purchasing Program are modeled separately. Strategic values are excluded from base ROI unless expressly identified otherwise.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}

function formatInputField(field: string) {
  return field
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (character) => character.toUpperCase());
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 break-inside-avoid">
      <p className="text-[9px] uppercase tracking-wider font-bold text-paycor-grey">{label}</p>
      <p className="text-lg font-black text-paycor-charcoal mt-1">{value}</p>
    </div>
  );
}

function Profile({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-slate-200 rounded-xl p-3">
      <p className="text-[9px] uppercase tracking-wider font-bold text-paycor-grey">{label}</p>
      <p className="font-extrabold text-paycor-charcoal mt-1">{value}</p>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="p-2 border border-slate-200 font-extrabold">{children}</th>;
}

function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`p-2 border border-slate-200 ${className}`}>{children}</td>;
}
