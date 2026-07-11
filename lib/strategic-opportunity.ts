import {
  FacilityROICalculatorInputs,
  FacilityROIResults,
  StrategicOpportunityModuleSummary,
  StrategicOpportunitySummary,
} from './roi-types';

const DISCLOSURE_TEXT =
  'Strategic Downstream Opportunities model long-term outcomes correlated with leadership, local market factors, clinician alignment, and clinical-operating execution. These outcomes are separate from direct administrative or technology-consolidation savings and are excluded from base business-case ROI.';

const money = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value || 0);

interface BuildContext {
  inputs: FacilityROICalculatorInputs;
  conservative: FacilityROIResults;
  expected: FacilityROIResults;
  opportunity: FacilityROIResults;
}

function buildCensusModule(context: BuildContext): StrategicOpportunityModuleSummary {
  const { inputs, conservative, expected, opportunity } = context;
  const isConstrained = inputs.strategicRefinements?.staffingConstrainedAdmissions === 'yes';
  const isNo = inputs.strategicRefinements?.staffingConstrainedAdmissions === 'no';

  const monthlyResidentValue = inputs.avgMonthlyResidentValue;
  const referralsPerStarLevel = inputs.referralsPerStarLevel;

  const lowReferrals = referralsPerStarLevel * conservative.inputs.projectedOverallRating;
  const highReferrals = referralsPerStarLevel * opportunity.inputs.projectedOverallRating;

  const valueLow = isNo ? 0 : lowReferrals * monthlyResidentValue * 12 * 0.1;
  const valueHigh = isNo ? 0 : highReferrals * monthlyResidentValue * 12 * 0.3;

  const currentCondition = `The facility currently has an overall rating of ${inputs.overallRating.toFixed(1)} Stars, operating with an average of ${inputs.averageResidentsPerDay?.toFixed(1) || 'N/A'} residents per day. Staffing turnover is ${inputs.turnoverRate.toFixed(1)}% (RN turnover: ${inputs.rnTurnover.toFixed(1)}%).`;

  let statusLabel = 'Potential Upside';
  let narrative = `An overall rating increase can create additional referrals. Modeling ${referralsPerStarLevel} additional monthly referrals per Star rating level, with a conservative 10%–30% conversion rate into long-term admissions.`;

  if (isConstrained) {
    statusLabel = 'Validated Strategic Priority';
    narrative = `The team confirmed staffing shortages actively limit admissions. Stable, well-scheduled staffing is a prerequisite to capture the modeled ${referralsPerStarLevel} referrals per Star level, with a 10%–30% conversion rate into active resident admissions.`;
  } else if (isNo) {
    statusLabel = 'Excluded — At Max Physical Capacity';
    narrative = `The facility is confirmed to be operating at full physical capacity. Consequently, any referral increase from a rating change is excluded from the strategic value range.`;
  }

  return {
    key: 'census',
    title: 'Census & Admissions Capacity',
    statusLabel,
    currentCondition,
    narrative,
    methodology: `Models (${referralsPerStarLevel} referrals/Star × projected Star change × $${monthlyResidentValue.toLocaleString()}/resident month × 12 months) × conversion rate (10%–30%). Excluded if at max capacity.`,
    valueLow,
    valueHigh,
    valueIncludedInRange: !isNo,
  };
}

function buildCmsPerformanceModule(context: BuildContext): StrategicOpportunityModuleSummary {
  const { inputs } = context;
  const isCmsObjective = inputs.strategicRefinements?.cmsObjective === 'yes';

  const currentCondition = `The overall rating is ${inputs.overallRating.toFixed(1)} Stars. Component ratings: Staffing is ${inputs.staffingRating.toFixed(1)} Stars, Health Inspection is ${inputs.healthInspectionRating?.toFixed(1) || 'N/A'} Stars, and Quality Measure is ${inputs.qualityMeasureRating?.toFixed(1) || 'N/A'} Stars. Annual general turnover is ${inputs.turnoverRate.toFixed(1)}%.`;

  let statusLabel = 'Qualitative Context Only';
  let narrative = `CMS Five-Star Ratings are multi-dimensional. Ratings are determined by staffing hours per resident day (HPRD), nursing turnover rates, health inspection citation severity, and clinical quality metrics. Better retention and scheduling tools support staffing-rating stability, but do not guarantee rating adjustments.`;

  if (isCmsObjective) {
    statusLabel = 'Core Strategic Initiative';
    narrative = `The client identified improving Five-Star levels as an active corporate goal. Scheduling precision, automated PBJ auditing, and staffing stability are designed to directly address the HPRD and turnover metrics that represent major components of the CMS rating algorithm.`;
  }

  return {
    key: 'cms',
    title: 'CMS Performance Context',
    statusLabel,
    currentCondition,
    narrative,
    methodology: 'Qualitative context. Rating-related value is not independently monetized here to prevent double counting through referral or reimbursement modules.',
    valueLow: 0,
    valueHigh: 0,
    valueIncludedInRange: false,
  };
}

