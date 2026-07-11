import {
  FacilityROICalculatorInputs,
  InputSourceRecord,
  TechCostMap,
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

export interface GuidedEstimateDrivers {
  occupancyRate: number;
  employeesPerResident: number;
  nursingWorkforceShare: number;
  annualProductiveHoursPerFte: number;
  rnWorkforceShare: number;
  rnHourlyWage: number;
  lpnWorkforceShare: number;
  lpnHourlyWage: number;
  cnaWorkforceShare: number;
  cnaHourlyWage: number;
  otherWorkforceShare: number;
  otherHourlyWage: number;
  adminBaseHourlyWage: number;
  loadedLaborFactor: number;
  overtimeShareOfPaidHours: number;
  agencyShareOfNursingHours: number;
  agencyRateMultiplier: number;
  pbjWorkflowMaturity: 'automated' | 'mixed' | 'manual' | 'high-complexity';
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
  techModulePepm: Record<keyof TechCostMap, number>;
  activeTechModules: Record<keyof TechCostMap, boolean>;
}

export const DEFAULT_GUIDED_ESTIMATE_DRIVERS: GuidedEstimateDrivers = {
  occupancyRate: 0.785,
  employeesPerResident: 1.15,
  nursingWorkforceShare: 0.65,
  annualProductiveHoursPerFte: 1840,
  rnWorkforceShare: 0.20,
  rnHourlyWage: 42.5,
  lpnWorkforceShare: 0.25,
  lpnHourlyWage: 31.0,
  cnaWorkforceShare: 0.55,
  cnaHourlyWage: 21.5,
  otherWorkforceShare: 0.35,
  otherHourlyWage: 18.0,
  adminBaseHourlyWage: 28.5,
  loadedLaborFactor: 1.30,
  overtimeShareOfPaidHours: 0.045,
  agencyShareOfNursingHours: 0.05,
  agencyRateMultiplier: 1.65,
  pbjWorkflowMaturity: 'mixed',
  medicarePartACensusShare: 0.12,
  medicarePartADailyRevenue: 645,
  blendedDailyResidentRevenue: 285,
  complianceResidentsAtRisk: 0,
  complianceDaysAtRisk: 0,
  complianceRemediationHours: 0,
  complianceProfessionalFees: 0,
  includeRecentCmsFinesInExposure: true,
  planningPaycorPepm: 16.5,
  planningAnnualBaseFee: 1500,
  techModulePepm: {
    recruiting: 1.5,
    onboarding: 1.0,
    payroll: 4.5,
    time: 2.5,
    scheduling: 3.5,
    benefits: 1.5,
    lms: 1.25,
    performance: 1.25,
    other: 0,
  },
  activeTechModules: {
    recruiting: true,
    onboarding: true,
    payroll: true,
    time: true,
    scheduling: true,
    benefits: false,
    lms: false,
    performance: false,
    other: false,
  },
};

export interface GuidedEstimateOutput {
  value: number;
  confidence: 'low' | 'medium' | 'high';
  method: string;
  sourceLabel: string;
  reportable: boolean;
  actualSourceField?: string;
  note?: string;
}

export interface GuidedEstimatesResult {
  values: Record<GuidedEstimateField, GuidedEstimateOutput>;
  technologyCosts: TechCostMap;
  technologySources: Record<keyof TechCostMap, InputSourceRecord>;
}

export function sourceRecordForEstimate(estimate: GuidedEstimateOutput): InputSourceRecord {
  return {
    source: 'estimate',
    label: estimate.sourceLabel,
    confidence: estimate.confidence,
    method: estimate.method,
    reportable: estimate.reportable,
    note: estimate.note,
  };
}

export function calculateGuidedEstimates(
  inputs: FacilityROICalculatorInputs,
  drivers: GuidedEstimateDrivers,
): GuidedEstimatesResult {
  const beds = Number(inputs.certifiedBeds) || 0;
  const residents = Number(inputs.averageResidentsPerDay) || (beds > 0 ? Math.round(beds * drivers.occupancyRate) : 75);

  const headcountValue =
    Number(inputs.headcount) ||
    (inputs.inputSources?.headcount?.source !== 'default' && Number(inputs.headcount)) ||
    Math.round(residents * drivers.employeesPerResident);

  const rnWage = drivers.rnHourlyWage;
  const lpnWage = drivers.lpnHourlyWage;
  const cnaWage = drivers.cnaHourlyWage;
  const blendedNursingWage =
    rnWage * drivers.rnWorkforceShare +
    lpnWage * drivers.lpnWorkforceShare +
    cnaWage * drivers.cnaWorkforceShare;

  const otherWage = drivers.otherHourlyWage;
  const blendedWageValue =
    blendedNursingWage * drivers.nursingWorkforceShare +
    otherWage * (1 - drivers.nursingWorkforceShare);

  const loadedAdminRateValue = drivers.adminBaseHourlyWage * drivers.loadedLaborFactor;

  const totalPaidHours = headcountValue * drivers.annualProductiveHoursPerFte;
  const overtimeHoursValue = totalPaidHours * drivers.overtimeShareOfPaidHours;

  const totalNursingHours = totalPaidHours * drivers.nursingWorkforceShare;
  const agencyHoursValue = totalNursingHours * drivers.agencyShareOfNursingHours;
  const weeklyAgencyHoursValue = agencyHoursValue / 52;
  const agencyRateValue = blendedNursingWage * drivers.agencyRateMultiplier;

  const pbjHoursByMaturity = {
    automated: 4,
    mixed: 12,
    manual: 24,
    'high-complexity': 40,
  };
  const pbjHoursValue = pbjHoursByMaturity[drivers.pbjWorkflowMaturity];

  const dailyMedicarePartARev = residents * drivers.medicarePartACensusShare * drivers.medicarePartADailyRevenue;
  const medicarePartARevenueValue = dailyMedicarePartARev * 365;
  const monthlyResidentValue = drivers.blendedDailyResidentRevenue * 30.4;

  const baseCmsFines = Number(inputs.totalFines) || 0;
  const hasCmsFines = baseCmsFines > 0;
  const activeFinesInExposure = drivers.includeRecentCmsFinesInExposure && hasCmsFines ? baseCmsFines : 0;
  const complianceRiskValue =
    drivers.complianceResidentsAtRisk * drivers.blendedDailyResidentRevenue * drivers.complianceDaysAtRisk +
    drivers.complianceRemediationHours * loadedAdminRateValue +
    drivers.complianceProfessionalFees +
    activeFinesInExposure;

  const softwareCostValue = headcountValue * drivers.planningPaycorPepm * 12 + drivers.planningAnnualBaseFee;

  const values: Record<GuidedEstimateField, GuidedEstimateOutput> = {
    headcount: {
      value: headcountValue,
      confidence: beds > 0 ? 'medium' : 'low',
      method: beds > 0
        ? `Estimated headcount based on ${beds} certified beds × ${Math.round(drivers.occupancyRate * 100)}% occupancy × ${drivers.employeesPerResident} staff-to-resident ratio.`
        : `Fallback default of ${headcountValue} staff based on an average 75 daily residents.`,
      sourceLabel: 'Staff-to-resident ratio model.',
      reportable: true,
    },
    hourlyRate: {
      value: blendedWageValue,
      confidence: 'medium',
      method: `Weighted average hourly wage based on a ${Math.round(drivers.nursingWorkforceShare * 100)}% nursing mix (RN: ${Math.round(drivers.rnWorkforceShare * 100)}% at $${rnWage}/hr, LPN: ${Math.round(drivers.lpnWorkforceShare * 100)}% at $${lpnWage}/hr, CNA: ${Math.round(drivers.cnaWorkforceShare * 100)}% at $${cnaWage}/hr) and ${Math.round((1 - drivers.nursingWorkforceShare) * 100)}% support mix at $${otherWage}/hr.`,
      sourceLabel: 'Standard long-term care wage index.',
      reportable: true,
    },
    adminLoadedHourlyRate: {
      value: loadedAdminRateValue,
      confidence: 'medium',
      method: `Loaded administrative rate based on $${drivers.adminBaseHourlyWage}/hr base salary × ${drivers.loadedLaborFactor.toFixed(2)}x payroll taxes and benefits factor.`,
      sourceLabel: 'Standard administrative burden index.',
      reportable: true,
    },
    overtimeHoursPerYear: {
      value: overtimeHoursValue,
      confidence: 'medium',
      method: `Annual overtime hours modeled at ${Math.round(drivers.overtimeShareOfPaidHours * 1000) / 10}% of total paid hours (${totalPaidHours.toLocaleString()} annual paid hours based on ${headcountValue} staff × ${drivers.annualProductiveHoursPerFte} productive hours/FTE).`,
      sourceLabel: 'LTC average overtime utilization.',
      reportable: true,
    },
    weeklyAgencyHours: {
      value: weeklyAgencyHoursValue,
      confidence: 'medium',
      method: `Weekly agency utilization modeled at ${Math.round(drivers.agencyShareOfNursingHours * 1000) / 10}% of nursing hours (nursing is ${Math.round(drivers.nursingWorkforceShare * 100)}% of the total ${totalPaidHours.toLocaleString()} paid hours).`,
      sourceLabel: 'LTC average agency utilization.',
      reportable: true,
    },
    agencyHourlyRate: {
      value: agencyRateValue,
      confidence: 'medium',
      method: `Agency hourly rate modeled as ${drivers.agencyRateMultiplier.toFixed(2)}x the average internal nursing wage of $${blendedNursingWage.toFixed(2)}/hr.`,
      sourceLabel: 'LTC agency premium index.',
      reportable: true,
    },
    pbjHoursPerMonth: {
      value: pbjHoursValue,
      confidence: 'medium',
      method: `Monthly PBJ administrative prep labor assigned to the "${drivers.pbjWorkflowMaturity}" maturity tier.`,
      sourceLabel: 'PBJ workflow maturity index.',
      reportable: true,
    },
    annualMedicarePartARevenue: {
      value: medicarePartARevenueValue,
      confidence: beds > 0 ? 'medium' : 'low',
      method: beds > 0
        ? `Medicare Part A annual revenue modeled as ${Math.round(drivers.medicarePartACensusShare * 100)}% of daily residents (${Math.round(residents)} residents/day based on ${beds} beds) × $${drivers.medicarePartADailyRevenue}/day Medicare FFS Part A rate × 365 days.`
        : `Fallback Medicare Part A revenue based on an average 75 daily residents.`,
      sourceLabel: 'Payer-mix and Medicare Part A revenue index.',
      reportable: true,
    },
    avgMonthlyResidentValue: {
      value: monthlyResidentValue,
      confidence: 'medium',
      method: `Average monthly resident value modeled as $${drivers.blendedDailyResidentRevenue}/day blended resident reimbursement rate × 30.4 days.`,
      sourceLabel: 'LTC daily reimbursement index.',
      reportable: true,
    },
    complianceRiskExposure: {
      value: complianceRiskValue,
      confidence: 'low',
      method: `Risk exposure modeled as (${drivers.complianceResidentsAtRisk} residents at risk × $${drivers.blendedDailyResidentRevenue}/day blended rate × ${drivers.complianceDaysAtRisk} days affected) + (${drivers.complianceRemediationHours} remediation hours × $${loadedAdminRateValue.toFixed(2)} loaded admin wage) + $${drivers.complianceProfessionalFees.toLocaleString()} professional fees${activeFinesInExposure > 0 ? ` + $${activeFinesInExposure.toLocaleString()} recent CMS fines` : ''}.`,
      sourceLabel: 'Custom operational risk scenario.',
      reportable: true,
    },
    softwareCost: {
      value: softwareCostValue,
      confidence: 'medium',
      method: `Temporary internal planning estimate based on ${headcountValue} headcount × $${drivers.planningPaycorPepm.toFixed(2)} PEPM × 12 months + $${drivers.planningAnnualBaseFee.toLocaleString()} annual base platform fees.`,
      sourceLabel: 'Internal planning pricing index only.',
      reportable: false,
      note: 'INTERNAL STUDY ONLY — MUST BE REPLACED WITH AN APPROVED SYSTEM QUOTE BEFORE GIVING TO THE CUSTOMER.',
    },
  };

  const technologyCosts: TechCostMap = {
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

  const technologySources = {} as Record<keyof TechCostMap, InputSourceRecord>;

  (Object.keys(drivers.techModulePepm) as Array<keyof TechCostMap>).forEach((key) => {
    const pepm = drivers.techModulePepm[key];
    const active = drivers.activeTechModules[key];
    if (active && pepm > 0) {
      technologyCosts[key] = headcountValue * pepm * 12;
      technologySources[key] = {
        source: 'estimate',
        label: `Estimated legacy cost based on ${headcountValue} headcount × $${pepm.toFixed(2)} PEPM × 12 months.`,
        confidence: 'medium',
        method: 'Headcount-driven software spend index.',
        reportable: true,
      };
    }
  });

  return {
    values,
    technologyCosts,
    technologySources,
  };
}

export const ESTIMATE_FIELD_HELP: Record<
  GuidedEstimateField,
  { explanation: string; actualSource: string }
> = {
  headcount: {
    explanation: 'Total active full-time, part-time, and PRN employees who require payroll services.',
    actualSource: 'Recent Form 941, active payroll rosters, or HR headcount statistics.',
  },
  hourlyRate: {
    explanation: 'Blended average hourly base wage across all clinical, administrative, and support departments.',
    actualSource: 'Payroll summary registers, general ledger labor accounts, or wage reporting.',
  },
  adminLoadedHourlyRate: {
    explanation: 'Fully loaded hourly compensation rate of HR and payroll administrators (base salary + taxes + benefits).',
    actualSource: 'Finance or HR administration budget audits.',
  },
  overtimeHoursPerYear: {
    explanation: 'Total annual hours paid at premium overtime rates (typically 1.5x) across all hourly staff.',
    actualSource: 'Annual payroll summary registers, labor distribution reports, or year-end statements.',
  },
  weeklyAgencyHours: {
    explanation: 'Average weekly hours worked by contracted external agency RNs, LPNs, and CNAs.',
    actualSource: 'Agency billing invoices, scheduling records, or labor variance reports.',
  },
  agencyHourlyRate: {
    explanation: 'The standard fully loaded hourly rate billed by external staffing agencies.',
    actualSource: 'Agency service agreements, rate sheets, or invoice registers.',
  },
  pbjHoursPerMonth: {
    explanation: 'Staff labor hours spent formatting, auditing, correcting, and submitting quarterly PBJ staffing reports to CMS.',
    actualSource: 'HR, payroll, or scheduling coordinator timecards or task audits.',
  },
  annualMedicarePartARevenue: {
    explanation: 'Total annual revenue received from Medicare Fee-For-Service (FFS) Part A services.',
    actualSource: 'Cost reports (CMS-2540), financial audit books, or revenue-cycle metrics.',
  },
  avgMonthlyResidentValue: {
    explanation: 'Blended average monthly reimbursement rate per resident across all active payer classes.',
    actualSource: 'Monthly billing summaries, revenue-cycle books, or finance spreadsheets.',
  },
  complianceRiskExposure: {
    explanation: 'The total estimated financial exposure of compliance risks (remediation labor, professional fees, license risks).',
    actualSource: 'Compliance officers, corporate legal advisors, or risk-management audits.',
  },
  softwareCost: {
    explanation: 'The estimated annual investment required to implement, configure, and license Paycor.',
    actualSource: 'Approved Paycor pricing quote (prospect-entered).',
  },
};
