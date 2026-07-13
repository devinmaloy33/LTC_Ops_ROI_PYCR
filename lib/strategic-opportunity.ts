import {
  FacilityROICalculatorInputs,
  FacilityROIResults,
  StrategicOpportunityModule,
  StrategicOpportunitySummary,
  StrategicPriority,
} from './roi-types';

const money = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Math.max(0, value || 0));

const number = (value: number, digits = 0) =>
  new Intl.NumberFormat('en-US', {
    maximumFractionDigits: digits,
  }).format(Math.max(0, value || 0));

function priorityFromScore(score: number): StrategicPriority {
  if (score >= 6) return 'high';
  if (score >= 3) return 'moderate';
  return 'lower';
}

function maxZero(value: number | undefined | null): number {
  return Math.max(0, Number.isFinite(Number(value)) ? Number(value) : 0);
}

function cmsPriority(inputs: FacilityROICalculatorInputs): {
  priority: StrategicPriority;
  statusLabel: string;
  score: number;
} {
  let score = 0;
  if (inputs.staffingRating <= 2) score += 3;
  else if (inputs.staffingRating === 3) score += 2;

  if (inputs.turnoverRate >= 60) score += 2;
  else if (inputs.turnoverRate >= 45) score += 1;

  if (inputs.rnTurnover >= 50) score += 1;
  if (inputs.healthDeficiencies >= 10) score += 2;
  else if (inputs.healthDeficiencies >= 5) score += 1;
  if (inputs.totalFines > 0) score += 1;
  if (inputs.weeklyAgencyHours > 0) score += 1;
  if (String(inputs.adminTurnover).toLowerCase() === 'yes') score += 1;

  const priority = priorityFromScore(score);
  const objective = inputs.strategicRefinements?.cmsObjective;
  const protectionMode = objective === 'protect' || (objective !== 'improve' && inputs.overallRating >= 4);
  const prefix = protectionMode ? 'Rating protection' : 'Improvement readiness';
  return {
    priority,
    statusLabel: `${prefix}: ${priority === 'lower' ? 'Lower' : priority === 'moderate' ? 'Moderate' : 'High'} priority`,
    score,
  };
}

