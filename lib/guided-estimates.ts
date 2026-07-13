import {
  EstimateConfidence,
  FacilityROICalculatorInputs,
  InputSourceRecord,
  TechCostMap,
  TrackedInputField,
} from './roi-types';

export type GuidedEstimateField =
  | 'headcount'
  | 'hourlyRate'
  | 'adminLoadedHourlyRate'
  | 'overtimeHoursPerYear'
  | 'weeklyAgencyHours'
  | 'agencyHourlyRate'
  | 'pbjHoursPerMonth'
  | 'annualMedicarePartARevenue'
  | 'avgMonthlyResidentValue'
  | 'complianceRiskExposure'
  | 'softwareCost';

export type PbjWorkflowMaturity = 'automated' | 'mixed' | 'manual' | 'high-complexity';

export interface GuidedEstimateDrivers {
  occupancyRate: number;
  employeesPerResident: number;
  headcountPlanningMultiplier: number;
  nursingWorkforceShare: number;
  annualProductiveHoursPerFte: number;

  rnWorkforceShare: number;
  lpnWorkforceShare: number;
  cnaWorkforceShare: number;
  otherWorkforceShare: number;
  rnHourlyWage: number;
  lpnHourlyWage: number;
  cnaHourlyWage: number;
  otherHourlyWage: number;
  adminBaseHourlyWage: number;
  loadedLaborFactor: number;

  overtimeShareOfPaidHours: number;
  agencyShareOfNursingHours: number;
  agencyRateMultiplier: number;
  pbjWorkflowMaturity: PbjWorkflowMaturity;

  medicarePartACensusShare: number;
  medicarePartADailyRevenue: number;
  blendedDailyResidentRevenue: number;

  complianceResidentsAtRisk: number;
  complianceDaysAtRisk: number;
  complianceRemediationHours: number;
  complianceProfessionalFees: number;
  includeRecentCmsFinesInExposure: boolean;

  planningPaycorPepm: number;
  planningAnnualBaseFee: number;
  techModulePepm: TechCostMap;
  activeTechModules: Record<keyof TechCostMap, boolean>;
}

export interface GuidedEstimateValue {
  field: GuidedEstimateField;
  value: number;
  confidence: EstimateConfidence;
  label: string;
  method: string;
  note: string;
  reportable: boolean;
  requiresConfirmation: boolean;
  drivers: Record<string, string | number | boolean>;
}

export interface GuidedEstimateResult {
  values: Partial<Record<GuidedEstimateField, GuidedEstimateValue>>;
  technologyCosts: TechCostMap;
  technologySources: Partial<Record<keyof TechCostMap, InputSourceRecord>>;
}

export const DEFAULT_GUIDED_ESTIMATE_DRIVERS: GuidedEstimateDrivers = {
  occupancyRate: 0.82,
  employeesPerResident: 1.15,
  headcountPlanningMultiplier: 2.0,
  nursingWorkforceShare: 0.65,
  annualProductiveHoursPerFte: 1_768,

  rnWorkforceShare: 0.10,
  lpnWorkforceShare: 0.15,
  cnaWorkforceShare: 0.45,
  otherWorkforceShare: 0.30,
  rnHourlyWage: 42,
  lpnHourlyWage: 31,
  cnaHourlyWage: 21,
  otherHourlyWage: 24,
  adminBaseHourlyWage: 35,
  loadedLaborFactor: 1.28,

  overtimeShareOfPaidHours: 0.025,
  agencyShareOfNursingHours: 0.02,
  agencyRateMultiplier: 2.0,
  pbjWorkflowMaturity: 'mixed',

  medicarePartACensusShare: 0.12,
  medicarePartADailyRevenue: 625,
  blendedDailyResidentRevenue: 325,

  complianceResidentsAtRisk: 0,
  complianceDaysAtRisk: 0,
  complianceRemediationHours: 0,
  complianceProfessionalFees: 0,
  includeRecentCmsFinesInExposure: false,

  planningPaycorPepm: 20,
  planningAnnualBaseFee: 0,
  // Full fragmented-stack estimate totals exactly $33 PEPM.
  techModulePepm: {
    recruiting: 4,
    onboarding: 2,
    payroll: 8,
    time: 5,
    scheduling: 5,
    benefits: 3,
    lms: 3,
    performance: 3,
    other: 0,
  },
  activeTechModules: {
    recruiting: true,
    onboarding: true,
    payroll: true,
    time: true,
    scheduling: true,
    benefits: true,
    lms: true,
    performance: true,
    other: false,
  },
};

