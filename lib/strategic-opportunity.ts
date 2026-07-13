import {
  FacilityROICalculatorInputs,
  FacilityROIResults,
  StrategicOpportunityModule,
  StrategicOpportunitySummary,
  StrategicRefinements,
} from './roi-types';

interface FacilityStrategicOpportunityPayload {
  inputs: FacilityROICalculatorInputs;
  conservative: FacilityROIResults;
  expected: FacilityROIResults;
  opportunity: FacilityROIResults;
  refinements?: StrategicRefinements;
}

interface PortfolioOpportunityItem {
  inputs: FacilityROICalculatorInputs;
  conservative: FacilityROIResults;
  expected: FacilityROIResults;
  opportunity: FacilityROIResults;
}

const money = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Math.max(0, value || 0));

export function buildFacilityStrategicOpportunity(
  payload: FacilityStrategicOpportunityPayload,
): StrategicOpportunitySummary {
  const { inputs, conservative, expected, opportunity } = payload;

  const currentOverallRating = inputs.overallRating || 1;
  const targetOverallRating = inputs.projectedOverallRating || currentOverallRating;
  const starDelta = expected.cmsStarDelta;

  // 1. Census Growth Opportunity
  const censusValueHigh = opportunity.censusGrowthOpportunity;
  const censusValueLow = conservative.censusGrowthOpportunity;
  const censusPriority = inputs.overallRating < 3 ? 'high' : 'moderate';
  const censusStatusLabel = currentOverallRating >= 4.5
    ? `Protecting premium status (${currentOverallRating.toFixed(1)} Stars)`
    : `Modeling ${currentOverallRating.toFixed(1)} → ${targetOverallRating.toFixed(1)} Star improvement`;
  const censusCurrentCondition = `Current overall rating is ${currentOverallRating.toFixed(1)} Stars. Referrals are modeled at ${inputs.referralsPerStarLevel} additional residents/month per star-level increase.`;
  const censusNarrative = `Improving clinical stability can support a target rating of ${targetOverallRating.toFixed(1)} Stars. Modeling ${starDelta.toFixed(1)} Stars of positive improvement can capture an estimated ${expected.referralResidentsCaptured.toFixed(1)} additional resident beds annually, yielding up to ${money(censusValueHigh)} in potential gross revenue.`;

  // 2. CMS Star Rating Protection
  const cmsValueHigh = expected.censusGrowthOpportunity * 0.5;
  const cmsValueLow = conservative.censusGrowthOpportunity * 0.5;
  const cmsPriority = currentOverallRating >= 4 ? 'high' : 'moderate';
  const cmsStatusLabel = currentOverallRating >= 4
    ? 'Protecting premium rating'
    : 'Improvement scenario active';
  const cmsCurrentCondition = `Current overall rating is ${currentOverallRating.toFixed(1)} Stars, with a staffing rating of ${inputs.staffingRating.toFixed(1)} Stars. Staffing turnover and HPRD shortfalls are primary drivers of CMS rating downgrades.`;
  const cmsNarrative = `For a ${currentOverallRating.toFixed(1)}-Star facility, preventing a single-star downgrade is estimated to protect up to ${money(cmsValueHigh)} in annual referral value. Clinical stability is critical to safeguarding the current market position.`;

  // 3. SNF VBP Opportunity
  const vbpValueHigh = opportunity.snfVbpRecoveryOpportunity;
  const vbpValueLow = conservative.snfVbpRecoveryOpportunity;
  const vbpPriority = inputs.annualMedicarePartARevenue > 1_000_000 ? 'high' : 'moderate';
  const vbpStatusLabel = `Medicare Part A withhold exposure: ${money(expected.snfVbpWithholdExposure)}`;
  const vbpCurrentCondition = `Annual Medicare Part A revenue is ${money(inputs.annualMedicarePartARevenue)}, exposing ${money(expected.snfVbpWithholdExposure)} to the mandatory 2.0% CMS VBP withhold based on readmission measures.`;
  const vbpNarrative = `The 2.0% mandatory withhold exposes ${money(expected.snfVbpWithholdExposure)} of Medicare Part A billings. Modeling a standard staffing-driven readmission improvement scenario shows a potential withhold recovery of ${money(vbpValueLow)} to ${money(vbpValueHigh)}.`;

  // 4. Compliance Exposure
  const complianceValueHigh = opportunity.complianceRiskOpportunity;
  const complianceValueLow = conservative.complianceRiskOpportunity;
  const compliancePriority = inputs.totalFines > 20_000 || inputs.healthDeficiencies > 12 ? 'high' : 'moderate';
  const complianceStatusLabel = inputs.totalFines > 0
    ? `${money(inputs.totalFines)} in historical CMS fines detected`
    : 'No recent historical fines reported';
  const complianceCurrentCondition = `This facility has accumulated ${inputs.healthDeficiencies} health deficiencies and ${money(inputs.totalFines)} in CMS-reported fines over the last 3-year cycle.`;
  const complianceNarrative = inputs.complianceRiskExposure > 0
    ? `Modeling the prospect's estimated compliance risk scenario of ${money(inputs.complianceRiskExposure)} shows a potential risk reduction value of ${money(complianceValueLow)} to ${money(complianceValueHigh)} under the selected assumptions.`
    : 'Historical fines serve as context. To model compliance-risk mitigation, enter a specific risk scenario (remediation labor, professional fees or census disruption) under the Workforce or Financial drivers.';

  const modules: StrategicOpportunityModule[] = [
    {
      key: 'census',
      title: 'Clinical Capacity & Census Growth',
      subtitle: 'CMS Five-Star rating and nursing stability',
      priority: censusPriority,
      valueIncludedInRange: censusValueHigh > 0,
      valueLow: censusValueLow,
      valueHigh: censusValueHigh,
      statusLabel: censusStatusLabel,
      currentCondition: censusCurrentCondition,
      narrative: censusNarrative,
      methodology: 'Applies star-level referral increases only to positive overall rating deltas. Revenue uses average monthly resident value × captured referrals.',
      sourceSummary: 'CMS Five-Star Rating System guidelines; customer-validated resident value.',
      paycorInfluence: 'Provides scheduling, training and retention analytics that support staffing consistency.',
      outsidePaycorControl: 'Compensation, clinical leadership, local labor supply and competitor positioning.',
    },
    {
      key: 'cms',
      title: 'Five-Star Rating Protection',
      subtitle: 'Shielding premium commercial and referral positioning',
      priority: cmsPriority,
      valueIncludedInRange: cmsValueHigh > 0,
      valueLow: cmsValueLow,
      valueHigh: cmsValueHigh,
      statusLabel: cmsStatusLabel,
      currentCondition: cmsCurrentCondition,
      narrative: cmsNarrative,
      methodology: 'Values single-star protection at 50% of the potential star-improvement census growth scenario.',
      sourceSummary: 'CMS Five-Star Rating System guidelines.',
      paycorInfluence: 'Retention tools and scheduling compliance help maintain the required staffing ratios.',
      outsidePaycorControl: 'Clinical outcomes, survey inspector decisions and resident satisfaction.',
    },
    {
      key: 'vbp',
      title: 'Value-Based Purchasing (SNF VBP)',
      subtitle: 'Withhold recovery via workforce-driven readmission control',
      priority: vbpPriority,
      valueIncludedInRange: vbpValueHigh > 0,
      valueLow: vbpValueLow,
      valueHigh: vbpValueHigh,
      statusLabel: vbpStatusLabel,
      currentCondition: vbpCurrentCondition,
      narrative: vbpNarrative,
      methodology: 'Applies recovery improvement rate to the mandatory 2.0% Medicare Part A withhold exposure.',
      sourceSummary: 'CMS Skilled Nursing Facility Value-Based Purchasing Program.',
      paycorInfluence: 'Consistent scheduling and training support clinical teamwork, which correlates with fewer readmissions.',
      outsidePaycorControl: 'Clinical protocols, physician decisions and resident acuity.',
    },
    {
      key: 'compliance',
      title: 'Survey & Compliance Risk Mitigation',
      subtitle: 'Safeguarding operations against citations and administrative fines',
      priority: compliancePriority,
      valueIncludedInRange: complianceValueHigh > 0,
      valueLow: complianceValueLow,
      valueHigh: complianceValueHigh,
      statusLabel: complianceStatusLabel,
      currentCondition: complianceCurrentCondition,
      narrative: complianceNarrative,
      methodology: 'Applies risk-reduction rate to the user-entered compliance exposure scenario.',
      sourceSummary: 'Historical CMS Provider Data health survey fines.',
      paycorInfluence: 'Provides accurate PBJ electronic records, license tracking and mandatory training compliance.',
      outsidePaycorControl: 'Clinical compliance, survey team judgment and individual employee actions.',
    },
  ];

  const valueHigh = censusValueHigh + cmsValueHigh + vbpValueHigh + complianceValueHigh;
  const valueLow = censusValueLow + cmsValueLow + vbpValueLow + complianceValueLow;

  const isHighPriority =
    inputs.overallRating < 3 ||
    inputs.annualMedicarePartARevenue > 500_000 ||
    inputs.totalFines > 10_000 ||
    inputs.healthDeficiencies > 15;

  return {
    valueLow,
    valueHigh,
    highPriorityFacilityCount: isHighPriority ? 1 : 0,
    modules,
    disclosure:
      'Strategic downstream values are displayed separately from base ROI. These outcomes are correlated with workforce stability and operational maturity; Paycor may influence these areas but does not independently cause or guarantee these financial results.',
  };
}