function buildVbpModule(context: BuildContext): StrategicOpportunityModuleSummary {
  const { inputs, conservative, opportunity } = context;

  const medicarePartARevenue = inputs.annualMedicarePartARevenue;
  const valueLow = medicarePartARevenue * 0.005;
  const valueHigh = medicarePartARevenue * 0.02;

  const currentCondition = `The facility reports $${medicarePartARevenue.toLocaleString()} in annual Medicare FFS Part A revenue, with ${inputs.rnTurnover.toFixed(1)}% RN turnover and an overall CMS rating of ${inputs.overallRating.toFixed(1)} Stars.`;

  const statusLabel = 'Correlated Financial Exposure';
  const narrative = `The Skilled Nursing Facility Value-Based Purchasing (SNF VBP) Program adjusts Medicare Part A reimbursement by up to +2.0% or −2.0% based on hospital readmission rates and staffing turnover stability. Stable staffing directly correlates with reduced readmissions and better VBP scores.`;

  return {
    key: 'vbp',
    title: 'SNF VBP Financial Exposure',
    statusLabel,
    currentCondition,
    narrative,
    methodology: `Models a potential 0.5%–2.0% reimbursement recovery or protection on the reported $${medicarePartARevenue.toLocaleString()} annual Medicare Fee-For-Service Part A billing.`,
    valueLow,
    valueHigh,
    valueIncludedInRange: medicarePartARevenue > 0,
  };
}

function buildComplianceModule(context: BuildContext): StrategicOpportunityModuleSummary {
  const { inputs } = context;
  const isRemediation = inputs.strategicRefinements?.activeComplianceRemediation === 'yes';

  const exposure = inputs.complianceRiskExposure;
  const valueLow = exposure * 0.25;
  const valueHigh = exposure * 0.75;

  const currentCondition = `The facility has reported ${inputs.healthDeficiencies} health inspection deficiencies and $${inputs.totalFines.toLocaleString()} in recent CMS fines or penalties. The prospect-estimated compliance risk exposure is $${exposure.toLocaleString()}.`;

  let statusLabel = 'Correlated Risk Mitigation';
  let narrative = `Incomplete payroll records, scheduling gaps, and manual PBJ report mistakes can cause license issues, corrective action costs, and direct CMS fines. Stable, audited records mitigate these operational risks.`;

  if (isRemediation) {
    statusLabel = 'Validated Remediation Priority';
    narrative = `The facility is actively managing an open corrective plan or acute fine risk. Implementing an audited, automated scheduling and PBJ compliance system is a primary strategic requirement to resolve current citations and prevent escalating penalties.`;
  }

  return {
    key: 'compliance',
    title: 'Compliance & Survey Readiness',
    statusLabel,
    currentCondition,
    narrative,
    methodology: `Models a potential 25%–75% reduction in the prospect-estimated $${exposure.toLocaleString()} compliance exposure, backed by complete payroll records and automated PBJ reporting.`,
    valueLow,
    valueHigh,
    valueIncludedInRange: exposure > 0,
  };
}

export function buildFacilityStrategicOpportunity(
  context: BuildContext,
): StrategicOpportunitySummary {
  const modules = [
    buildCensusModule(context),
    buildCmsPerformanceModule(context),
    buildVbpModule(context),
    buildComplianceModule(context),
  ];

  const valueLow = modules
    .filter((mod) => mod.valueIncludedInRange)
    .reduce((sum, mod) => sum + mod.valueLow, 0);
  const valueHigh = modules
    .filter((mod) => mod.valueIncludedInRange)
    .reduce((sum, mod) => sum + mod.valueHigh, 0);

  return {
    valueLow,
    valueHigh,
    disclosure: DISCLOSURE_TEXT,
    modules,
  };
}

