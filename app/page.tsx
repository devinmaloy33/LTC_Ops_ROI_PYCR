'use client';

import React, { useCallback, useMemo, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileDown,
  Layers3,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import SheetsSync from '@/components/sheets-sync';
import AssumptionsPanel from '@/components/assumptions-panel';
import PrintableReport from '@/components/printable-report';
import {
  calculateFacilityROI,
  calculatePortfolioROI,
} from '@/lib/calculations';
import { getScenarioAssumptions } from '@/lib/assumptions';
import {
  AnalysisMode,
  FacilityROICalculatorInputs,
  ScenarioAssumptions,
  ScenarioKey,
  TechCostMap,
} from '@/lib/roi-types';

const DEFAULT_TECH_COSTS: TechCostMap = {
  recruiting: 0,
  onboarding: 0,
  payroll: 0,
  time: 0,
  scheduling: 0,
  benefits: 0,
  lms: 0,
  performance: 0,
  other: 0,
};

const DEFAULT_FACILITY: FacilityROICalculatorInputs = {
  facilityName: 'Silver Maple Health & Rehab',
  headcount: 120,
  hourlyRate: 32,
  adminLoadedHourlyRate: 38,
  turnoverRate: 55,
  rnTurnover: 45,
  adminTurnover: 'No',
  overallRating: 3,
  staffingRating: 3,
  healthInspectionRating: 3,
  qualityMeasureRating: 3,
  projectedOverallRating: 4,
  healthDeficiencies: 0,
  totalFines: 0,
  pbjHoursPerMonth: 12,
  overtimeHoursPerYear: 4800,
  weeklyAgencyHours: 40,
  agencyHourlyRate: 67,
  annualMedicarePartARevenue: 4_500_000,
  avgMonthlyResidentValue: 8750,
  referralsPerStarLevel: 2,
  censusResidentsProtected: 0,
  complianceRiskExposure: 0,
  softwareCost: 0,
  currentTechCosts: { ...DEFAULT_TECH_COSTS },
};

const money = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value || 0);

const number = (value: number, digits = 0) =>
  new Intl.NumberFormat('en-US', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value || 0);

