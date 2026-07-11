export type AnalysisMode = 'facility' | 'portfolio';
export type ScenarioKey = 'conservative' | 'expected' | 'opportunity';
export type EvidenceClassification = 'direct' | 'influenced' | 'correlated';

export interface ScenarioAssumptions {
  turnoverReductionRate: number;
  agencyReductionRate: number;
  overtimeReductionRate: number;
  pbjWorkflowReductionRate: number;
  retainedTechAvoidedRate: number;
  referralGrowthRate: number;
  retentionMedicarePartAShare: number;
  complianceExposureReductionRate: number;
}

export interface AssumptionDefinition {
  key: keyof ScenarioAssumptions;
  label: string;
  description: string;
  evidenceClass: EvidenceClassification;
  isPercentage: boolean;
  min: number;
  max: number;
  step: number;
  sourceLabel: string;
  sourceUrl?: string;
}

export type TrackedInputField =
  | 'facilityName'
  | 'ccn'
  | 'state'
  | 'chainName'
  | 'certifiedBeds'
  | 'averageResidentsPerDay'
  | 'reportedRnStaffingHprd'
  | 'reportedNurseAideStaffingHprd'
  | 'reportedTotalNurseStaffingHprd'
  | 'headcount'
  | 'hourlyRate'
  | 'adminLoadedHourlyRate'
  | 'turnoverRate'
  | 'rnTurnover'
  | 'adminTurnover'
  | 'overallRating'
  | 'staffingRating'
  | 'healthInspectionRating'
  | 'qualityMeasureRating'
  | 'projectedOverallRating'
  | 'healthDeficiencies'
  | 'totalFines'
  | 'pbjHoursPerMonth'
  | 'overtimeHoursPerYear'
  | 'weeklyAgencyHours'
  | 'agencyHourlyRate'
  | 'annualMedicarePartARevenue'
  | 'avgMonthlyResidentValue'
  | 'referralsPerStarLevel'
  | 'censusResidentsProtected'
  | 'complianceRiskExposure'
  | 'softwareCost';

export interface InputSourceRecord {
  source: 'cms' | 'prospect' | 'consultant' | 'calculated' | 'research' | 'estimate' | 'default';
  label: string;
  datasetId?: string;
  sourceField?: string;
  retrievedAt?: string;
  confidence?: 'low' | 'medium' | 'high';
  method?: string;
  reportable?: boolean;
  note?: string;
}

export type TechCostMap = {
  recruiting: number;
  onboarding: number;
  payroll: number;
  time: number;
  scheduling: number;
  benefits: number;
  lms: number;
  performance: number;
  other: number;
};

export type FacilityInputSources = Partial<Record<TrackedInputField, InputSourceRecord>>;
export type TechnologyInputSources = Partial<Record<keyof TechCostMap, InputSourceRecord>>;

export interface StrategicOpportunityRefinements {
  staffingConstrainedAdmissions: 'unknown' | 'yes' | 'no';
  cmsObjective: 'unknown' | 'yes' | 'no';
  activeComplianceRemediation: 'unknown' | 'yes' | 'no';
}

export interface FacilityROICalculatorInputs {
  id?: string;
  facilityName: string;
  ccn?: string;
  state?: string;
  chainName?: string;
  certifiedBeds?: number;
  averageResidentsPerDay?: number;
  reportedRnStaffingHprd?: number;
  reportedNurseAideStaffingHprd?: number;
  reportedTotalNurseStaffingHprd?: number;
  headcount: number;
  hourlyRate: number;
  adminLoadedHourlyRate: number;
  turnoverRate: number;
  rnTurnover: number;
  adminTurnover: string;
  overallRating: number;
  staffingRating: number;
  healthInspectionRating: number;
  qualityMeasureRating: number;
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
  inputSources?: FacilityInputSources;
  technologySources?: TechnologyInputSources;
  strategicRefinements?: StrategicOpportunityRefinements;
}

export interface ValueLineItem {
  key: string;
  label: string;
  evidenceClass: EvidenceClassification;
  currentBurden: number;
  attainableImprovement: number;
  paycorAttribution: number;
  annualBenefit: number;
  explanation: string;
  includedInBaseROI: boolean;
}

export interface FacilityROIResults {
  inputs: FacilityROICalculatorInputs;
  valueLineItems: ValueLineItem[];
  totalDirectOpportunity: number;
  totalPaycorInfluencedBenefit: number;
  netAnnualBenefit: number;
  roiPercent: number | null;
  benefitCostRatio: number | null;
  paybackMonths: number | null;
  totalCurrentTechSpend: number;
  totalStrategicUpside: number;
}

export interface PortfolioROIResults {
  facilities: {
    inputs: FacilityROICalculatorInputs;
    results: FacilityROIResults;
  }[];
  facilityCount: number;
  totalHeadcount: number;
  totalDirectOpportunity: number;
  totalPaycorInfluencedBenefit: number;
  totalSoftwareCost: number;
  netAnnualBenefit: number;
  roiPercent: number | null;
  benefitCostRatio: number | null;
  paybackMonths: number | null;
  totalStrategicUpside: number;
}

export interface StrategicOpportunityModuleSummary {
  key: string;
  title: string;
  statusLabel: string;
  currentCondition: string;
  narrative: string;
  methodology: string;
  valueLow: number;
  valueHigh: number;
  valueIncludedInRange: boolean;
}

export interface StrategicOpportunitySummary {
  valueLow: number;
  valueHigh: number;
  disclosure: string;
  modules: StrategicOpportunityModuleSummary[];
}