export function buildPortfolioStrategicOpportunity(
  facilities: BuildContext[],
): StrategicOpportunitySummary {
  const portfolioModules: Record<string, {
    key: string;
    title: string;
    valueLow: number;
    valueHigh: number;
    valueIncludedInRange: boolean;
    conditions: string[];
    narratives: string[];
  }> = {
    census: { key: 'census', title: 'Census & Admissions Capacity', valueLow: 0, valueHigh: 0, valueIncludedInRange: false, conditions: [], narratives: [] },
    cms: { key: 'cms', title: 'CMS Performance Context', valueLow: 0, valueHigh: 0, valueIncludedInRange: false, conditions: [], narratives: [] },
    vbp: { key: 'vbp', title: 'SNF VBP Financial Exposure', valueLow: 0, valueHigh: 0, valueIncludedInRange: false, conditions: [], narratives: [] },
    compliance: { key: 'compliance', title: 'Compliance & Survey Readiness', valueLow: 0, valueHigh: 0, valueIncludedInRange: false, conditions: [], narratives: [] },
  };

  let totalBeds = 0;
  let totalResidents = 0;
  let activeCensusFacilities = 0;
  let activeVbpRevenue = 0;
  let totalDeficiencies = 0;
  let totalFines = 0;
  let totalComplianceExposure = 0;

  let validatedAdmissionsCount = 0;
  let excludedAdmissionsCount = 0;
  let validatedCmsObjectivesCount = 0;
  let validatedComplianceRemediationsCount = 0;

  facilities.forEach((context) => {
    const { inputs } = context;
    totalBeds += inputs.certifiedBeds || 0;
    totalResidents += inputs.averageResidentsPerDay || 0;
    activeVbpRevenue += inputs.annualMedicarePartARevenue || 0;
    totalDeficiencies += inputs.healthDeficiencies || 0;
    totalFines += inputs.totalFines || 0;
    totalComplianceExposure += inputs.complianceRiskExposure || 0;

    const isConstrained = inputs.strategicRefinements?.staffingConstrainedAdmissions === 'yes';
    const isNo = inputs.strategicRefinements?.staffingConstrainedAdmissions === 'no';
    if (isConstrained) validatedAdmissionsCount++;
    if (isNo) excludedAdmissionsCount++;

    const isCmsObjective = inputs.strategicRefinements?.cmsObjective === 'yes';
    if (isCmsObjective) validatedCmsObjectivesCount++;

    const isRemediation = inputs.strategicRefinements?.activeComplianceRemediation === 'yes';
    if (isRemediation) validatedComplianceRemediationsCount++;

    const facilityCensus = buildCensusModule(context);
    portfolioModules.census.valueLow += facilityCensus.valueLow;
    portfolioModules.census.valueHigh += facilityCensus.valueHigh;
    if (facilityCensus.valueIncludedInRange) {
      portfolioModules.census.valueIncludedInRange = true;
      activeCensusFacilities++;
    }

    const facilityVbp = buildVbpModule(context);
    portfolioModules.vbp.valueLow += facilityVbp.valueLow;
    portfolioModules.vbp.valueHigh += facilityVbp.valueHigh;
    if (facilityVbp.valueIncludedInRange) {
      portfolioModules.vbp.valueIncludedInRange = true;
    }

    const facilityCompliance = buildComplianceModule(context);
    portfolioModules.compliance.valueLow += facilityCompliance.valueLow;
    portfolioModules.compliance.valueHigh += facilityCompliance.valueHigh;
    if (facilityCompliance.valueIncludedInRange) {
      portfolioModules.compliance.valueIncludedInRange = true;
    }
  });

  const count = facilities.length;

  const censusModule: StrategicOpportunityModuleSummary = {
    key: 'census',
    title: 'Census & Admissions Capacity',
    statusLabel: validatedAdmissionsCount > 0 ? 'Validated Strategic Priority' : 'Potential Upside',
    currentCondition: `Across the portfolio of ${count} facilities, average daily census is ${totalResidents.toFixed(1)} residents (total certified beds: ${totalBeds}).`,
    narrative: `Automating scheduling and stabilising retention directly supports admissions capacity. ${validatedAdmissionsCount} locations report admissions are actively constrained by clinical staffing levels. ${excludedAdmissionsCount} locations are excluded due to maximum physical capacity.`,
    methodology: `Aggregate of each facility: (referrals/Star × projected Star change × monthly resident value × 12 months) × conversion rate (10%–30%). Excludes facilities at max capacity.`,
    valueLow: portfolioModules.census.valueLow,
    valueHigh: portfolioModules.census.valueHigh,
    valueIncludedInRange: portfolioModules.census.valueIncludedInRange,
  };

  const cmsModule: StrategicOpportunityModuleSummary = {
    key: 'cms',
    title: 'CMS Performance Context',
    statusLabel: validatedCmsObjectivesCount > 0 ? 'Core Strategic Initiative' : 'Qualitative Context Only',
    currentCondition: `${validatedCmsObjectivesCount} out of ${count} facilities have active corporate objectives to improve or stabilize their CMS Star ratings.`,
    narrative: `A stable workforce with automated PBJ auditing directly addresses the clinical retention and staffing turnover metrics within the CMS Five-Star algorithm. Component ratings are not monetized independently here to prevent double counting.`,
    methodology: 'Qualitative context only. Excluded from quantitative valuation.',
    valueLow: 0,
    valueHigh: 0,
    valueIncludedInRange: false,
  };

  const vbpModule: StrategicOpportunityModuleSummary = {
    key: 'vbp',
    title: 'SNF VBP Financial Exposure',
    statusLabel: 'Correlated Financial Exposure',
    currentCondition: `The portfolio reports $${activeVbpRevenue.toLocaleString()} in annual Medicare Fee-For-Service Part A revenue.`,
    narrative: `The SNF VBP program modifies Medicare Part A payments by up to +2.0% or -2.0% based on nursing turnover stability and hospital readmission rates. Supporting clinical staffing stability directly correlates with readmission risk reduction and positive VBP adjustments.`,
    methodology: `Aggregate of each facility: potential 0.5%–2.0% reimbursement recovery or protection on Medicare Part A revenue.`,
    valueLow: portfolioModules.vbp.valueLow,
    valueHigh: portfolioModules.vbp.valueHigh,
    valueIncludedInRange: portfolioModules.vbp.valueIncludedInRange,
  };

  const complianceModule: StrategicOpportunityModuleSummary = {
    key: 'compliance',
    title: 'Compliance & Survey Readiness',
    statusLabel: validatedComplianceRemediationsCount > 0 ? 'Validated Remediation Priority' : 'Correlated Risk Mitigation',
    currentCondition: `The portfolio reports ${totalDeficiencies} total health deficiencies and $${totalFines.toLocaleString()} in recent CMS penalties. Prospect-estimated compliance exposure across the facilities is $${totalComplianceExposure.toLocaleString()}.`,
    narrative: `${validatedComplianceRemediationsCount} locations are managing active compliance remediation or corrective action plans. Automated payroll auditing and direct PBJ filing reduce administrative errors, survey stress, and fine risks.`,
    methodology: `Aggregate of each facility: potential 25%–75% reduction in the prospect-estimated $${totalComplianceExposure.toLocaleString()} compliance exposure.`,
    valueLow: portfolioModules.compliance.valueLow,
    valueHigh: portfolioModules.compliance.valueHigh,
    valueIncludedInRange: portfolioModules.compliance.valueIncludedInRange,
  };

  const modules = [censusModule, cmsModule, vbpModule, complianceModule];

  const valueLow = modules
    .filter((mod) => mod.valueIncludedInRange)
    .reduce((sum, mod) => sum + mod.valueLow, 0);
  const valueHigh = modules
    .filter((mod) => mod.valueIncludedInRange)
    .reduce((sum, mod) => sum + mod.valueHigh, 0);

  return {
    valueLow,
    valueHigh,
    disclosure: DISCLOSURE_TEXT,
    modules,
  };
}