export function buildFacilityStrategicOpportunity(args: {
  inputs: FacilityROICalculatorInputs;
  conservative: FacilityROIResults;
  expected: FacilityROIResults;
  opportunity: FacilityROIResults;
}): StrategicOpportunitySummary {
  const { inputs, conservative, expected, opportunity } = args;
  const beds = maxZero(inputs.certifiedBeds);
  const residents = maxZero(inputs.averageResidentsPerDay);
  const availableBeds = beds > 0 && residents >= 0 ? Math.max(0, beds - residents) : null;
  const annualValuePerResident = expected.annualRevenuePerResident;

  const admissionsAnswer = inputs.strategicRefinements?.staffingConstrainedAdmissions || 'unknown';
  const capacityScenarioHigh =
    availableBeds !== null && annualValuePerResident > 0
      ? Math.min(3, Math.floor(availableBeds)) * annualValuePerResident
      : 0;
  const capacityScenarioLow =
    availableBeds !== null && annualValuePerResident > 0 && admissionsAnswer === 'yes'
      ? Math.min(1, Math.floor(availableBeds)) * annualValuePerResident
      : 0;

  const modeledCensusLow =
    conservative.censusGrowthOpportunity;
  const modeledCensusHigh =
    opportunity.censusGrowthOpportunity;
  const censusLow = admissionsAnswer === 'no'
    ? modeledCensusLow
    : Math.max(modeledCensusLow, capacityScenarioLow);
  const censusHigh = admissionsAnswer === 'no'
    ? modeledCensusHigh
    : Math.max(modeledCensusHigh, capacityScenarioHigh);

  let censusPriority: StrategicPriority = 'lower';
  if (admissionsAnswer === 'yes') censusPriority = 'high';
  else if ((availableBeds || 0) >= 5 && (inputs.weeklyAgencyHours > 0 || inputs.overtimeHoursPerYear > 0)) censusPriority = 'high';
  else if ((availableBeds || 0) > 0 || modeledCensusHigh > 0) censusPriority = 'moderate';

  const censusCondition = availableBeds === null
    ? 'CMS bed and average-resident context is unavailable; the range uses only entered census scenarios.'
    : `${number(residents, 1)} average residents across ${number(beds)} certified beds, or approximately ${number(availableBeds, 1)} beds of physical capacity.`;

  const censusModule: StrategicOpportunityModule = {
    key: 'census',
    title: 'Census & Admissions Capacity',
    subtitle: 'Potential value of protecting or supporting occupied resident capacity',
    priority: censusPriority,
    statusLabel:
      admissionsAnswer === 'yes'
        ? 'Staffing-constrained admissions reported'
        : admissionsAnswer === 'no'
          ? 'No staffing-constrained admissions reported'
          : 'Admissions constraint not yet confirmed',
    valueLow: censusLow,
    valueHigh: Math.max(censusLow, censusHigh),
    valueIncludedInRange: true,
    currentCondition: censusCondition,
    narrative:
      annualValuePerResident > 0
        ? `One occupied resident represents approximately ${money(annualValuePerResident)} in annual modeled value. The displayed range is capacity context—not a forecast that Paycor will create admissions.`
        : 'Resident value has not been confirmed, so the tool does not monetize physical bed capacity.',
    methodology:
      'Uses CMS certified beds and average residents/day when available, the entered monthly resident value, and the rating-improvement referral scenario. Historical resident-loss assumptions are not automatically monetized. It limits the automatic capacity illustration to one through three beds.',
    sourceSummary:
      availableBeds === null
        ? 'Prospect or guided-estimate financial inputs; no complete CMS capacity context.'
        : 'CMS certified-bed and average-resident context plus prospect-entered or guided-estimate resident value.',
    paycorInfluence:
      'Recruiting, onboarding, scheduling, workforce visibility and retention tools may help stabilize staffing capacity and reduce avoidable admission constraints.',
    outsidePaycorControl:
      'Referral demand, clinical acuity, licensure, payer mix, market competition, physical capacity and care-delivery decisions remain outside Paycor’s control.',
  };

  const cms = cmsPriority(inputs);
  const cmsModule: StrategicOpportunityModule = {
    key: 'cms',
    title: 'CMS Performance Context',
    subtitle: 'Rating protection or improvement readiness—not a Paycor outcome guarantee',
    priority: cms.priority,
    statusLabel: cms.statusLabel,
    valueLow: 0,
    valueHigh: 0,
    valueIncludedInRange: false,
    currentCondition: `Overall ${inputs.overallRating.toFixed(1)} stars; staffing ${inputs.staffingRating.toFixed(1)} stars; turnover ${inputs.turnoverRate.toFixed(1)}%; ${number(inputs.healthDeficiencies)} recent-cycle health deficiencies.`,
    narrative:
      inputs.overallRating >= 4
        ? 'The strategic emphasis is protecting a strong current position while reducing workforce instability and administrative risk.'
        : 'The strategic emphasis is strengthening workforce and administrative conditions that may support a broader quality-improvement plan.',
    methodology:
      'A transparent readiness score considers staffing rating, nursing and RN turnover, agency use, health deficiencies, fines and administrator turnover. It does not predict a future CMS rating.',
    sourceSummary: 'CMS Five-Star component data where reported, combined with prospect-entered workforce utilization.',
    paycorInfluence:
      'Workforce records, time data, scheduling, onboarding, learning and analytics can support staffing consistency, documentation and management intervention.',
    outsidePaycorControl:
      'Clinical outcomes, survey findings, resident acuity, quality measures and CMS methodology determine actual ratings.',
  };

  const vbpExposure = expected.snfVbpWithholdExposure;
  const vbpLow = conservative.snfVbpRecoveryOpportunity;
  const vbpHigh = opportunity.snfVbpRecoveryOpportunity;
  const vbpPriority: StrategicPriority = vbpExposure >= 100_000 ? 'high' : vbpExposure > 0 ? 'moderate' : 'lower';
  const vbpModule: StrategicOpportunityModule = {
    key: 'vbp',
    title: 'SNF VBP Financial Exposure',
    subtitle: 'Program exposure kept separate from CMS Five-Star ratings',
    priority: vbpPriority,
    statusLabel: vbpExposure > 0 ? `${money(vbpExposure)} modeled 2% withhold exposure` : 'Medicare Part A revenue not yet confirmed',
    valueLow: vbpLow,
    valueHigh: Math.max(vbpLow, vbpHigh),
    valueIncludedInRange: true,
    currentCondition:
      inputs.annualMedicarePartARevenue > 0
        ? `${money(inputs.annualMedicarePartARevenue)} in entered annual Medicare FFS Part A revenue.`
        : 'No confirmed or guided-estimate Medicare FFS Part A revenue is available.',
    narrative:
      vbpExposure > 0
        ? 'The opportunity range represents scenario-modeled recovery or protection of a portion of the statutory 2% withhold exposure. Actual incentive payments depend on CMS achievement and improvement scoring across the program measures and are not predicted here.'
        : 'The tool does not monetize SNF VBP until Medicare Part A revenue is entered or transparently estimated.',
    methodology:
      'Annual Medicare FFS Part A revenue × the statutory 2% withhold exposure × the conservative-to-opportunity recovery assumptions. The model does not imply a simple guaranteed ±2% payment change.',
    sourceSummary: 'Prospect-confirmed or clearly labeled guided-estimate Medicare Part A revenue and scenario assumptions.',
    paycorInfluence:
      'Workforce stability, staffing visibility and process consistency may support broader performance-improvement initiatives.',
    outsidePaycorControl:
      'CMS program measures—including readmissions, infections, discharge, hospitalizations, turnover, staffing hours, function and falls—plus achievement, improvement and payment methodology determine actual results.',
  };

  const remediation = inputs.strategicRefinements?.activeComplianceRemediation || 'unknown';
  const complianceLow = conservative.complianceRiskOpportunity;
  const complianceHigh = opportunity.complianceRiskOpportunity;
  let compliancePriority: StrategicPriority = 'lower';
  if (remediation === 'yes' || inputs.complianceRiskExposure >= 100_000 || inputs.totalFines > 0) compliancePriority = 'high';
  else if (inputs.complianceRiskExposure > 0 || inputs.healthDeficiencies >= 5 || inputs.pbjHoursPerMonth >= 20) compliancePriority = 'moderate';

  const complianceModule: StrategicOpportunityModule = {
    key: 'compliance',
    title: 'Compliance & Survey Readiness',
    subtitle: 'Customer-entered exposure and administrative-risk context',
    priority: compliancePriority,
    statusLabel:
      remediation === 'yes'
        ? 'Active remediation reported'
        : inputs.complianceRiskExposure > 0
          ? `${money(inputs.complianceRiskExposure)} entered exposure scenario`
          : 'No financial exposure scenario entered',
    valueLow: complianceLow,
    valueHigh: Math.max(complianceLow, complianceHigh),
    valueIncludedInRange: true,
    currentCondition: `${number(inputs.pbjHoursPerMonth, 1)} PBJ preparation hours per month; ${number(inputs.healthDeficiencies)} health deficiencies; ${money(inputs.totalFines)} in CMS fines reported by the selected data source when available.`,
    narrative:
      inputs.complianceRiskExposure > 0
        ? 'The range applies scenario reduction assumptions to a customer-entered or guided exposure. It is not an automatic CMS penalty calculation or legal conclusion.'
        : 'The module remains qualitative until the prospect chooses to enter or guide-estimate a compliance exposure scenario.',
    methodology:
      'Uses PBJ labor, CMS deficiencies and fines for risk context. Only the separately entered compliance-exposure scenario is monetized.',
    sourceSummary: 'CMS compliance context plus prospect-entered or guided-estimate scenario data.',
    paycorInfluence:
      'Integrated employee, time, payroll, scheduling and reporting data may reduce manual reconciliation and improve readiness.',
    outsidePaycorControl:
      'Surveyor findings, clinical compliance, legal interpretation, remediation decisions and regulatory enforcement remain outside Paycor’s control.',
  };

  const modules = [censusModule, cmsModule, vbpModule, complianceModule];
  const valueLow = modules
    .filter((module) => module.valueIncludedInRange)
    .reduce((sum, module) => sum + module.valueLow, 0);
  const valueHigh = modules
    .filter((module) => module.valueIncludedInRange)
    .reduce((sum, module) => sum + module.valueHigh, 0);

  return {
    valueLow,
    valueHigh: Math.max(valueLow, valueHigh),
    availableBeds,
    annualValuePerResident,
    highPriorityFacilityCount: modules.some((module) => module.priority === 'high') ? 1 : 0,
    modules,
    disclosure:
      'Strategic downstream opportunity is correlated, multi-causal and excluded from base ROI. It combines scenario-modeled census capacity, SNF VBP recovery and customer-entered compliance exposure. CMS performance is shown qualitatively to avoid double counting or implying causation.',
  };
}