export const ESTIMATE_FIELD_HELP: Partial<Record<TrackedInputField, {
  definition: string;
  actualSource: string;
  estimateMethod: string;
}>> = {
  headcount: {
    definition: 'Total active employees or FTEs covered by the proposed platform.',
    actualSource: 'HRIS employee roster, payroll census or benefits eligibility file.',
    estimateMethod: 'Uses CMS residents and staffing HPRD when available; otherwise uses resident census or certified beds, then applies the editable facility-wide planning multiplier.',
  },
  hourlyRate: {
    definition: 'Blended average base hourly wage across the workforce included in the model.',
    actualSource: 'Payroll register, compensation report or finance labor-cost report.',
    estimateMethod: 'Weighted average of editable RN, LPN/LVN, CNA and other-workforce wages and workforce mix.',
  },
  adminLoadedHourlyRate: {
    definition: 'Fully loaded hourly cost for HR, payroll, scheduling or compliance administration.',
    actualSource: 'Salary plus employer taxes and benefits divided by annual productive hours.',
    estimateMethod: 'Editable administrative base wage multiplied by a loaded-labor factor.',
  },
  overtimeHoursPerYear: {
    definition: 'Annual hours paid at an overtime premium for the modeled workforce.',
    actualSource: 'Payroll earnings-code report or time-and-attendance overtime report.',
    estimateMethod: 'Estimated headcount × 2,080 paid hours × editable overtime share.',
  },
  weeklyAgencyHours: {
    definition: 'Average weekly hours filled by agency, registry or other contract clinical labor.',
    actualSource: 'Accounts payable, staffing invoices, general ledger or scheduling system.',
    estimateMethod: 'Estimated nursing workforce × 40 hours × editable agency share.',
  },
  agencyHourlyRate: {
    definition: 'Blended hourly bill rate paid to agency or registry vendors.',
    actualSource: 'Current agency invoices or contract rate sheets.',
    estimateMethod: 'Blended internal hourly wage × editable agency-rate multiplier.',
  },
  pbjHoursPerMonth: {
    definition: 'Monthly internal labor required to prepare, reconcile, validate and submit PBJ data.',
    actualSource: 'Time study with payroll, HR, staffing and compliance owners.',
    estimateMethod: 'Workflow-maturity benchmark selected as automated, mixed, manual or high-complexity.',
  },
  annualMedicarePartARevenue: {
    definition: 'Annual Medicare fee-for-service Part A revenue exposed to SNF VBP.',
    actualSource: 'Finance revenue report, Medicare remittance data or cost report workpapers.',
    estimateMethod: 'CMS average residents/day × editable Part A census share × daily Part A revenue × 365.',
  },
  avgMonthlyResidentValue: {
    definition: 'Blended monthly revenue associated with one occupied resident bed.',
    actualSource: 'Finance net patient revenue divided by resident months.',
    estimateMethod: 'Editable blended daily resident revenue × 30.4375 days.',
  },
  complianceRiskExposure: {
    definition: 'Scenario-based financial exposure from remediation, professional fees and census disruption—not an automatic CMS penalty.',
    actualSource: 'Compliance, finance, legal and operations scenario review.',
    estimateMethod: 'Residents at risk × days affected × daily resident revenue + remediation labor + professional fees, with optional recent CMS fines.',
  },
  softwareCost: {
    definition: 'Annual Paycor investment used in the ROI denominator.',
    actualSource: 'Approved Paycor proposal or pricing worksheet.',
    estimateMethod: 'Internal planning PEPM × headcount × 12 plus an editable annual base fee. This estimate is not customer-reportable until replaced by approved pricing.',
  },
};

const PBJ_HOURS_BY_MATURITY: Record<PbjWorkflowMaturity, number> = {
  automated: 4,
  mixed: 12,
  manual: 24,
  'high-complexity': 40,
};