function createFacilityId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `facility-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function LtcRoiCalculator() {
  const [activeStep, setActiveStep] = useState(1);
  const [mode, setMode] = useState<AnalysisMode>('facility');
  const [facility, setFacility] = useState<FacilityROICalculatorInputs>(DEFAULT_FACILITY);
  const [portfolio, setPortfolio] = useState<FacilityROICalculatorInputs[]>([]);
  const [scenario, setScenario] = useState<ScenarioKey>('expected');
  const [assumptions, setAssumptions] = useState<ScenarioAssumptions>(
    getScenarioAssumptions('expected'),
  );
  const [showReport, setShowReport] = useState(false);
  const [proposerName, setProposerName] = useState('Paycor Consultant');
  const [proposerTitle, setProposerTitle] = useState('Long-Term Care Advisor');
  const [targetAudience, setTargetAudience] = useState('Executive Leadership Team');
  const [aiStrategy, setAiStrategy] = useState('');
  const [aiStrategyLoading, setAiStrategyLoading] = useState(false);
  const [aiStrategyError, setAiStrategyError] = useState('');

  const facilityResults = useMemo(
    () => calculateFacilityROI(facility, assumptions),
    [facility, assumptions],
  );

  const portfolioResults = useMemo(
    () => calculatePortfolioROI(portfolio, assumptions),
    [portfolio, assumptions],
  );

  const effectivePortfolioResults = useMemo(
    () =>
      portfolio.length > 0
        ? portfolioResults
        : calculatePortfolioROI([facility], assumptions),
    [portfolio, portfolioResults, facility, assumptions],
  );

  const updateFacility = <K extends keyof FacilityROICalculatorInputs>(
    key: K,
    value: FacilityROICalculatorInputs[K],
  ) => {
    setFacility((current) => ({ ...current, [key]: value }));
  };

  const updateTechCost = (key: keyof TechCostMap, value: number) => {
    setFacility((current) => ({
      ...current,
      currentTechCosts: {
        ...current.currentTechCosts,
        [key]: value,
      },
    }));
  };

  const handleApplyCmsMetrics = useCallback((metrics: any) => {
    setFacility((current) => {
      const overallRating = Number(
        metrics.overallRating ?? metrics.baselineVbpStars ?? current.overallRating,
      );
      return {
        ...current,
        ccn: metrics.ccn ?? current.ccn,
        state: metrics.state ?? current.state,
        chainName: metrics.chainName ?? current.chainName,
        facilityName: metrics.facilityName ?? current.facilityName,
        headcount: metrics.headcount ?? current.headcount,
        hourlyRate: metrics.hourlyRate ?? current.hourlyRate,
        turnoverRate: metrics.turnoverRate ?? current.turnoverRate,
        rnTurnover: metrics.rnTurnover ?? current.rnTurnover,
        adminTurnover: metrics.adminTurnover ?? current.adminTurnover,
        totalFines: metrics.totalFines ?? current.totalFines,
        healthDeficiencies:
          metrics.healthDeficiencies ?? current.healthDeficiencies,
        overallRating,
        staffingRating: Number(metrics.staffingRating ?? current.staffingRating),
        projectedOverallRating: Number(
          metrics.projectedOverallRating ??
            metrics.projectedVbpStars ??
            Math.min(5, overallRating + 1),
        ),
        annualMedicarePartARevenue:
          metrics.annualMedicarePartARevenue ??
          metrics.annualMedicareBilling ??
          current.annualMedicarePartARevenue,
      };
    });
  }, []);

  const addOrUpdatePortfolioFacility = () => {
    const normalized = {
      ...facility,
      id: facility.id || createFacilityId(),
      currentTechCosts: { ...facility.currentTechCosts },
    };
    setPortfolio((current) => {
      const index = current.findIndex((item) => item.id === normalized.id);
      if (index === -1) return [...current, normalized];
      return current.map((item) => (item.id === normalized.id ? normalized : item));
    });
    setFacility(normalized);
  };

  const startNewPortfolioFacility = () => {
    setFacility({
      ...DEFAULT_FACILITY,
      id: createFacilityId(),
      facilityName: 'New Facility',
      currentTechCosts: { ...DEFAULT_TECH_COSTS },
    });
    setActiveStep(1);
  };

  const editPortfolioFacility = (selected: FacilityROICalculatorInputs) => {
    setFacility({
      ...selected,
      currentTechCosts: { ...selected.currentTechCosts },
    });
    setActiveStep(1);
  };

  const removePortfolioFacility = (id?: string) => {
    setPortfolio((current) => current.filter((item) => item.id !== id));
  };

  const handleScenarioChange = (
    nextScenario: ScenarioKey,
    nextAssumptions: ScenarioAssumptions,
  ) => {
    setScenario(nextScenario);
    setAssumptions(nextAssumptions);
  };

  const generateAiStrategyReport = async () => {
    setAiStrategyLoading(true);
    setAiStrategyError('');
    try {
      const response = await fetch('/api/advisory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          facility,
          facilityResults,
          portfolioResults: effectivePortfolioResults,
          portfolio: portfolio.length > 0 ? portfolio : [facility],
          scenario,
          assumptions,
          proposerName,
          proposerTitle,
          targetAudience,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unable to generate advisory report.');
      }
      setAiStrategy(data.advisory || '');
    } catch (error: any) {
      setAiStrategyError(error.message || 'Unable to generate advisory report.');
    } finally {
      setAiStrategyLoading(false);
    }
  };

  const summary =
    mode === 'portfolio'
      ? {
          directOpportunity: effectivePortfolioResults.totalDirectOpportunity,
          baseBenefit: effectivePortfolioResults.totalPaycorInfluencedBenefit,
          investment: effectivePortfolioResults.totalSoftwareCost,
          netBenefit: effectivePortfolioResults.netAnnualBenefit,
          roi: effectivePortfolioResults.roiPercent,
          payback: effectivePortfolioResults.paybackMonths,
          benefitCostRatio: effectivePortfolioResults.benefitCostRatio,
          strategicUpside: effectivePortfolioResults.totalStrategicUpside,
        }
      : {
          directOpportunity: facilityResults.totalDirectOpportunity,
          baseBenefit: facilityResults.totalPaycorInfluencedBenefit,
          investment: facilityResults.softwareCost,
          netBenefit: facilityResults.netAnnualBenefit,
          roi: facilityResults.roiPercent,
          payback: facilityResults.paybackMonths,
          benefitCostRatio: facilityResults.benefitCostRatio,
          strategicUpside: facilityResults.totalStrategicUpside,
        };

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 text-paycor-charcoal">
      <header className="bg-white border border-paycor-border-grey rounded-2xl shadow-sm p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase font-extrabold tracking-wider text-white bg-paycor-charcoal px-2.5 py-1 rounded-md">
              Consultant-Led Value Engineering
            </span>
            <h1 className="text-2xl md:text-3xl font-black mt-3">
              Long-Term Care &amp; Skilled Nursing{' '}
              <span className="text-paycor-orange">Operational ROI</span>
            </h1>
            <p className="text-xs text-paycor-medium-grey mt-2 max-w-3xl leading-relaxed">
              Quantify current workforce leakage, isolate Paycor-influenced financial value, and disclose correlated CMS, census and SNF VBP upside separately.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowReport(true)}
            className="inline-flex items-center justify-center gap-2 bg-paycor-orange hover:bg-paycor-red-orange text-white font-extrabold px-4 py-3 rounded-xl text-xs shadow-sm cursor-pointer transition-colors"
          >
            <FileDown className="w-4 h-4" /> Customer Report
          </button>
        </div>

        <div className="mt-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-t border-slate-100 pt-5">
          <div className="inline-flex bg-slate-100 p-1 rounded-xl self-start">
            <button
              type="button"
              onClick={() => setMode('facility')}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                mode === 'facility'
                  ? 'bg-white text-paycor-orange shadow-sm'
                  : 'text-paycor-medium-grey'
              }`}
            >
              <Building2 className="w-4 h-4" /> Single Facility
            </button>
            <button
              type="button"
              onClick={() => setMode('portfolio')}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                mode === 'portfolio'
                  ? 'bg-white text-paycor-orange shadow-sm'
                  : 'text-paycor-medium-grey'
              }`}
            >
              <Layers3 className="w-4 h-4" /> Portfolio
            </button>
          </div>
          {mode === 'portfolio' && (
            <div className="text-xs text-paycor-medium-grey">
              <strong>{portfolio.length}</strong> saved facilit{portfolio.length === 1 ? 'y' : 'ies'} ·{' '}
              <strong>{number(effectivePortfolioResults.totalHeadcount)}</strong> total employees
            </div>
          )}
        </div>
      </header>

      <nav className="grid grid-cols-3 bg-white border border-paycor-border-grey rounded-2xl p-2 mb-6 shadow-sm">
        {[
          [1, 'Diagnostic Inputs'],
          [2, 'Value & Assumptions'],
          [3, 'Executive Case'],
        ].map(([step, label]) => (
          <button
            key={step}
            type="button"
            onClick={() => setActiveStep(Number(step))}
            className={`py-3 rounded-xl text-[11px] md:text-xs font-extrabold transition cursor-pointer ${
              activeStep === step
                ? 'bg-paycor-orange text-white shadow-sm'
                : 'text-paycor-medium-grey hover:bg-slate-50'
            }`}
          >
            <span className="hidden sm:inline">{step}. </span>
            {label}
          </button>
        ))}
      </nav>

      {activeStep === 1 && (
        <div className="space-y-6 animate-fadeIn">
          <SheetsSync
            onApplyMetrics={handleApplyCmsMetrics}
            currentValues={{
              facilityName: facility.facilityName,
              headcount: facility.headcount,
              hourlyRate: facility.hourlyRate,
              turnoverRate: facility.turnoverRate,
              pbjHours: facility.pbjHoursPerMonth,
              overtimeHours: facility.overtimeHoursPerYear,
              annualMedicareBilling: facility.annualMedicarePartARevenue,
            }}
          />

          <section className="bg-white border border-paycor-border-grey rounded-2xl shadow-sm p-6">
            <SectionHeader
              icon={<Building2 className="w-4 h-4" />}
              title="Facility and CMS Quality Profile"
              description="CMS Five-Star ratings are separate from the SNF Value-Based Purchasing program."
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <TextInput
                label="Facility Name"
                value={facility.facilityName}
                onChange={(value) => updateFacility('facilityName', value)}
                className="sm:col-span-2"
              />
              <StarSelect
                label="CMS Overall Rating"
                value={facility.overallRating}
                onChange={(value) => updateFacility('overallRating', value)}
              />
              <StarSelect
                label="CMS Staffing Rating"
                value={facility.staffingRating}
                onChange={(value) => updateFacility('staffingRating', value)}
              />
              <StarSelect
                label="Health Inspection Rating"
                value={facility.healthInspectionRating || 3}
                onChange={(value) => updateFacility('healthInspectionRating', value)}
              />
              <StarSelect
                label="Quality Measure Rating"
                value={facility.qualityMeasureRating || 3}
                onChange={(value) => updateFacility('qualityMeasureRating', value)}
              />
              <StarSelect
                label="Modeled Overall Rating"
                value={facility.projectedOverallRating}
                onChange={(value) => updateFacility('projectedOverallRating', value)}
              />
              <NumberInput
                label="Health Deficiencies"
                value={facility.healthDeficiencies}
                onChange={(value) => updateFacility('healthDeficiencies', value)}
              />
              <NumberInput
                label="CMS Fines / Penalties"
                value={facility.totalFines}
                prefix="$"
                onChange={(value) => updateFacility('totalFines', value)}
              />
            </div>
          </section>

          <section className="bg-white border border-paycor-border-grey rounded-2xl shadow-sm p-6">
            <SectionHeader
              icon={<Users className="w-4 h-4" />}
              title="Workforce and Premium Labor Drivers"
              description="Use prospect actuals whenever available. CMS-derived estimates should be confirmed during discovery."
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <NumberInput label="Total Headcount" value={facility.headcount} onChange={(value) => updateFacility('headcount', value)} />
              <NumberInput label="Average Hourly Rate" value={facility.hourlyRate} prefix="$" onChange={(value) => updateFacility('hourlyRate', value)} />
              <NumberInput label="Admin Loaded Hourly Rate" value={facility.adminLoadedHourlyRate} prefix="$" onChange={(value) => updateFacility('adminLoadedHourlyRate', value)} />
              <NumberInput label="General Turnover" value={facility.turnoverRate} suffix="%" onChange={(value) => updateFacility('turnoverRate', value)} />
              <NumberInput label="RN Turnover" value={facility.rnTurnover} suffix="%" onChange={(value) => updateFacility('rnTurnover', value)} />
              <NumberInput label="PBJ Prep Hours / Month" value={facility.pbjHoursPerMonth} onChange={(value) => updateFacility('pbjHoursPerMonth', value)} />
              <NumberInput label="Annual Overtime Hours" value={facility.overtimeHoursPerYear} onChange={(value) => updateFacility('overtimeHoursPerYear', value)} />
              <NumberInput label="Weekly Agency Hours" value={facility.weeklyAgencyHours} onChange={(value) => updateFacility('weeklyAgencyHours', value)} />
              <NumberInput label="Agency Hourly Rate" value={facility.agencyHourlyRate} prefix="$" onChange={(value) => updateFacility('agencyHourlyRate', value)} />
            </div>
          </section>

          <section className="bg-white border border-paycor-border-grey rounded-2xl shadow-sm p-6">
            <SectionHeader
              icon={<BarChart3 className="w-4 h-4" />}
              title="Financial and Strategic Inputs"
              description="Strategic values are displayed separately from the base ROI calculation."
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <NumberInput label="Annual Medicare FFS Part A Revenue" value={facility.annualMedicarePartARevenue} prefix="$" onChange={(value) => updateFacility('annualMedicarePartARevenue', value)} />
              <NumberInput label="Average Monthly Resident Value" value={facility.avgMonthlyResidentValue} prefix="$" onChange={(value) => updateFacility('avgMonthlyResidentValue', value)} />
              <NumberInput label="Referrals per Rating Level" value={facility.referralsPerStarLevel} onChange={(value) => updateFacility('referralsPerStarLevel', value)} />
              <NumberInput label="Residents at Risk / Protected" value={facility.censusResidentsProtected} onChange={(value) => updateFacility('censusResidentsProtected', value)} />
              <NumberInput label="Prospect-Estimated Compliance Exposure" value={facility.complianceRiskExposure} prefix="$" onChange={(value) => updateFacility('complianceRiskExposure', value)} />
              <NumberInput label="Annual Paycor Investment" value={facility.softwareCost} prefix="$" onChange={(value) => updateFacility('softwareCost', value)} />
            </div>
          </section>

          <section className="bg-white border border-paycor-border-grey rounded-2xl shadow-sm p-6">
            <SectionHeader
              icon={<Layers3 className="w-4 h-4" />}
              title="Retirable Technology Spend"
              description="Enter recurring costs only for tools that can realistically be eliminated or not renewed."
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(Object.keys(facility.currentTechCosts) as (keyof TechCostMap)[]).map((key) => (
                <NumberInput
                  key={key}
                  label={techCostLabels[key]}
                  value={facility.currentTechCosts[key]}
                  prefix="$"
                  onChange={(value) => updateTechCost(key, value)}
                />
              ))}
            </div>
            <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-paycor-grey">Current Technology Spend</p>
                <p className="text-xl font-black mt-1">{money(facilityResults.totalCurrentTechSpend)}</p>
              </div>
              <p className="text-[10px] text-paycor-medium-grey max-w-lg text-right leading-relaxed">
                This amount is not deducted from the software investment. The confirmed retirable portion is counted once as annual avoided cost.
              </p>
            </div>
          </section>

          {mode === 'portfolio' && (
            <section className="bg-white border border-paycor-border-grey rounded-2xl shadow-sm p-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-extrabold">Portfolio Facility Builder</h2>
                  <p className="text-[11px] text-paycor-medium-grey mt-1">
                    Save this facility, then start another. Each location keeps its own operating inputs and investment.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={addOrUpdatePortfolioFacility} className="inline-flex items-center gap-2 bg-paycor-charcoal hover:bg-black text-white px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-colors">
                    <CheckCircle2 className="w-4 h-4" /> {facility.id ? 'Update Facility' : 'Add Facility'}
                  </button>
                  <button type="button" onClick={startNewPortfolioFacility} className="inline-flex items-center gap-2 border border-slate-200 hover:bg-slate-50 px-4 py-2.5 rounded-xl text-xs font-bold text-paycor-medium-grey cursor-pointer transition-colors">
                    <Plus className="w-4 h-4" /> New Facility
                  </button>
                </div>
              </div>

              {portfolio.length > 0 && (
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="text-left bg-slate-50">
                      <tr>
                        <th className="p-2 border-b border-slate-200 font-extrabold text-paycor-charcoal">Facility</th>
                        <th className="p-2 border-b border-slate-200 font-extrabold text-paycor-charcoal">Headcount</th>
                        <th className="p-2 border-b border-slate-200 font-extrabold text-paycor-charcoal">Turnover</th>
                        <th className="p-2 border-b border-slate-200 font-extrabold text-paycor-charcoal">Investment</th>
                        <th className="p-2 border-b border-slate-200 font-extrabold text-paycor-charcoal text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {portfolio.map((item) => (
                        <tr key={item.id} className="border-t border-slate-100">
                          <td className="p-2 font-bold">{item.facilityName}</td>
                          <td className="p-2">{number(item.headcount)}</td>
                          <td className="p-2">{number(item.turnoverRate, 1)}%</td>
                          <td className="p-2">{money(item.softwareCost)}</td>
                          <td className="p-2">
                            <div className="flex justify-end gap-1">
                              <button type="button" onClick={() => editPortfolioFacility(item)} className="px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-[10px] font-bold cursor-pointer transition-colors">Edit</button>
                              <button type="button" onClick={() => removePortfolioFacility(item.id)} className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 cursor-pointer transition-colors" aria-label={`Remove ${item.facilityName}`}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          <div className="flex justify-end">
            <button type="button" onClick={() => setActiveStep(2)} className="inline-flex items-center gap-2 bg-paycor-orange hover:bg-paycor-red-orange text-white font-extrabold px-5 py-3 rounded-xl text-xs cursor-pointer transition-all shadow-sm">
              Continue to Value Model <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {activeStep === 2 && (
        <div className="space-y-6 animate-fadeIn">
          <AssumptionsPanel
            scenario={scenario}
            assumptions={assumptions}
            onScenarioChange={handleScenarioChange}
            onAssumptionsChange={setAssumptions}
          />

          <section className="bg-white border border-paycor-border-grey rounded-2xl shadow-sm p-6">
            <SectionHeader
              icon={<BarChart3 className="w-4 h-4" />}
              title={mode === 'portfolio' ? 'Portfolio Value Reconciliation' : 'Facility Value Reconciliation'}
              description="The base business case uses direct and Paycor-influenced outcomes. Strategic correlated value remains outside base ROI."
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <SummaryCard label="Current Direct Opportunity" value={money(summary.directOpportunity)} />
              <SummaryCard label="Paycor-Influenced Benefit" value={money(summary.baseBenefit)} emphasis />
              <SummaryCard label="Annual Investment" value={money(summary.investment)} />
              <SummaryCard label="Net Annual Benefit" value={money(summary.netBenefit)} positive={summary.netBenefit >= 0} />
            </div>

            {mode === 'facility' ? (
              <div className="space-y-3">
                {facilityResults.valueLineItems.map((item) => {
                  const max = Math.max(item.currentBurden, item.annualBenefit, 1);
                  return (
                    <div key={item.key} className="border border-slate-200 rounded-2xl p-4 bg-white hover:border-paycor-orange/30 transition-colors">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                        <div className="max-w-3xl">
                          <div className="flex items-center flex-wrap gap-2">
                            <h3 className="text-xs font-extrabold text-paycor-charcoal">{item.label}</h3>
                            <EvidenceBadge evidence={item.evidenceClass} />
                            {!item.includedInBaseROI && (
                              <span className="text-[9px] uppercase font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-150">Outside base ROI</span>
                            )}
                          </div>
                          <p className="text-[10px] text-paycor-medium-grey mt-1 leading-relaxed">{item.explanation}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[9px] uppercase font-bold text-paycor-grey">Annual Benefit</p>
                          <p className="text-lg font-black text-paycor-orange">{money(item.annualBenefit)}</p>
                        </div>
                      </div>
                      {item.currentBurden > 0 && (
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-[10px]">
                          <div>
                            <div className="flex justify-between mb-1 text-paycor-medium-grey"><span>Current burden</span><strong>{money(item.currentBurden)}</strong></div>
                            <div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-paycor-charcoal" style={{ width: `${Math.min(100, (item.currentBurden / max) * 100)}%` }} /></div>
                          </div>
                          <div>
                            <div className="flex justify-between mb-1 text-paycor-medium-grey"><span>Modeled benefit</span><strong>{money(item.annualBenefit)}</strong></div>
                            <div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-paycor-orange" style={{ width: `${Math.min(100, (item.annualBenefit / max) * 100)}%` }} /></div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border border-slate-200">
                  <thead className="bg-slate-50 text-left">
                    <tr>
                      <th className="p-3 border-b border-slate-200 font-extrabold text-paycor-charcoal">Facility</th>
                      <th className="p-3 border-b border-slate-200 font-extrabold text-paycor-charcoal">Direct Opportunity</th>
                      <th className="p-3 border-b border-slate-200 font-extrabold text-paycor-charcoal">Paycor-Influenced Benefit</th>
                      <th className="p-3 border-b border-slate-200 font-extrabold text-paycor-charcoal">Net Benefit</th>
                      <th className="p-3 border-b border-slate-200 font-extrabold text-paycor-charcoal">ROI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {effectivePortfolioResults.facilities.map(({ inputs, results }) => (
                      <tr key={inputs.id || inputs.facilityName} className="border-t border-slate-150 hover:bg-slate-50/40">
                        <td className="p-3 font-bold text-paycor-charcoal">{inputs.facilityName}</td>
                        <td className="p-3 text-paycor-charcoal">{money(results.totalDirectOpportunity)}</td>
                        <td className="p-3 text-paycor-charcoal">{money(results.totalPaycorInfluencedBenefit)}</td>
                        <td className="p-3 text-paycor-charcoal">{money(results.netAnnualBenefit)}</td>
                        <td className="p-3 font-extrabold text-paycor-orange">{results.roiPercent === null ? 'N/A' : `${number(results.roiPercent)}%`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className="flex items-center justify-between">
            <button type="button" onClick={() => setActiveStep(1)} className="inline-flex items-center gap-2 text-xs font-bold text-paycor-medium-grey cursor-pointer hover:text-paycor-orange">
              <ChevronLeft className="w-4 h-4" /> Back to Inputs
            </button>
            <button type="button" onClick={() => setActiveStep(3)} className="inline-flex items-center gap-2 bg-paycor-orange hover:bg-paycor-red-orange text-white font-extrabold px-5 py-3 rounded-xl text-xs cursor-pointer transition-all shadow-sm">
              Build Executive Case <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {activeStep === 3 && (
        <div className="space-y-6 animate-fadeIn">
          <section className="bg-white border border-paycor-border-grey rounded-2xl shadow-sm p-6">
            <SectionHeader
              icon={<CheckCircle2 className="w-4 h-4" />}
              title="Board-Ready Financial Case"
              description="Net ROI is calculated as (Paycor-influenced annual benefit − annual investment) ÷ annual investment."
            />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <ExecutiveMetric label="Paycor-Influenced Benefit" value={money(summary.baseBenefit)} />
              <ExecutiveMetric label="Net Annual Benefit" value={money(summary.netBenefit)} />
              <ExecutiveMetric label="Net ROI" value={summary.roi === null ? 'N/A' : `${number(summary.roi)}%`} />
              <ExecutiveMetric label="Benefit-Cost Ratio" value={summary.benefitCostRatio === null ? 'N/A' : `${summary.benefitCostRatio.toFixed(2)}x`} />
              <ExecutiveMetric label="Payback Period" value={summary.payback === null ? 'N/A' : `${summary.payback.toFixed(1)} months`} />
              <ExecutiveMetric label="Strategic Upside — Separate" value={money(summary.strategicUpside)} />
              <ExecutiveMetric label="Potential Enterprise Value" value={money(summary.baseBenefit + summary.strategicUpside)} />
              <ExecutiveMetric label="Scenario" value={scenario} capitalize />
            </div>
          </section>

          <section className="bg-white border border-paycor-border-grey rounded-2xl shadow-sm p-6">
            <SectionHeader
              icon={<FileDown className="w-4 h-4" />}
              title="Customer Report Configuration"
              description="These details appear in the printable, customer-facing report and AI advisory."
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <TextInput label="Prepared By" value={proposerName} onChange={setProposerName} />
              <TextInput label="Title" value={proposerTitle} onChange={setProposerTitle} />
              <TextInput label="Target Audience" value={targetAudience} onChange={setTargetAudience} />
            </div>
            <button type="button" onClick={() => setShowReport(true)} className="mt-5 inline-flex items-center gap-2 bg-paycor-charcoal hover:bg-black text-white font-bold px-4 py-2.5 rounded-xl text-xs cursor-pointer transition-colors shadow-sm">
              <FileDown className="w-4 h-4" /> Open Customer Report
            </button>
          </section>

          <section className="bg-white border border-paycor-border-grey rounded-2xl shadow-sm p-6">
            <SectionHeader
              icon={<Sparkles className="w-4 h-4" />}
              title="AI Strategic Advisory"
              description="Gemini explains the verified calculations. The prompt prohibits invented savings, clinical claims, CMS outcomes or guarantees."
            />
            {!aiStrategy && !aiStrategyLoading && (
              <button type="button" onClick={generateAiStrategyReport} className="inline-flex items-center gap-2 bg-paycor-orange hover:bg-paycor-red-orange text-white font-extrabold px-4 py-2.5 rounded-xl text-xs cursor-pointer transition-all shadow-sm">
                <Sparkles className="w-4 h-4" /> Generate Advisory
              </button>
            )}
            {aiStrategyLoading && (
              <div className="flex items-center gap-2 text-xs text-paycor-medium-grey">
                <RefreshCw className="w-4 h-4 animate-spin text-paycor-orange" /> Generating an evidence-aware advisory from the calculated results…
              </div>
            )}
            {aiStrategyError && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {aiStrategyError}
              </div>
            )}
            {aiStrategy && (
              <div className="space-y-4">
                <div className="max-h-[520px] overflow-y-auto bg-slate-50 border border-slate-200 rounded-2xl p-6 prose prose-sm max-w-none">
                  <ReactMarkdown>{aiStrategy}</ReactMarkdown>
                </div>
                <button type="button" onClick={generateAiStrategyReport} className="inline-flex items-center gap-2 border border-slate-200 hover:bg-slate-50 px-3 py-2 rounded-xl text-xs font-bold text-paycor-medium-grey cursor-pointer transition-colors">
                  <RefreshCw className="w-3.5 h-3.5" /> Regenerate Using Current Inputs
                </button>
              </div>
            )}
          </section>

          <div className="flex items-center justify-between">
            <button type="button" onClick={() => setActiveStep(2)} className="inline-flex items-center gap-2 text-xs font-bold text-paycor-medium-grey cursor-pointer hover:text-paycor-orange">
              <ChevronLeft className="w-4 h-4" /> Back to Value Model
            </button>
          </div>
        </div>
      )}

      {showReport && (
        <PrintableReport
          onClose={() => setShowReport(false)}
          mode={mode}
          facilityInputs={facility}
          facilityResults={facilityResults}
          portfolioResults={effectivePortfolioResults}
          scenario={scenario}
          assumptions={assumptions}
          proposerName={proposerName}
          proposerTitle={proposerTitle}
          targetAudience={targetAudience}
        />
      )}
    </main>
  );
}

const techCostLabels: Record<keyof TechCostMap, string> = {
  recruiting: 'Recruiting / ATS',
  onboarding: 'Onboarding / I-9',
  payroll: 'Core HR / Payroll',
  time: 'Time & Attendance',
  scheduling: 'Staff Scheduling',
  benefits: 'Benefits Administration',
  lms: 'Learning Management',
  performance: 'Performance Management',
  other: 'Other HR Technology',
};

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-2.5 border-b border-slate-100 pb-4 mb-5">
      <div className="text-paycor-orange mt-0.5">{icon}</div>
      <div>
        <h2 className="text-sm font-extrabold text-paycor-charcoal">{title}</h2>
        <p className="text-[10px] text-paycor-medium-grey mt-1 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  className = '',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="block text-[10px] uppercase tracking-wider font-bold text-paycor-grey mb-1.5">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-paycor-charcoal outline-none focus:border-paycor-orange transition-colors"
      />
    </label>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  prefix,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <label>
      <span className="block text-[10px] uppercase tracking-wider font-bold text-paycor-grey mb-1.5">{label}</span>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-2.5 text-sm text-paycor-grey">{prefix}</span>}
        <input
          type="number"
          min="0"
          step="any"
          value={Number.isFinite(value) ? value : 0}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => onChange(Number(event.target.value) || 0)}
          className={`w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 text-sm text-paycor-charcoal outline-none focus:border-paycor-orange transition-colors ${prefix ? 'pl-7 pr-3' : 'px-3'} ${suffix ? 'pr-8' : ''}`}
        />
        {suffix && <span className="absolute right-3 top-2.5 text-sm text-paycor-grey">{suffix}</span>}
      </div>
    </label>
  );
}

function StarSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label>
      <span className="block text-[10px] uppercase tracking-wider font-bold text-paycor-grey mb-1.5">{label}</span>
      <select
        value={value}
        onChange={(event: React.ChangeEvent<HTMLSelectElement>) => onChange(Number(event.target.value))}
        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-paycor-charcoal outline-none focus:border-paycor-orange cursor-pointer transition-colors"
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <option key={star} value={star}>{star}.0 Stars</option>
        ))}
      </select>
    </label>
  );
}

function SummaryCard({
  label,
  value,
  emphasis = false,
  positive,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  positive?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${emphasis ? 'bg-paycor-orange/5 border-paycor-orange/30 shadow-sm' : 'bg-slate-50 border-slate-200'}`}>
      <p className="text-[9px] uppercase tracking-wider font-bold text-paycor-grey">{label}</p>
      <p className={`text-xl font-black mt-1 ${emphasis ? 'text-paycor-orange' : positive === false ? 'text-red-600' : positive === true ? 'text-paycor-green' : 'text-paycor-charcoal'}`}>{value}</p>
    </div>
  );
}

function ExecutiveMetric({
  label,
  value,
  capitalize = false,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 shadow-sm">
      <p className="text-[9px] uppercase tracking-wider font-bold text-paycor-grey">{label}</p>
      <p className={`text-xl font-black mt-1 text-paycor-charcoal ${capitalize ? 'capitalize' : ''}`}>{value}</p>
    </div>
  );
}

function EvidenceBadge({ evidence }: { evidence: 'direct' | 'influenced' | 'correlated' }) {
  const styles = {
    direct: 'bg-emerald-50 text-emerald-700 border-emerald-250',
    influenced: 'bg-amber-50 text-amber-700 border-amber-250',
    correlated: 'bg-sky-50 text-sky-700 border-sky-250',
  };
  return <span className={`border rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${styles[evidence]}`}>{evidence}</span>;
}