export function buildPortfolioStrategicOpportunity(
  facilities: Array<{
    inputs: FacilityROICalculatorInputs;
    conservative: FacilityROIResults;
    expected: FacilityROIResults;
    opportunity: FacilityROIResults;
  }>,
): StrategicOpportunitySummary {
  const facilitySummaries = facilities.map(buildFacilityStrategicOpportunity);
  const moduleKeys: StrategicOpportunityModule['key'][] = ['census', 'cms', 'vbp', 'compliance'];

  const modules = moduleKeys.map((key): StrategicOpportunityModule => {
    const matching = facilitySummaries
      .map((summary) => summary.modules.find((module) => module.key === key))
      .filter((module): module is StrategicOpportunityModule => Boolean(module));
    const high = matching.filter((module) => module.priority === 'high').length;
    const moderate = matching.filter((module) => module.priority === 'moderate').length;
    const priority: StrategicPriority = high > 0 ? 'high' : moderate > 0 ? 'moderate' : 'lower';
    const first = matching[0];
    const valueLow = matching.reduce((sum, module) => sum + module.valueLow, 0);
    const valueHigh = matching.reduce((sum, module) => sum + module.valueHigh, 0);

    return {
      ...first,
      priority,
      valueLow,
      valueHigh,
      statusLabel: `${high} high-priority and ${moderate} moderate-priority facilit${high + moderate === 1 ? 'y' : 'ies'}`,
      currentCondition: `${matching.length} facilities evaluated using facility-level CMS and discovery inputs.`,
      narrative: `${first.narrative} Portfolio values are summed only where the module is monetized at the facility level.`,
      sourceSummary: 'Facility-level CMS, prospect, consultant and guided-estimate provenance is retained in the detailed report.',
    };
  });

  const valueLow = modules
    .filter((module) => module.valueIncludedInRange)
    .reduce((sum, module) => sum + module.valueLow, 0);
  const valueHigh = modules
    .filter((module) => module.valueIncludedInRange)
    .reduce((sum, module) => sum + module.valueHigh, 0);
  const availableBedValues = facilitySummaries
    .map((summary) => summary.availableBeds)
    .filter((value): value is number => value !== null);

  return {
    valueLow,
    valueHigh: Math.max(valueLow, valueHigh),
    availableBeds:
      availableBedValues.length > 0
        ? availableBedValues.reduce((sum, value) => sum + value, 0)
        : null,
    annualValuePerResident: 0,
    highPriorityFacilityCount: facilitySummaries.filter(
      (summary) => summary.highPriorityFacilityCount > 0,
    ).length,
    modules,
    disclosure:
      'Portfolio strategic opportunity is the sum of facility-level correlated scenarios and remains excluded from base ROI. CMS performance is classified qualitatively and is not separately monetized.',
  };
}