const TECH_LABELS: Record<keyof TechCostMap, string> = {
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

function finite(value: number | undefined, fallback = 0): number {
  return Number.isFinite(value) ? Number(value) : fallback;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function rounded(value: number): number {
  return Math.max(0, Math.round(value));
}

function roundedTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.max(0, Math.round((value + Number.EPSILON) * factor) / factor);
}

function estimateRecord(
  estimate: GuidedEstimateValue,
): InputSourceRecord {
  return {
    source: 'estimate',
    label: estimate.label,
    confidence: estimate.confidence,
    method: estimate.method,
    note: estimate.note,
    drivers: estimate.drivers,
    reportable: estimate.reportable,
    requiresConfirmation: estimate.requiresConfirmation,
  };
}

export function calculateGuidedEstimates(
  facility: FacilityROICalculatorInputs,
  drivers: GuidedEstimateDrivers,
): GuidedEstimateResult {
  const residentCensus = finite(
    facility.averageResidentsPerDay,
    finite(facility.certifiedBeds) * clamp(drivers.occupancyRate, 0, 1),
  );
  const totalNurseHprd = finite(facility.reportedTotalNurseStaffingHprd);
  const nursingWorkforceShare = clamp(drivers.nursingWorkforceShare, 0.1, 0.95);
  const productiveHours = Math.max(1, drivers.annualProductiveHoursPerFte);

  let modeledHeadcount = 0;
  let headcountConfidence: EstimateConfidence = 'low';
  let headcountMethod = '';

  if (residentCensus > 0 && totalNurseHprd > 0) {
    const nursingFtes = residentCensus * totalNurseHprd * 365 / productiveHours;
    modeledHeadcount = nursingFtes / nursingWorkforceShare;
    headcountConfidence = 'medium';
    headcountMethod = 'CMS average residents/day × CMS total nurse HPRD × 365 ÷ productive hours ÷ nursing workforce share.';
  } else if (residentCensus > 0) {
    modeledHeadcount = residentCensus * Math.max(0.1, drivers.employeesPerResident);
    headcountMethod = 'Average residents/day × editable employees-per-resident ratio.';
  } else {
    modeledHeadcount = finite(facility.certifiedBeds) * clamp(drivers.occupancyRate, 0, 1) * Math.max(0.1, drivers.employeesPerResident);
    headcountMethod = 'Certified beds × editable occupancy rate × employees-per-resident ratio.';
  }

  const currentHeadcountSource = facility.inputSources?.headcount;
  const preserveConfirmedHeadcount =
    finite(facility.headcount) > 0 &&
    Boolean(currentHeadcountSource) &&
    !['default', 'estimate'].includes(currentHeadcountSource?.source || 'default');
  const headcountMultiplier = Math.max(0.1, drivers.headcountPlanningMultiplier);
  const headcount = preserveConfirmedHeadcount
    ? rounded(facility.headcount)
    : rounded((modeledHeadcount || 60) * headcountMultiplier);
  headcountMethod = preserveConfirmedHeadcount
    ? 'Uses the currently confirmed employee census; the guided estimate does not replace prospect or consultant-confirmed headcount.'
    : `${headcountMethod} A ${headcountMultiplier.toFixed(1)}x facility-wide planning multiplier is then applied.`;

  const wageWeights = [
    Math.max(0, drivers.rnWorkforceShare),
    Math.max(0, drivers.lpnWorkforceShare),
    Math.max(0, drivers.cnaWorkforceShare),
    Math.max(0, drivers.otherWorkforceShare),
  ];
  const weightTotal = wageWeights.reduce((sum, value) => sum + value, 0) || 1;
  const hourlyRate = (
    wageWeights[0] * Math.max(0, drivers.rnHourlyWage) +
    wageWeights[1] * Math.max(0, drivers.lpnHourlyWage) +
    wageWeights[2] * Math.max(0, drivers.cnaHourlyWage) +
    wageWeights[3] * Math.max(0, drivers.otherHourlyWage)
  ) / weightTotal;

  const adminLoadedHourlyRate = Math.max(0, drivers.adminBaseHourlyWage) * Math.max(1, drivers.loadedLaborFactor);
  const annualPaidHours = headcount * 2_080;
  const overtimeHours = annualPaidHours * clamp(drivers.overtimeShareOfPaidHours, 0, 0.5);
  const weeklyAgencyHours = headcount * nursingWorkforceShare * 40 * clamp(drivers.agencyShareOfNursingHours, 0, 1);
  const agencyHourlyRate = hourlyRate * Math.max(1, drivers.agencyRateMultiplier);
  const pbjHours = PBJ_HOURS_BY_MATURITY[drivers.pbjWorkflowMaturity];

  const annualMedicarePartARevenue = residentCensus * clamp(drivers.medicarePartACensusShare, 0, 1) * 365 * Math.max(0, drivers.medicarePartADailyRevenue);
  const avgMonthlyResidentValue = Math.max(0, drivers.blendedDailyResidentRevenue) * 30.4375;

  const dailyResidentValue = Math.max(0, drivers.blendedDailyResidentRevenue);
  const complianceRiskExposure =
    Math.max(0, drivers.complianceResidentsAtRisk) *
      Math.max(0, drivers.complianceDaysAtRisk) *
      dailyResidentValue +
    Math.max(0, drivers.complianceRemediationHours) * adminLoadedHourlyRate +
    Math.max(0, drivers.complianceProfessionalFees) +
    (drivers.includeRecentCmsFinesInExposure ? Math.max(0, facility.totalFines) : 0);

  const planningSoftwareCost = headcount * 12 * Math.max(0, drivers.planningPaycorPepm) + Math.max(0, drivers.planningAnnualBaseFee);

  const values: GuidedEstimateResult['values'] = {
    headcount: {
      field: 'headcount',
      value: headcount,
      confidence: headcountConfidence,
      label: 'Guided facility-size estimate',
      method: headcountMethod,
      note: 'Replace with a payroll or HRIS census whenever available. The 2.0x planning multiplier is transparent and editable.',
      reportable: true,
      requiresConfirmation: true,
      drivers: {
        residentCensus: Number(residentCensus.toFixed(2)),
        totalNurseHprd: Number(totalNurseHprd.toFixed(3)),
        employeesPerResident: drivers.employeesPerResident,
        headcountPlanningMultiplier: drivers.headcountPlanningMultiplier,
        nursingWorkforceShare,
        annualProductiveHoursPerFte: productiveHours,
      },
    },
    hourlyRate: {
      field: 'hourlyRate',
      value: roundedTo(hourlyRate, 2),
      confidence: 'low',
      label: 'Guided workforce wage-mix estimate',
      method: 'Weighted average of editable RN, LPN/LVN, CNA and other-workforce wage assumptions.',
      note: 'Use payroll actuals when available; wage mix varies materially by geography and facility model.',
      reportable: true,
      requiresConfirmation: true,
      drivers: {
        rnShare: drivers.rnWorkforceShare,
        lpnShare: drivers.lpnWorkforceShare,
        cnaShare: drivers.cnaWorkforceShare,
        otherShare: drivers.otherWorkforceShare,
        rnWage: drivers.rnHourlyWage,
        lpnWage: drivers.lpnHourlyWage,
        cnaWage: drivers.cnaHourlyWage,
        otherWage: drivers.otherHourlyWage,
      },
    },
    adminLoadedHourlyRate: {
      field: 'adminLoadedHourlyRate',
      value: roundedTo(adminLoadedHourlyRate, 2),
      confidence: 'low',
      label: 'Guided loaded-administration estimate',
      method: 'Administrative base hourly wage × loaded-labor factor.',
      note: 'Replace with compensation and employer-cost information when available.',
      reportable: true,
      requiresConfirmation: true,
      drivers: {
        adminBaseHourlyWage: drivers.adminBaseHourlyWage,
        loadedLaborFactor: drivers.loadedLaborFactor,
      },
    },
    overtimeHoursPerYear: {
      field: 'overtimeHoursPerYear',
      value: rounded(overtimeHours),
      confidence: 'low',
      label: 'Guided overtime-volume estimate',
      method: 'Estimated headcount × 2,080 paid hours × overtime share.',
      note: 'Replace with payroll overtime earnings-code hours.',
      reportable: true,
      requiresConfirmation: true,
      drivers: {
        headcount,
        overtimeShareOfPaidHours: drivers.overtimeShareOfPaidHours,
      },
    },
    weeklyAgencyHours: {
      field: 'weeklyAgencyHours',
      value: rounded(weeklyAgencyHours),
      confidence: 'low',
      label: 'Guided contract-labor utilization estimate',
      method: 'Estimated headcount × nursing workforce share × 40 weekly hours × agency share.',
      note: 'Replace with agency invoices, accounts payable or scheduling actuals.',
      reportable: true,
      requiresConfirmation: true,
      drivers: {
        headcount,
        nursingWorkforceShare,
        agencyShareOfNursingHours: drivers.agencyShareOfNursingHours,
      },
    },
    agencyHourlyRate: {
      field: 'agencyHourlyRate',
      value: roundedTo(agencyHourlyRate, 2),
      confidence: 'low',
      label: 'Guided agency bill-rate estimate',
      method: 'Blended internal hourly wage × agency-rate multiplier.',
      note: 'Replace with current vendor bill rates.',
      reportable: true,
      requiresConfirmation: true,
      drivers: {
        hourlyRate: Number(hourlyRate.toFixed(2)),
        agencyRateMultiplier: drivers.agencyRateMultiplier,
      },
    },
    pbjHoursPerMonth: {
      field: 'pbjHoursPerMonth',
      value: pbjHours,
      confidence: 'low',
      label: 'Guided PBJ workflow estimate',
      method: `Workflow maturity selected as ${drivers.pbjWorkflowMaturity}.`,
      note: 'Validate with payroll, staffing and compliance owners through a brief monthly time study.',
      reportable: true,
      requiresConfirmation: true,
      drivers: { pbjWorkflowMaturity: drivers.pbjWorkflowMaturity },
    },
    annualMedicarePartARevenue: {
      field: 'annualMedicarePartARevenue',
      value: rounded(annualMedicarePartARevenue),
      confidence: 'low',
      label: 'Guided Medicare Part A revenue estimate',
      method: 'Average residents/day × Medicare Part A census share × daily Part A revenue × 365.',
      note: 'Use finance or Medicare remittance actuals before relying on SNF VBP exposure.',
      reportable: true,
      requiresConfirmation: true,
      drivers: {
        residentCensus: Number(residentCensus.toFixed(2)),
        medicarePartACensusShare: drivers.medicarePartACensusShare,
        medicarePartADailyRevenue: drivers.medicarePartADailyRevenue,
      },
    },
    avgMonthlyResidentValue: {
      field: 'avgMonthlyResidentValue',
      value: rounded(avgMonthlyResidentValue),
      confidence: 'low',
      label: 'Guided blended resident-value estimate',
      method: 'Blended daily resident revenue × 30.4375 days.',
      note: 'Replace with net patient revenue divided by resident months.',
      reportable: true,
      requiresConfirmation: true,
      drivers: { blendedDailyResidentRevenue: drivers.blendedDailyResidentRevenue },
    },
    complianceRiskExposure: {
      field: 'complianceRiskExposure',
      value: rounded(complianceRiskExposure),
      confidence: 'low',
      label: 'Guided compliance exposure scenario',
      method: 'Census disruption + remediation labor + professional fees. Historical CMS fines are context only unless the user explicitly opts in.',
      note: 'This is a user-defined planning scenario, not an automatic CMS penalty or legal conclusion.',
      reportable: true,
      requiresConfirmation: true,
      drivers: {
        complianceResidentsAtRisk: drivers.complianceResidentsAtRisk,
        complianceDaysAtRisk: drivers.complianceDaysAtRisk,
        complianceRemediationHours: drivers.complianceRemediationHours,
        complianceProfessionalFees: drivers.complianceProfessionalFees,
        includeRecentCmsFinesInExposure: drivers.includeRecentCmsFinesInExposure,
      },
    },
    softwareCost: {
      field: 'softwareCost',
      value: rounded(planningSoftwareCost),
      confidence: 'low',
      label: 'Internal Paycor planning estimate',
      method: 'Planning PEPM × estimated or confirmed headcount × 12. The default is $20 PEPM with no hidden base fee.',
      note: 'Internal planning only. Replace with an approved Paycor proposal before generating a customer-ready ROI.',
      reportable: false,
      requiresConfirmation: true,
      drivers: {
        headcount,
        planningPaycorPepm: drivers.planningPaycorPepm,
        planningAnnualBaseFee: drivers.planningAnnualBaseFee,
      },
    },
  };

  const technologyCosts = (Object.keys(drivers.techModulePepm) as Array<keyof TechCostMap>).reduce<TechCostMap>(
    (costs, key) => {
      costs[key] = drivers.activeTechModules[key]
        ? rounded(headcount * 12 * Math.max(0, drivers.techModulePepm[key]))
        : 0;
      return costs;
    },
    {
      recruiting: 0,
      onboarding: 0,
      payroll: 0,
      time: 0,
      scheduling: 0,
      benefits: 0,
      lms: 0,
      performance: 0,
      other: 0,
    },
  );

  const technologySources = (Object.keys(technologyCosts) as Array<keyof TechCostMap>).reduce<Partial<Record<keyof TechCostMap, InputSourceRecord>>>(
    (sources, key) => {
      if (technologyCosts[key] > 0) {
        sources[key] = {
          source: 'estimate',
          label: `${TECH_LABELS[key]} technology-consolidation estimate`,
          confidence: 'low',
          method: 'Estimated or confirmed headcount × module PEPM × 12. Enabled module assumptions total $33 PEPM for a full fragmented stack.',
          note: 'Replace with current invoices or renewal quotes and include only realistically retirable costs.',
          drivers: {
            headcount,
            pepm: drivers.techModulePepm[key],
          },
          reportable: true,
          requiresConfirmation: true,
        };
      }
      return sources;
    },
    {},
  );

  return { values, technologyCosts, technologySources };
}

export function sourceRecordForEstimate(
  estimate: GuidedEstimateValue,
): InputSourceRecord {
  return estimateRecord(estimate);
}
