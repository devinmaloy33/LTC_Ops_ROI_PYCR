'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileDown,
  HelpCircle,
  Layers3,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  Users,
  WandSparkles,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import SheetsSync from '@/components/sheets-sync';
import AssumptionsPanel from '@/components/assumptions-panel';
import PrintableReport from '@/components/printable-report';
import EstimateAssistant from '@/components/estimate-assistant';
import StrategicOpportunityCard from '@/components/strategic-opportunity-card';
import TurnoverInsightsCard from '@/components/turnover-insights-card';
import OperationalTranslationCard from '@/components/operational-translation-card';
import FirstUseGuide from '@/components/first-use-guide';
import StatusQuoCard from '@/components/status-quo-card';
import { buildExecutiveNarrative } from '@/lib/executive-narrative';
import {
  calculateFacilityROI,
  calculatePortfolioROI,
} from '@/lib/calculations';
import { getScenarioAssumptions } from '@/lib/assumptions';
import {
  buildFacilityStrategicOpportunity,
  buildPortfolioStrategicOpportunity,
} from '@/lib/strategic-opportunity';
import {
  AnalysisMode,
  FacilityROICalculatorInputs,
  ScenarioAssumptions,
  ScenarioKey,
  TechCostMap,
  TrackedInputField,
  InputSourceRecord,
  FacilityInputSources,
  TechnologyInputSources,
} from '@/lib/roi-types';

const TARGET_AUDIENCE_OPTIONS = [
  'CEO / Owner',
  'CFO / Finance',
  'CHRO / HR',
  'COO / Administrator',
  'CIO / IT',
  'CNO / Clinical Leadership',
  'Executive Leadership Team',
  'Other',
] as const;

type TargetAudienceRole = (typeof TARGET_AUDIENCE_OPTIONS)[number];

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

const TRACKED_INPUT_FIELDS = new Set<TrackedInputField>([
  'facilityName', 'facilityAddress', 'city', 'state', 'zip', 'ccn', 'chainName', 'chainFacilities', 'certifiedBeds',
  'averageResidentsPerDay', 'reportedRnStaffingHprd',
  'reportedNurseAideStaffingHprd', 'reportedTotalNurseStaffingHprd',
  'headcount', 'hourlyRate',
  'adminLoadedHourlyRate', 'turnoverRate', 'rnTurnover', 'adminTurnover',
  'turnoverCostMethod', 'fixedTurnoverCost', 'turnoverPopulation', 'nursingWorkforceShare',
  'overallRating', 'staffingRating', 'healthInspectionRating',
  'qualityMeasureRating', 'projectedOverallRating', 'healthDeficiencies', 'totalFines',
  'pbjHoursPerMonth', 'overtimeHoursPerYear', 'weeklyAgencyHours',
  'agencyHourlyRate', 'annualMedicarePartARevenue', 'avgMonthlyResidentValue',
  'referralsPerStarLevel',
  'complianceRiskExposure', 'softwareCost',
]);

const PROSPECT_SOURCE: InputSourceRecord = {
  source: 'prospect',
  label: 'Prospect or consultant entered',
  note: 'Confirm during discovery and document the reporting period.',
};