export function buildPortfolioStrategicOpportunity(
  facilities: PortfolioOpportunityItem[],
): StrategicOpportunitySummary {
  const summaries = facilities.map((f) =>
    buildFacilityStrategicOpportunity({
      inputs: f.inputs,
      conservative: f.conservative,
      expected: f.expected,
      opportunity: f.opportunity,
    }),
  );

  const valueLow = summaries.reduce((sum, s) => sum + s.valueLow, 0);
  const valueHigh = summaries.reduce((sum, s) => sum + s.valueHigh, 0);
  const highPriorityFacilityCount = summaries.reduce((sum, s) => sum + s.highPriorityFacilityCount, 0);

  // Combine the modules from all facilities by summing their values
  const baseSummary = summaries[0];
  if (!baseSummary) {
    return {
      valueLow: 0,
      valueHigh: 0,
      highPriorityFacilityCount: 0,
      modules: [],
      disclosure: '',
    };
  }

  const combinedModules = baseSummary.modules.map((baseMod) => {
    const key = baseMod.key;
    const keySummaries = summaries.map((s) => s.modules.find((m) => m.key === key)!);

    const mValueLow = keySummaries.reduce((sum, m) => sum + m.valueLow, 0);
    const mValueHigh = keySummaries.reduce((sum, m) => sum + m.valueHigh, 0);

    const priorities = keySummaries.map((m) => m.priority);
    const priority = (priorities.includes('high')
      ? 'high'
      : priorities.includes('moderate')
      ? 'moderate'
      : 'lower') as 'high' | 'lower' | 'moderate';

    const highPriorityCountForModule = keySummaries.filter((m) => m.priority === 'high').length;

    let statusLabel = '';
    let currentCondition = '';
    let narrative = '';

    if (key === 'census') {
      statusLabel = `Modeling portfolio overall CMS rating stability and growth`;
      currentCondition = `Weighted average rating is ${
        (facilities.reduce((sum, f) => sum + f.inputs.overallRating * f.inputs.headcount, 0) /
          (facilities.reduce((sum, f) => sum + f.inputs.headcount, 0) || 1)).toFixed(1)
      } Stars across ${facilities.length} properties.`;
      narrative = `Clinical quality and census growth potential of ${money(mValueLow)} to ${money(mValueHigh)} in annual gross revenue across the portfolio based on nursing workforce stabilization.`;
    } else if (key === 'cms') {
      statusLabel = `Rating protection active across ${facilities.length} facilities`;
      currentCondition = `${facilities.filter((f) => f.inputs.overallRating >= 4).length} premium properties rated 4.0 Stars or higher are at risk.`;
      narrative = `Protecting commercial and referral network status is estimated to defend up to ${money(mValueHigh)} in annual gross value portfolio-wide.`;
    } else if (key === 'vbp') {
      const totalExposure = facilities.reduce((sum, f) => sum + f.expected.snfVbpWithholdExposure, 0);
      statusLabel = `SNF VBP portfolio withhold exposure: ${money(totalExposure)}`;
      currentCondition = `Mandatory 2.0% CMS withhold applied to Medicare Part A billings.`;
      narrative = `Workforce-driven readmission improvement scenarios show a portfolio withhold recovery potential of ${money(mValueLow)} to ${money(mValueHigh)} annually.`;
    } else {
      const totalFines = facilities.reduce((sum, f) => sum + f.inputs.totalFines, 0);
      const totalDeficiencies = facilities.reduce((sum, f) => sum + f.inputs.healthDeficiencies, 0);
      statusLabel = totalFines > 0
        ? `${money(totalFines)} in historical CMS-reported fines portfolio-wide`
        : 'Survey risk protection active';
      currentCondition = `Portfolio properties have accumulated ${totalDeficiencies} health deficiencies and ${money(totalFines)} in CMS fines.`;
      narrative = `Mitigating labor documentation, scheduling and PBJ compliance risk protects against citations and census-loss exposure.`;
    }

    return {
      ...baseMod,
      priority,
      valueLow: mValueLow,
      valueHigh: mValueHigh,
      statusLabel,
      currentCondition,
      narrative,
    };
  });

  return {
    valueLow,
    valueHigh,
    highPriorityFacilityCount,
    modules: combinedModules,
    disclosure:
      'Strategic downstream values are displayed separately from base ROI. These outcomes are correlated with workforce stability and operational maturity; Paycor may influence these areas but does not independently cause or guarantee these financial results.',
  };
}
