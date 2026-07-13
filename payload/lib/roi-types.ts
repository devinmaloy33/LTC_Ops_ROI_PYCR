export type AnalysisMode = 'facility' | 'portfolio';
export type ScenarioKey = 'conservative' | 'expected' | 'opportunity';
export type EstimateConfidence = 'high' | 'medium' | 'low';
export type EvidenceClass = 'direct' | 'influenced' | 'correlated';
export type SourceKind = 'cms' | 'prospect' | 'consultant';
export type TurnoverCostMethod = 'compensation-percentage' | 'fixed';
export type TurnoverPopulation = 'nursing' | 'entire';

export type TrackedInputField =
  | 'facilityName'
  | 'facilityAddress'
  | 'city'
  | 'state'
  | 'zip'
  | 'ccn'
  | 'chainName'
  | 'chainFacilities'
  | 'headcount'
  | 'hourlyRate'
  | 'adminLoadedHourlyRate'
  | 'turnoverRate'
  | 'rnTurnover'
  | 'adminTurnover'
  | 'turnoverCostMethod'
  | 'fixedTurnoverCost'
  | 'turnoverPopulation'
  | 'nursingWorkforceShare'
  | 'certifiedBeds'
  | 'averageResidentsPerDay'
  | 'reportedRnStaffingHprd'
  | 'reportedNurseAideStaffingHprd'
  | 'reportedTotalNurseStaffingHprd'
  | 'overtimeHoursPerYear'
  | 'weeklyAgencyHours'
  | 'agencyHourlyRate'
  | 'pbjHoursPerMonth'
  | 'overallRating'
  | 'staffingRating'
  | 'healthInspectionRating'
  | 'qualityMeasureRating'
  | 'projectedOverallRating'
  | 'referralsPerStarLevel'
  | 'avgMonthlyResidentValue'
  | 'annualMedicarePartARevenue'
  | 'complianceRiskExposure'
  | 'totalFines'
  | 'healthDeficiencies'
  | 'softwareCost';

export interface InputSourceRecord {
  source: 'cms' | 'prospect' | 'consultant' | 'calculated' | 'research' | 'estimate' | 'default';
  label: string;
  datasetId?: string;
  sourceField?: string;
  retrievedAt?: string;
  confidence?: EstimateConfidence;
  method?: string;
  note?: string;
  drivers?: Record<string, string | number | boolean>;
  reportable?: boolean;
  requiresConfirmation?: boolean;
}

export type FacilityInputSources = Partial<Record<TrackedInputField, InputSourceRecord>>;
export type TechnologyInputSources = Partial<Record<keyof TechCostMap, InputSourceRecord>>;

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

export interface FacilityROICalculatorInputs {
  id?: string;
  facilityName: string;
  facilityAddress?: string;
  city?: string;
  state?: string;
  zip?: string;
  ccn?: string;
  chainName?: string;
  chainFacilities?: number;

  headcount: number;
  hourlyRate: number;
  adminLoadedHourlyRate: number;
  turnoverRate: number;
  rnTurnover: number;
  adminTurnover: string;
  turnoverCostMethod?: TurnoverCostMethod;
  fixedTurnoverCost?: number;
  turnoverPopulation?: TurnoverPopulation;
  nursingWorkforceShare?: number;

  certifiedBeds?: number;
  averageResidentsPerDay?: number;
  reportedRnStaffingHprd?: number;
  reportedNurseAideStaffingHprd?: number;
  reportedTotalNurseStaffingHprd?: number;

  overtimeHoursPerYear: number;
  weeklyAgencyHours: number;
  agencyHourlyRate: number;
  pbjHoursPerMonth: number;

  overallRating: number;
  staffingRating: number;
  healthInspectionRating: number;
  qualityMeasureRating: number;
  projectedOverallRating: number;
  referralsPerStarLevel: number;
  avgMonthlyResidentValue: number;
  annualMedicarePartARevenue: number;
  complianceRiskExposure: number;
  totalFines: number;
  healthDeficiencies: number;

  softwareCost: number;
  currentTechCosts: TechCostMap;
  inputSources?: FacilityInputSources;
  strategicRefinements?: StrategicRefinements;
  technologySources?: TechnologyInputSources;
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
  turnoverEligibleHeadcount: number;
  turnoverPopulationLabel: string;
  turnoverCostMethodLabel: string;
  baselineTurnoverBurden: number;
  baselineOvertimePremium: number;
  baselineAgencyPremium: number;
  baselinePbjAdminCost: number;
  totalCurrentTechSpend: number;
  totalDirectOpportunity: number;

  weeklyOvertimeHours: number;
  overtimeHoursPerEmployeePerWeek: number;
  overtimeShareOfPaidHours: number;
  overtimeFteEquivalent: number;
  agencyFteEquivalent: number;
  pbjAdminDaysPerYear: number;
  monthlyCurrentOperatingBurden: number;
  monthlyPaycorInfluencedOpportunity: number;

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
  breakEvenRealizationRate: number | null;

  cmsStarDelta: number;
  annualRevenuePerResident: number;
  referralResidentsCaptured: number;
  censusGrowthOpportunity: number;
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
  breakEvenRealizationRate: number | null;
  totalStrategicUpside: number;
  potentialEnterpriseValue: number;
  facilities: Array<{
    inputs: FacilityROICalculatorInputs;
    results: FacilityROIResults;
  }>;
}

export interface StrategicOpportunityModule {
  key: 'census' | 'cms' | 'vbp' | 'compliance';
  title: string;
  subtitle: string;
  priority: 'lower' | 'moderate' | 'high';
  valueIncludedInRange: boolean;
  valueLow: number;
  valueHigh: number;
  statusLabel: string;
  currentCondition: string;
  narrative: string;
  methodology: string;
  sourceSummary: string;
  paycorInfluence: string;
  outsidePaycorControl: string;
}

export interface StrategicOpportunitySummary {
  valueLow: number;
  valueHigh: number;
  highPriorityFacilityCount: number;
  modules: StrategicOpportunityModule[];
  disclosure: string;
}

export interface StrategicRefinements {
  staffingConstrainedAdmissions?: 'unknown' | 'yes' | 'no';
  cmsObjective?: 'unknown' | 'protect' | 'improve';
  activeComplianceRemediation?: 'unknown' | 'yes' | 'no';
}
