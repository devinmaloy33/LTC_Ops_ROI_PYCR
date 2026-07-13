export type AnalysisMode = 'facility' | 'portfolio';
export type ScenarioKey = 'conservative' | 'expected' | 'opportunity';
export type EvidenceClass = 'direct' | 'influenced' | 'correlated';
export type EstimateConfidence = 'low' | 'medium' | 'high';
export type SourceKind =
  | 'prospect'
  | 'cms'
  | 'research'
  | 'consultant'
  | 'calculated'
  | 'estimate'
  | 'default';

export type StrategicYesNoUnknown = 'yes' | 'no' | 'unknown';
export type CmsStrategicObjective = 'protect' | 'improve' | 'unknown';

export interface StrategicRefinements {
  staffingConstrainedAdmissions?: StrategicYesNoUnknown;
  cmsObjective?: CmsStrategicObjective;
  activeComplianceRemediation?: StrategicYesNoUnknown;
}

export type TrackedInputField =
  | 'facilityName'
  | 'facilityAddress'
  | 'city'
  | 'state'
  | 'zip'
  | 'ccn'
  | 'chainName'
  | 'chainFacilities'
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
  | 'complianceRiskExposure'
  | 'softwareCost';

export interface InputSourceRecord {
  source: SourceKind;
  label: string;
  datasetId?: string;
  sourceField?: string;
  retrievedAt?: string;
  note?: string;
  confidence?: EstimateConfidence;
  method?: string;
  drivers?: Record<string, string | number | boolean>;
  reportable?: boolean;
  requiresConfirmation?: boolean;
}

export type FacilityInputSources = Partial<
  Record<TrackedInputField, InputSourceRecord>
>;

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

export type TechnologyInputSources = Partial<
  Record<keyof TechCostMap, InputSourceRecord>
>;

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
  section?: 'base' | 'advanced' | 'strategic';
}

export interface FacilityROICalculatorInputs {
  id?: string;
  ccn?: string;
  facilityName: string;
  facilityAddress?: string;
  city?: string;
  state?: string;
  zip?: string;
  chainName?: string;
  chainFacilities?: number;

  // CMS facility context. These fields improve guided estimates and the strategic
  // narrative but are never treated as employee or financial actuals.
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
  complianceRiskExposure: number;

  softwareCost: number;
  currentTechCosts: TechCostMap;
  inputSources?: FacilityInputSources;
  technologySources?: TechnologyInputSources;
  strategicRefinements?: StrategicRefinements;
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

export type StrategicModuleKey = 'census' | 'cms' | 'vbp' | 'compliance';
export type StrategicPriority = 'lower' | 'moderate' | 'high';

export interface StrategicOpportunityModule {
  key: StrategicModuleKey;
  title: string;
  subtitle: string;
  priority: StrategicPriority;
  statusLabel: string;
  valueLow: number;
  valueHigh: number;
  valueIncludedInRange: boolean;
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
  availableBeds: number | null;
  annualValuePerResident: number;
  highPriorityFacilityCount: number;
  modules: StrategicOpportunityModule[];
  disclosure: string;
}
