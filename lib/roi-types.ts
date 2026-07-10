export type AnalysisMode = 'facility' | 'portfolio';
export type ScenarioKey = 'conservative' | 'expected' | 'opportunity';
export type EvidenceClass = 'direct' | 'influenced' | 'correlated';
export type SourceKind = 'prospect' | 'cms' | 'research' | 'consultant' | 'calculated';

export interface TechCostMap {
  recruiting: number;
  onboarding: number;
  payroll: number;
  time: number;
  scheduling: number;
  benefits: number;
  lms: number;
  performance: number;
  other: number;
}

export interface ScenarioAssumptions {
  turnoverCostMultiple: number;
  turnoverImprovementRate: number;
  turnoverPaycorAttribution: number;
  overtimeReductionRate: number;
  overtimePaycorAttribution: number;
  agencyReductionRate: number;
  agencyPaycorAttribution: number;
  pbjEfficiencyRate: number;
  pbjPaycorAttribution: number;
  techRetirementRate: number;
  referralCaptureRate: number;
  snfVbpRecoveryRate: number;
  complianceRiskReductionRate: number;
}

export interface AssumptionDefinition {
  key: keyof ScenarioAssumptions;
  label: string;
  description: string;
  evidenceClass: EvidenceClass;
  sourceKind: SourceKind;
  sourceLabel: string;
  sourceUrl?: string;
  isPercentage: boolean;
  min: number;
  max: number;
  step: number;
}

export interface FacilityROICalculatorInputs {
  id?: string;
  ccn?: string;
  facilityName: string;
  chainName?: string;
  state?: string;

  headcount: number;
  hourlyRate: number;
  adminLoadedHourlyRate: number;
  turnoverRate: number;
  rnTurnover: number;
  adminTurnover: string;

  overallRating: number;
  staffingRating: number;
  healthInspectionRating?: number;
  qualityMeasureRating?: number;
  projectedOverallRating: number;
  healthDeficiencies: number;
  totalFines: number;

  pbjHoursPerMonth: number;
  overtimeHoursPerYear: number;
  weeklyAgencyHours: number;
  agencyHourlyRate: number;

  annualMedicarePartARevenue: number;
  avgMonthlyResidentValue: number;
  referralsPerStarLevel: number;
  censusResidentsProtected: number;
  complianceRiskExposure: number;

  softwareCost: number;
  currentTechCosts: TechCostMap;
}

export interface ValueLineItem {
  key: string;
  label: string;
  evidenceClass: EvidenceClass;
  currentBurden: number;
  attainableImprovement: number;
  paycorAttribution: number;
  annualBenefit: number;
  includedInBaseROI: boolean;
  explanation: string;
}

export interface FacilityROIResults {
  annualCompensationPerEmployee: number;
  estimatedCostPerTurnover: number;
  estimatedTurnoverEvents: number;

  baselineTurnoverBurden: number;
  baselineOvertimePremium: number;
  baselineAgencyPremium: number;
  baselinePbjAdminCost: number;
  totalCurrentTechSpend: number;
  totalDirectOpportunity: number;

  turnoverBenefit: number;
  overtimeBenefit: number;
  agencyBenefit: number;
  pbjBenefit: number;
  retiredTechBenefit: number;
  totalPaycorInfluencedBenefit: number;

  softwareCost: number;
  netAnnualBenefit: number;
  roiPercent: number | null;
  benefitCostRatio: number | null;
  paybackMonths: number | null;

  cmsStarDelta: number;
  annualRevenuePerResident: number;
  referralResidentsCaptured: number;
  censusGrowthOpportunity: number;
  censusProtectionOpportunity: number;
  snfVbpWithholdExposure: number;
  snfVbpRecoveryOpportunity: number;
  complianceRiskOpportunity: number;
  totalStrategicUpside: number;
  potentialEnterpriseValue: number;

  valueLineItems: ValueLineItem[];
}

export interface PortfolioROIResults {
  facilityCount: number;
  totalHeadcount: number;
  weightedTurnoverRate: number;
  weightedOverallRating: number;
  totalDirectOpportunity: number;
  totalPaycorInfluencedBenefit: number;
  totalSoftwareCost: number;
  netAnnualBenefit: number;
  roiPercent: number | null;
  benefitCostRatio: number | null;
  paybackMonths: number | null;
  totalStrategicUpside: number;
  potentialEnterpriseValue: number;
  facilities: Array<{
    inputs: FacilityROICalculatorInputs;
    results: FacilityROIResults;
  }>;
}