const DEFAULT_FACILITY: FacilityROICalculatorInputs = {
  facilityName: 'Silver Maple Health & Rehab',
  headcount: 120,
  hourlyRate: 32,
  adminLoadedHourlyRate: 38,
  turnoverRate: 55,
  rnTurnover: 45,
  adminTurnover: 'No',
  turnoverCostMethod: 'compensation-percentage',
  fixedTurnoverCost: 0,
  turnoverPopulation: 'nursing',
  nursingWorkforceShare: 0.65,
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
  complianceRiskExposure: 0,
  softwareCost: 0,
  currentTechCosts: { ...DEFAULT_TECH_COSTS },
  strategicRefinements: {
    staffingConstrainedAdmissions: 'unknown',
    cmsObjective: 'unknown',
    activeComplianceRemediation: 'unknown',
  },
  inputSources: Object.fromEntries(
    Array.from(TRACKED_INPUT_FIELDS).map((field) => [
      field,
      {
        source: 'default',
        label: 'Illustrative default — replace or confirm during discovery',
      },
    ]),
  ) as FacilityROICalculatorInputs['inputSources'],
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
  const [showEstimateAssistant, setShowEstimateAssistant] = useState(false);
  const [showTechBreakdown, setShowTechBreakdown] = useState(false);
  const [showFirstUseGuide, setShowFirstUseGuide] = useState(false);
  const [proposerName, setProposerName] = useState('Paycor Consultant');
  const [proposerTitle, setProposerTitle] = useState('Long-Term Care Advisor');
  const [targetAudienceRole, setTargetAudienceRole] =
    useState<TargetAudienceRole>('Executive Leadership Team');
  const [customTargetAudience, setCustomTargetAudience] = useState('');
  const targetAudience =
    targetAudienceRole === 'Other'
      ? customTargetAudience.trim() || 'Other'
      : targetAudienceRole;
  const [aiStrategy, setAiStrategy] = useState('');
  const [aiStrategyLoading, setAiStrategyLoading] = useState(false);
  const [aiStrategyError, setAiStrategyError] = useState('');

  useEffect(() => {
    try {
      if (!window.localStorage.getItem('ltc-roi-walkthrough-seen')) {
        setShowFirstUseGuide(true);
      }
    } catch {
      // Local storage may be unavailable in restricted previews.
    }
  }, []);

  const closeFirstUseGuide = () => {
    setShowFirstUseGuide(false);
    try {
      window.localStorage.setItem('ltc-roi-walkthrough-seen', 'true');
    } catch {
      // The walkthrough remains dismissible even without storage access.
    }
  };

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

  const portfolioGroups = useMemo(() => {
    return (portfolio.length > 0 ? portfolio : [facility]).reduce<Record<string, FacilityROICalculatorInputs[]>>(
      (groups, item) => {
        const key = item.chainName?.trim() || 'Independent / Chain not reported';
        groups[key] = [...(groups[key] || []), item];
        return groups;
      },
      {},
    );
  }, [portfolio, facility]);

  const conservativeAssumptions = useMemo(
    () => getScenarioAssumptions('conservative'),
    [],
  );
  const opportunityAssumptions = useMemo(
    () => getScenarioAssumptions('opportunity'),
    [],
  );

  const strategicOpportunity = useMemo(() => {
    if (mode === 'facility') {
      return buildFacilityStrategicOpportunity({
        inputs: facility,
        conservative: calculateFacilityROI(facility, conservativeAssumptions),
        expected: facilityResults,
        opportunity: calculateFacilityROI(facility, opportunityAssumptions),
      });
    }

    const activeFacilities = portfolio.length > 0 ? portfolio : [facility];
    return buildPortfolioStrategicOpportunity(
      activeFacilities.map((inputs) => ({
        inputs,
        conservative: calculateFacilityROI(inputs, conservativeAssumptions),
        expected: calculateFacilityROI(inputs, assumptions),
        opportunity: calculateFacilityROI(inputs, opportunityAssumptions),
      })),
    );
  }, [
    mode,
    facility,
    facilityResults,
    portfolio,
    assumptions,
    conservativeAssumptions,
    opportunityAssumptions,
  ]);

  const updateFacility = <K extends keyof FacilityROICalculatorInputs>(
    key: K,
    value: FacilityROICalculatorInputs[K],
  ) => {
    setFacility((current) => {
      const next = { ...current, [key]: value };
      if (TRACKED_INPUT_FIELDS.has(key as TrackedInputField)) {
        next.inputSources = {
          ...current.inputSources,
          [key]: PROSPECT_SOURCE,
        };
      }
      return next;
    });
  };

  const updateTechCost = (key: keyof TechCostMap, value: number) => {
    setFacility((current) => ({
      ...current,
      currentTechCosts: {
        ...current.currentTechCosts,
        [key]: value,
      },
      technologySources: {
        ...current.technologySources,
        [key]: PROSPECT_SOURCE,
      },
    }));
  };

  const applyGuidedEstimates = useCallback((payload: {
    values: Partial<FacilityROICalculatorInputs>;
    inputSources: FacilityInputSources;
    technologyCosts?: TechCostMap;
    technologySources?: TechnologyInputSources;
  }) => {
    setFacility((current) => ({
      ...current,
      ...payload.values,
      inputSources: {
        ...current.inputSources,
        ...payload.inputSources,
      },
      currentTechCosts: payload.technologyCosts
        ? { ...payload.technologyCosts }
        : current.currentTechCosts,
      technologySources: payload.technologySources
        ? { ...current.technologySources, ...payload.technologySources }
        : current.technologySources,
    }));
  }, []);

  const handleApplyCmsMetrics = useCallback((metrics: any) => {
    setFacility((current) => {
      const overallRating = Number(
        metrics.overallRating ?? metrics.baselineVbpStars ?? current.overallRating,
      );
      return {
        ...current,
        ccn: metrics.ccn ?? current.ccn,
        facilityAddress: metrics.facilityAddress ?? current.facilityAddress,
        city: metrics.city ?? current.city,
        state: metrics.state ?? current.state,
        zip: metrics.zip ?? current.zip,
        chainName: metrics.chainName ?? current.chainName,
        chainFacilities: metrics.chainFacilities ?? current.chainFacilities,
        certifiedBeds: metrics.certifiedBeds ?? current.certifiedBeds,
        averageResidentsPerDay:
          metrics.averageResidentsPerDay ?? current.averageResidentsPerDay,
        reportedRnStaffingHprd:
          metrics.reportedRnStaffingHprd ?? current.reportedRnStaffingHprd,
        reportedNurseAideStaffingHprd:
          metrics.reportedNurseAideStaffingHprd ?? current.reportedNurseAideStaffingHprd,
        reportedTotalNurseStaffingHprd:
          metrics.reportedTotalNurseStaffingHprd ?? current.reportedTotalNurseStaffingHprd,
        inputSources: {
          ...current.inputSources,
          ...(metrics.inputSources || {}),
        },
        facilityName: metrics.facilityName ?? current.facilityName,
        headcount: metrics.headcount ?? current.headcount,
        hourlyRate: metrics.hourlyRate ?? current.hourlyRate,
        turnoverRate: metrics.turnoverRate ?? current.turnoverRate,
        turnoverPopulation: metrics.turnoverRate !== undefined && metrics.turnoverRate !== null
          ? 'nursing'
          : current.turnoverPopulation,
        rnTurnover: metrics.rnTurnover ?? current.rnTurnover,
        adminTurnover: metrics.adminTurnover ?? current.adminTurnover,
        totalFines: metrics.totalFines ?? current.totalFines,
        healthDeficiencies:
          metrics.healthDeficiencies ?? current.healthDeficiencies,
        overallRating,
        staffingRating: Number(metrics.staffingRating ?? current.staffingRating),
        healthInspectionRating: Number(
          metrics.healthInspectionRating ?? current.healthInspectionRating ?? 3,
        ),
        qualityMeasureRating: Number(
          metrics.qualityMeasureRating ?? current.qualityMeasureRating ?? 3,
        ),
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
  strategicRefinements: {
    staffingConstrainedAdmissions: 'unknown',
    cmsObjective: 'unknown',
    activeComplianceRemediation: 'unknown',
  },
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
          strategicOpportunity,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unable to generate advisory report.');
      }
      setAiStrategy(data.advisory || '');
    } catch (error: any) {
      console.error('AI advisory unavailable', error);
      setAiStrategyError('AI advisory is temporarily unavailable. The verified financial report remains available.');
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
          breakEven: effectivePortfolioResults.breakEvenRealizationRate,
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
          breakEven: facilityResults.breakEvenRealizationRate,
          strategicUpside: facilityResults.totalStrategicUpside,
        };

  const criticalFields: TrackedInputField[] = [
    'headcount',
    'hourlyRate',
    'overtimeHoursPerYear',
    'weeklyAgencyHours',
    'agencyHourlyRate',
    'pbjHoursPerMonth',
    'softwareCost',
  ];
  const sourceRecords = Object.values(facility.inputSources || {});
  const readinessCounts = sourceRecords.reduce<Record<string, number>>((counts, record) => {
    counts[record.source] = (counts[record.source] || 0) + 1;
    return counts;
  }, {});
  const readinessFacilities = mode === 'portfolio'
    ? (portfolio.length > 0 ? portfolio : [facility])
    : [facility];
  const blockingInputs = readinessFacilities.flatMap((item) =>
    criticalFields
      .filter((field) => {
        const record = item.inputSources?.[field];
        return !record || record.source === 'default' || record.reportable === false;
      })
      .map((field) => mode === 'portfolio' ? `${item.facilityName}: ${field}` : field),
  );
  const customerReady = blockingInputs.length === 0;
  const executiveNarrative = buildExecutiveNarrative({
    mode,
    targetAudience,
    facility,
    facilityResults,
    portfolioResults: effectivePortfolioResults,
    strategicOpportunity,
    customerReady,
  });

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
          <div className="flex flex-col items-start lg:items-end gap-3">
            <img
              src="/paycor-empowering-leaders.jpg"
              alt="Paycor — Empowering Leaders"
              className="w-[165px] h-auto object-contain"
            />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowFirstUseGuide(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-paycor-medium-grey hover:bg-slate-50"
              >
                <HelpCircle className="h-4 w-4" /> How it works
              </button>
              <button
                type="button"
                onClick={() => setShowReport(true)}
                className="inline-flex items-center justify-center gap-2 bg-paycor-orange hover:bg-paycor-red-orange text-white font-extrabold px-4 py-3 rounded-xl text-xs shadow-sm"
              >
                <FileDown className="w-4 h-4" /> Customer Report
              </button>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-t border-slate-100 pt-5">
          <div className="inline-flex bg-slate-100 p-1 rounded-xl self-start">
            <button
              type="button"
              onClick={() => setMode('facility')}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold ${
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
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold ${
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
            className={`py-3 rounded-xl text-[11px] md:text-xs font-extrabold transition ${
              activeStep === step
                ? 'bg-paycor-orange text-white'
                : 'text-paycor-medium-grey hover:bg-slate-50'
            }`}
          >
            <span className="hidden sm:inline">{step}. </span>
            {label}
          </button>
        ))}
      </nav>

      {activeStep === 1 && (
        <div className="space-y-6">
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

          <section className="bg-white border border-amber-200 rounded-2xl shadow-sm p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex gap-3">
              <div className="rounded-xl bg-amber-50 text-amber-700 p-2 shrink-0">
                <WandSparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold">Missing a discovery input?</h2>
                <p className="text-[10px] text-paycor-medium-grey mt-1 max-w-3xl leading-relaxed">
                  Generate a transparent planning estimate, preserve confirmed actuals, and carry the method and confidence into the customer report.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowEstimateAssistant(true)}
              className="inline-flex items-center justify-center gap-2 bg-paycor-charcoal text-white font-extrabold px-4 py-2.5 rounded-xl text-xs shrink-0"
            >
              <WandSparkles className="w-4 h-4" /> Estimate Unknown Inputs
            </button>
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-extrabold">Data Readiness</h2>
                <span className={`rounded-full border px-2 py-0.5 text-[8px] uppercase font-extrabold ${customerReady ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                  {customerReady ? 'Customer ready' : `${blockingInputs.length} key values to validate`}
                </span>
              </div>
              <p className="text-[10px] text-paycor-medium-grey mt-1">
                {readinessCounts.cms || 0} CMS fields · {readinessCounts.prospect || 0} prospect-confirmed · {readinessCounts.estimate || 0} estimates · {readinessCounts.default || 0} defaults
              </p>
            </div>
            {!customerReady && (
              <button type="button" onClick={() => setShowEstimateAssistant(true)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-paycor-medium-grey">
                Review unconfirmed values
              </button>
            )}
          </section>

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
                source={facility.inputSources?.facilityName}
              />
              <TextInput
                label="Chain / Operator"
                value={facility.chainName || ''}
                onChange={(value) => updateFacility('chainName', value)}
                className="sm:col-span-2"
                source={facility.inputSources?.chainName}
              />
              {(facility.facilityAddress || facility.city || facility.state) && (
                <div className="sm:col-span-2 lg:col-span-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[9px] uppercase tracking-wider font-bold text-paycor-grey">Facility location</p>
                  <p className="text-xs font-bold mt-1">{[facility.facilityAddress, facility.city, facility.state, facility.zip].filter(Boolean).join(' · ')}</p>
                  {facility.ccn && <p className="text-[9px] text-paycor-grey mt-1">CCN {facility.ccn}{facility.chainFacilities ? ` · ${facility.chainFacilities} CMS-reported facilities in chain` : ''}</p>}
                </div>
              )}
              <StarSelect
                label="CMS Overall Rating"
                value={facility.overallRating}
                onChange={(value) => updateFacility('overallRating', value)}
                source={facility.inputSources?.overallRating}
              />
              <StarSelect
                label="CMS Staffing Rating"
                value={facility.staffingRating}
                onChange={(value) => updateFacility('staffingRating', value)}
                source={facility.inputSources?.staffingRating}
              />
              <StarSelect
                label="Health Inspection Rating"
                value={facility.healthInspectionRating || 3}
                onChange={(value) => updateFacility('healthInspectionRating', value)}
                source={facility.inputSources?.healthInspectionRating}
              />
              <StarSelect
                label="Quality Measure Rating"
                value={facility.qualityMeasureRating || 3}
                onChange={(value) => updateFacility('qualityMeasureRating', value)}
                source={facility.inputSources?.qualityMeasureRating}
              />
              <NumberInput
                label="Health Deficiencies"
                value={facility.healthDeficiencies}
                onChange={(value) => updateFacility('healthDeficiencies', value)}
                source={facility.inputSources?.healthDeficiencies}
              />
              <NumberInput
                label="CMS Fines / Penalties"
                value={facility.totalFines}
                prefix="$"
                onChange={(value) => updateFacility('totalFines', value)}
                source={facility.inputSources?.totalFines}
              />
            </div>
          </section>

          <section className="bg-white border border-paycor-border-grey rounded-2xl shadow-sm p-6">
            <SectionHeader
              icon={<Users className="w-4 h-4" />}
              title="Workforce and Premium Labor Drivers"
              description="Use prospect actuals whenever available. CMS-reported values are labeled; other fields require prospect confirmation."
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <NumberInput label="Total Headcount" value={facility.headcount} source={facility.inputSources?.headcount} onChange={(value) => updateFacility('headcount', value)} />
              <NumberInput label="Average Hourly Rate" value={facility.hourlyRate} source={facility.inputSources?.hourlyRate} prefix="$" decimals={2} onChange={(value) => updateFacility('hourlyRate', value)} />
              <NumberInput label="Turnover Rate Used in Model" value={facility.turnoverRate} source={facility.inputSources?.turnoverRate} suffix="%" decimals={1} onChange={(value) => updateFacility('turnoverRate', value)} />
              <NumberInput label="CMS RN Turnover (Context)" value={facility.rnTurnover} source={facility.inputSources?.rnTurnover} suffix="%" decimals={1} onChange={(value) => updateFacility('rnTurnover', value)} />
              <NumberInput label="PBJ Prep Hours / Month" value={facility.pbjHoursPerMonth} source={facility.inputSources?.pbjHoursPerMonth} onChange={(value) => updateFacility('pbjHoursPerMonth', value)} />
              <NumberInput label="Annual Overtime Hours" value={facility.overtimeHoursPerYear} source={facility.inputSources?.overtimeHoursPerYear} onChange={(value) => updateFacility('overtimeHoursPerYear', value)} />
              <NumberInput label="Weekly Agency Hours" value={facility.weeklyAgencyHours} source={facility.inputSources?.weeklyAgencyHours} onChange={(value) => updateFacility('weeklyAgencyHours', value)} />
              <NumberInput label="Agency Hourly Rate" value={facility.agencyHourlyRate} source={facility.inputSources?.agencyHourlyRate} prefix="$" decimals={2} onChange={(value) => updateFacility('agencyHourlyRate', value)} />
            </div>
            <TurnoverInsightsCard
              inputs={facility}
              results={facilityResults}
              assumptions={assumptions}
              onInputChange={updateFacility}
              onAssumptionsChange={setAssumptions}
            />
            <OperationalTranslationCard inputs={facility} results={facilityResults} />
            <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <summary className="cursor-pointer text-[10px] font-extrabold text-paycor-medium-grey">Advanced PBJ costing input</summary>
              <div className="mt-3 max-w-sm">
                <NumberInput label="Admin Loaded Hourly Rate" value={facility.adminLoadedHourlyRate} source={facility.inputSources?.adminLoadedHourlyRate} prefix="$" decimals={2} onChange={(value) => updateFacility('adminLoadedHourlyRate', value)} />
              </div>
            </details>
          </section>

          <section className="bg-white border border-paycor-border-grey rounded-2xl shadow-sm p-6">
            <SectionHeader
              icon={<BarChart3 className="w-4 h-4" />}
              title="Investment Input"
              description="Keep the primary diagnostic flow focused. Strategic financial refinements appear beside the downstream scenario they affect."
            />
            <div className="grid grid-cols-1 md:grid-cols-[minmax(260px,360px)_1fr] gap-4 items-start">
              <NumberInput label="Annual Paycor Investment" value={facility.softwareCost} source={facility.inputSources?.softwareCost} prefix="$" onChange={(value) => updateFacility('softwareCost', value)} />
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-[10px] leading-relaxed text-paycor-medium-grey">
                When an approved quote is unavailable, the Guided Estimate Assistant uses <strong>$20 PEPM</strong> with no hidden annual base fee. Medicare Part A revenue, resident value, modeled rating, referral assumptions and compliance exposure are refined later inside the Strategic Downstream Opportunity card.
              </div>
            </div>
          </section>

          <section className="bg-white border border-paycor-border-grey rounded-2xl shadow-sm p-6">
            <SectionHeader
              icon={<Layers3 className="w-4 h-4" />}
              title="Technology Consolidation Opportunity"
              description="Estimate the fragmented stack at up to $33 PEPM, then include only systems that can realistically be consolidated, eliminated or not renewed."
            />
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-[9px] uppercase tracking-wider font-bold text-paycor-grey">Current technology stack estimate</p>
                <p className="text-2xl font-black mt-1">{money(facilityResults.totalCurrentTechSpend)}</p>
                <p className="text-[9px] text-paycor-grey mt-1">{facility.headcount > 0 ? `${money(facilityResults.totalCurrentTechSpend / facility.headcount / 12)} PEPM across enabled systems` : 'Headcount required for PEPM comparison'}</p>
              </div>
              <button type="button" onClick={() => setShowTechBreakdown((value) => !value)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-paycor-medium-grey">
                {showTechBreakdown ? 'Hide system breakdown' : 'View / edit system breakdown'}
              </button>
            </div>
            {showTechBreakdown && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
            )}
            <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold text-paycor-medium-grey">Technology Consolidation Baseline</p>
                <p className="text-xl font-black mt-1">{money(facilityResults.totalCurrentTechSpend)}</p>
              </div>
              <p className="text-[10px] text-paycor-medium-grey max-w-lg text-right">
                This amount is not deducted from the Paycor investment. The confirmed consolidatable portion is counted once as annual avoided cost based on the selected scenario.
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
                  <button type="button" onClick={addOrUpdatePortfolioFacility} className="inline-flex items-center gap-2 bg-paycor-charcoal text-white px-4 py-2.5 rounded-xl text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4" /> {facility.id ? 'Update Facility' : 'Add Facility'}
                  </button>
                  <button type="button" onClick={startNewPortfolioFacility} className="inline-flex items-center gap-2 border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold text-paycor-medium-grey">
                    <Plus className="w-4 h-4" /> New Facility
                  </button>
                </div>
              </div>

              {portfolio.length > 0 && (
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="text-left bg-slate-50">
                      <tr>
                        <th className="p-2">Facility</th>
                        <th className="p-2">Location</th>
                        <th className="p-2">Headcount</th>
                        <th className="p-2">Turnover</th>
                        <th className="p-2">Investment</th>
                        <th className="p-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(portfolioGroups).map(([chain, items]) => (
                        <React.Fragment key={chain}>
                          <tr className="border-t border-slate-200 bg-slate-50">
                            <td colSpan={6} className="p-2 text-[10px] font-extrabold text-paycor-medium-grey">{chain} · {items.length} facilit{items.length === 1 ? 'y' : 'ies'}</td>
                          </tr>
                          {items.map((item) => (
                            <tr key={item.id || item.ccn || item.facilityName} className="border-t border-slate-100">
                              <td className="p-2 font-bold">{item.facilityName}</td>
                              <td className="p-2 text-paycor-grey">{[item.city, item.state].filter(Boolean).join(', ') || '—'}</td>
                              <td className="p-2">{number(item.headcount)}</td>
                              <td className="p-2">{number(item.turnoverRate, 1)}%</td>
                              <td className="p-2">{money(item.softwareCost)}</td>
                              <td className="p-2">
                                <div className="flex justify-end gap-1">
                                  <button type="button" onClick={() => editPortfolioFacility(item)} className="px-2 py-1 rounded-lg border border-slate-200 text-[10px] font-bold">Edit</button>
                                  <button type="button" onClick={() => removePortfolioFacility(item.id)} className="p-1.5 rounded-lg text-red-600 hover:bg-red-50" aria-label={`Remove ${item.facilityName}`}>
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          <div className="flex justify-end">
            <button type="button" onClick={() => setActiveStep(2)} className="inline-flex items-center gap-2 bg-paycor-orange hover:bg-paycor-red-orange text-white font-extrabold px-5 py-3 rounded-xl text-xs">
              Continue to Value Model <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {activeStep === 2 && (
        <div className="space-y-6">
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
              <SummaryCard label="Current Modeled Operating Burden" value={money(summary.directOpportunity)} />
              <SummaryCard label="Paycor-Influenced Benefit" value={money(summary.baseBenefit)} emphasis />
              <SummaryCard label="Annual Investment" value={money(summary.investment)} />
              <SummaryCard label="Net Annual Benefit" value={money(summary.netBenefit)} positive={summary.netBenefit >= 0} />
            </div>

            {mode === 'facility' ? (
              <div className="space-y-3">
                {facilityResults.valueLineItems.filter((item) => item.includedInBaseROI).map((item) => {
                  const max = Math.max(item.currentBurden, item.annualBenefit, 1);
                  return (
                    <div key={item.key} className="border border-slate-200 rounded-2xl p-4">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                        <div className="max-w-3xl">
                          <div className="flex items-center gap-2">
                            <h3 className="text-xs font-extrabold">{item.label}</h3>
                            <EvidenceBadge evidence={item.evidenceClass} />
                            {!item.includedInBaseROI && (
                              <span className="text-[9px] uppercase font-bold text-sky-700">Outside base ROI</span>
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
                            <div className="flex justify-between mb-1"><span>Current burden</span><strong>{money(item.currentBurden)}</strong></div>
                            <div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-paycor-charcoal" style={{ width: `${Math.min(100, (item.currentBurden / max) * 100)}%` }} /></div>
                          </div>
                          <div>
                            <div className="flex justify-between mb-1"><span>Modeled benefit</span><strong>{money(item.annualBenefit)}</strong></div>
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
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-left">
                    <tr>
                      <th className="p-3">Facility</th>
                      <th className="p-3">Direct Opportunity</th>
                      <th className="p-3">Paycor-Influenced Benefit</th>
                      <th className="p-3">Net Benefit</th>
                      <th className="p-3">ROI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {effectivePortfolioResults.facilities.map(({ inputs, results }) => (
                      <tr key={inputs.id || inputs.facilityName} className="border-t border-slate-100">
                        <td className="p-3 font-bold">{inputs.facilityName}</td>
                        <td className="p-3">{money(results.totalDirectOpportunity)}</td>
                        <td className="p-3">{money(results.totalPaycorInfluencedBenefit)}</td>
                        <td className="p-3">{money(results.netAnnualBenefit)}</td>
                        <td className="p-3">{results.roiPercent === null ? 'N/A' : `${number(results.roiPercent)}%`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <StrategicOpportunityCard
            mode={mode}
            summary={strategicOpportunity}
            inputs={mode === 'facility' ? facility : undefined}
            refinements={facility.strategicRefinements}
            onStrategicInputChange={
              mode === 'facility'
                ? (field, value) => updateFacility(field, value)
                : undefined
            }
            onRefinementsChange={
              mode === 'facility'
                ? (strategicRefinements) =>
                    setFacility((current) => ({ ...current, strategicRefinements }))
                : undefined
            }
          />

          <div className="flex items-center justify-between">
            <button type="button" onClick={() => setActiveStep(1)} className="inline-flex items-center gap-2 text-xs font-bold text-paycor-medium-grey">
              <ChevronLeft className="w-4 h-4" /> Back to Inputs
            </button>
            <button type="button" onClick={() => setActiveStep(3)} className="inline-flex items-center gap-2 bg-paycor-orange hover:bg-paycor-red-orange text-white font-extrabold px-5 py-3 rounded-xl text-xs">
              Build Executive Case <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {activeStep === 3 && (
        <div className="space-y-6">
          <section className="bg-white border border-paycor-border-grey rounded-2xl shadow-sm p-6">
            <SectionHeader
              icon={<CheckCircle2 className="w-4 h-4" />}
              title="Executive Business Case Preview"
              description="Net ROI is calculated as (Paycor-influenced annual benefit − annual investment) ÷ annual investment."
            />
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 mb-5">
              <h3 className="text-sm font-extrabold">{executiveNarrative.headline}</h3>
              <div className="mt-3 space-y-2">
                {executiveNarrative.paragraphs.map((paragraph, index) => (
                  <p key={index} className="text-[11px] leading-relaxed text-paycor-medium-grey">{paragraph}</p>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <ExecutiveMetric label="Paycor-Influenced Benefit" value={money(summary.baseBenefit)} />
              <ExecutiveMetric label="Annual Investment" value={money(summary.investment)} />
              <ExecutiveMetric label="Net Annual Benefit" value={money(summary.netBenefit)} />
              <ExecutiveMetric label="Net ROI" value={summary.roi === null ? 'N/A' : `${number(summary.roi)}%`} />
              <ExecutiveMetric label="Benefit-Cost Ratio" value={summary.benefitCostRatio === null ? 'N/A' : `${summary.benefitCostRatio.toFixed(2)}x`} />
              <ExecutiveMetric label="Payback Period" value={summary.payback === null ? 'N/A' : `${summary.payback.toFixed(1)} months`} />
              <ExecutiveMetric label="Break-Even Realization" value={summary.breakEven === null ? 'N/A' : `${number(summary.breakEven * 100)}%`} />
              <ExecutiveMetric label="Strategic Opportunity — Separate" value={strategicOpportunity.valueHigh > 0 ? `${money(strategicOpportunity.valueLow)}–${money(strategicOpportunity.valueHigh)}` : 'Not yet monetized'} />
            </div>
          </section>

          <StatusQuoCard
            currentBurden={summary.directOpportunity}
            paycorInfluencedBenefit={summary.baseBenefit}
          />

          <section className="bg-white border border-paycor-border-grey rounded-2xl shadow-sm p-6">
            <SectionHeader
              icon={<FileDown className="w-4 h-4" />}
              title="Customer Report Configuration"
              description="These details appear in the printable, customer-facing report and AI advisory."
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <TextInput label="Prepared By" value={proposerName} onChange={setProposerName} />
              <TextInput label="Title" value={proposerTitle} onChange={setProposerTitle} />
              <label>
                <span className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-[11px] font-bold text-paycor-medium-grey">Target Audience Role</span>
                </span>
                <select
                  value={targetAudienceRole}
                  onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
                    setTargetAudienceRole(event.target.value as TargetAudienceRole)
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-paycor-orange"
                >
                  {TARGET_AUDIENCE_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              {targetAudienceRole === 'Other' && (
                <TextInput
                  label="Other Target Audience"
                  value={customTargetAudience}
                  onChange={setCustomTargetAudience}
                  className="md:col-span-3"
                />
              )}
            </div>
            <button type="button" onClick={() => setShowReport(true)} className="mt-5 inline-flex items-center gap-2 bg-paycor-charcoal text-white font-bold px-4 py-2.5 rounded-xl text-xs">
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
              <button type="button" onClick={generateAiStrategyReport} className="inline-flex items-center gap-2 bg-paycor-orange text-white font-extrabold px-4 py-2.5 rounded-xl text-xs">
                <Sparkles className="w-4 h-4" /> Generate Advisory
              </button>
            )}
            {aiStrategyLoading && (
              <div className="flex items-center gap-2 text-xs text-paycor-medium-grey">
                <RefreshCw className="w-4 h-4 animate-spin" /> Generating an evidence-aware advisory from the calculated results…
              </div>
            )}
            {aiStrategyError && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" /> {aiStrategyError}
              </div>
            )}
            {aiStrategy && (
              <div className="space-y-4">
                <div className="max-h-[520px] overflow-y-auto bg-slate-50 border border-slate-200 rounded-2xl p-6 prose prose-sm max-w-none">
                  <ReactMarkdown>{aiStrategy}</ReactMarkdown>
                </div>
                <button type="button" onClick={generateAiStrategyReport} className="inline-flex items-center gap-2 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-paycor-medium-grey">
                  <RefreshCw className="w-3.5 h-3.5" /> Regenerate Using Current Inputs
                </button>
              </div>
            )}
          </section>

          <div className="flex items-center justify-between">
            <button type="button" onClick={() => setActiveStep(2)} className="inline-flex items-center gap-2 text-xs font-bold text-paycor-medium-grey">
              <ChevronLeft className="w-4 h-4" /> Back to Value Model
            </button>
          </div>
        </div>
      )}

      <FirstUseGuide open={showFirstUseGuide} onClose={closeFirstUseGuide} />

      <EstimateAssistant
        open={showEstimateAssistant}
        facility={facility}
        onClose={() => setShowEstimateAssistant(false)}
        onApply={applyGuidedEstimates}
      />

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
          strategicOpportunity={strategicOpportunity}
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
        <h2 className="text-sm font-extrabold">{title}</h2>
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
  source,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  source?: InputSourceRecord;
}) {
  return (
    <label className={className}>
      <InputLabel label={label} source={source} />
      <input
        type="text"
        value={value}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-paycor-orange"
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
  source,
  decimals = 0,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
  source?: InputSourceRecord;
  decimals?: number;
}) {
  const displayValue = Number.isFinite(value)
    ? Number(value.toFixed(decimals))
    : 0;
  return (
    <label>
      <InputLabel label={label} source={source} />
      <div className="relative">
        {prefix && <span className="absolute left-3 top-2.5 text-sm text-paycor-grey">{prefix}</span>}
        <input
          type="number"
          min="0"
          step={decimals > 0 ? 1 / 10 ** decimals : 1}
          value={displayValue}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => onChange(Number(event.target.value) || 0)}
          className={`w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 text-sm outline-none focus:border-paycor-orange ${prefix ? 'pl-7 pr-3' : 'px-3'} ${suffix ? 'pr-8' : ''}`}
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
  source,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  source?: InputSourceRecord;
}) {
  return (
    <label>
      <InputLabel label={label} source={source} />
      <select
        value={value}
        onChange={(event: React.ChangeEvent<HTMLSelectElement>) => onChange(Number(event.target.value))}
        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-paycor-orange"
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <option key={star} value={star}>{star}.0 Stars</option>
        ))}
      </select>
    </label>
  );
}

function InputLabel({ label, source }: { label: string; source?: InputSourceRecord }) {
  const styles: Record<InputSourceRecord['source'], string> = {
    cms: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    prospect: 'bg-sky-50 text-sky-700 border-sky-200',
    consultant: 'bg-violet-50 text-violet-700 border-violet-200',
    calculated: 'bg-amber-50 text-amber-700 border-amber-200',
    research: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    estimate: 'bg-amber-50 text-amber-700 border-amber-200',
    default: 'bg-slate-100 text-slate-600 border-slate-200',
  };
  return (
    <span className="flex items-center justify-between gap-2 mb-1.5">
      <span className="text-[11px] font-bold text-paycor-medium-grey">{label}</span>
      {source && (
        <span
          title={[source.label, source.note].filter(Boolean).join(' — ')}
          className={`border rounded-full px-1.5 py-0.5 text-[7px] uppercase font-extrabold ${styles[source.source]}`}
        >
          {source.source}
        </span>
      )}
    </span>
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
    <div className={`rounded-2xl border p-4 ${emphasis ? 'bg-paycor-orange/5 border-paycor-orange/30' : 'bg-slate-50 border-slate-200'}`}>
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
    <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50">
      <p className="text-[9px] uppercase tracking-wider font-bold text-paycor-grey">{label}</p>
      <p className={`text-xl font-black mt-1 ${capitalize ? 'capitalize' : ''}`}>{value}</p>
    </div>
  );
}

function EvidenceBadge({ evidence }: { evidence: 'direct' | 'influenced' | 'correlated' }) {
  const styles = {
    direct: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    influenced: 'bg-amber-50 text-amber-700 border-amber-200',
    correlated: 'bg-sky-50 text-sky-700 border-sky-200',
  };
  return <span className={`border rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${styles[evidence]}`}>{evidence}</span>;
}
