import {
  FacilityROICalculatorInputs,
  FacilityROIResults,
  PortfolioROIResults,
  ScenarioAssumptions,
  ValueLineItem,
} from './roi-types';

const ANNUAL_WORK_HOURS = 2080;
const WEEKS_PER_YEAR = 52;
const MONTHS_PER_YEAR = 12;
const OVERTIME_PREMIUM_RATE = 0.5;
const SNF_VBP_WITHHOLD_RATE = 0.02;

function finite(value: number | undefined | null): number {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function nonNegative(value: number | undefined | null): number {
  return Math.max(0, finite(value));
}

function rate(value: number | undefined | null): number {
  return Math.min(1, Math.max(0, finite(value)));
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + nonNegative(value), 0);
}

export function calculateFacilityROI(
  rawInputs: FacilityROICalculatorInputs,
  rawAssumptions: ScenarioAssumptions,
): FacilityROIResults {
  const inputs: FacilityROICalculatorInputs = {
    ...rawInputs,
    currentTechCosts: rawInputs.currentTechCosts ?? {
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
  };

  const assumptions: ScenarioAssumptions = {
    ...rawAssumptions,
    turnoverCostMultiple: nonNegative(rawAssumptions.turnoverCostMultiple),
    turnoverImprovementRate: rate(rawAssumptions.turnoverImprovementRate),
    turnoverPaycorAttribution: rate(rawAssumptions.turnoverPaycorAttribution),
    overtimeReductionRate: rate(rawAssumptions.overtimeReductionRate),
    overtimePaycorAttribution: rate(rawAssumptions.overtimePaycorAttribution),
    agencyReductionRate: rate(rawAssumptions.agencyReductionRate),
    agencyPaycorAttribution: rate(rawAssumptions.agencyPaycorAttribution),
    pbjEfficiencyRate: rate(rawAssumptions.pbjEfficiencyRate),
    pbjPaycorAttribution: rate(rawAssumptions.pbjPaycorAttribution),
    techRetirementRate: rate(rawAssumptions.techRetirementRate),
    referralCaptureRate: rate(rawAssumptions.referralCaptureRate),
    snfVbpRecoveryRate: rate(rawAssumptions.snfVbpRecoveryRate),
    complianceRiskReductionRate: rate(rawAssumptions.complianceRiskReductionRate),
  };

  const headcount = nonNegative(inputs.headcount);
  const hourlyRate = nonNegative(inputs.hourlyRate);
  const adminLoadedHourlyRate = nonNegative(inputs.adminLoadedHourlyRate || hourlyRate);
  const turnoverRate = Math.max(0, finite(inputs.turnoverRate)) / 100;

  const annualCompensationPerEmployee = hourlyRate * ANNUAL_WORK_HOURS;
  const estimatedCostPerTurnover =
    annualCompensationPerEmployee * assumptions.turnoverCostMultiple;
  const estimatedTurnoverEvents = headcount * turnoverRate;
  const baselineTurnoverBurden = estimatedTurnoverEvents * estimatedCostPerTurnover;

  // Conservative methodology: value only the 0.5x overtime premium because the
  // underlying productive hour may still need to be covered at straight time.
  const baselineOvertimePremium =
    nonNegative(inputs.overtimeHoursPerYear) * hourlyRate * OVERTIME_PREMIUM_RATE;

  // Conservative methodology: value only the premium paid above internal hourly labor.
  const agencyPremiumPerHour = Math.max(
    0,
    nonNegative(inputs.agencyHourlyRate) - hourlyRate,
  );
  const baselineAgencyPremium =
    nonNegative(inputs.weeklyAgencyHours) * agencyPremiumPerHour * WEEKS_PER_YEAR;

  const baselinePbjAdminCost =
    nonNegative(inputs.pbjHoursPerMonth) *
    MONTHS_PER_YEAR *
    adminLoadedHourlyRate;

  const totalCurrentTechSpend = sum(
    Object.values(inputs.currentTechCosts).map((value) => finite(value)),
  );

  const totalDirectOpportunity = sum([
    baselineTurnoverBurden,
    baselineOvertimePremium,
    baselineAgencyPremium,
    baselinePbjAdminCost,
    totalCurrentTechSpend,
  ]);

  const turnoverBenefit =
    baselineTurnoverBurden *
    assumptions.turnoverImprovementRate *
    assumptions.turnoverPaycorAttribution;
  const overtimeBenefit =
    baselineOvertimePremium *
    assumptions.overtimeReductionRate *
    assumptions.overtimePaycorAttribution;
  const agencyBenefit =
    baselineAgencyPremium *
    assumptions.agencyReductionRate *
    assumptions.agencyPaycorAttribution;
  const pbjBenefit =
    baselinePbjAdminCost *
    assumptions.pbjEfficiencyRate *
    assumptions.pbjPaycorAttribution;
  const retiredTechBenefit =
    totalCurrentTechSpend * assumptions.techRetirementRate;

  const totalPaycorInfluencedBenefit = sum([
    turnoverBenefit,
    overtimeBenefit,
    agencyBenefit,
    pbjBenefit,
    retiredTechBenefit,
  ]);

  const softwareCost = nonNegative(inputs.softwareCost);
  const netAnnualBenefit = totalPaycorInfluencedBenefit - softwareCost;
  const roiPercent =
    softwareCost > 0 ? (netAnnualBenefit / softwareCost) * 100 : null;
  const benefitCostRatio =
    softwareCost > 0 ? totalPaycorInfluencedBenefit / softwareCost : null;
  const paybackMonths =
    softwareCost > 0 && totalPaycorInfluencedBenefit > 0
      ? (softwareCost / totalPaycorInfluencedBenefit) * MONTHS_PER_YEAR
      : null;
  const breakEvenRealizationRate =
    softwareCost > 0 && totalPaycorInfluencedBenefit > 0
      ? Math.min(1, softwareCost / totalPaycorInfluencedBenefit)
      : null;

  const overallRating = Math.min(5, Math.max(1, finite(inputs.overallRating) || 1));
  const projectedOverallRating = Math.min(
    5,
    Math.max(1, finite(inputs.projectedOverallRating) || overallRating),
  );
  const cmsStarDelta = Math.max(0, projectedOverallRating - overallRating);
  const annualRevenuePerResident =
    nonNegative(inputs.avgMonthlyResidentValue) * MONTHS_PER_YEAR;

  const referralResidentsCaptured =
    cmsStarDelta *
    nonNegative(inputs.referralsPerStarLevel) *
    assumptions.referralCaptureRate;
  const censusGrowthOpportunity =
    referralResidentsCaptured * annualRevenuePerResident;
  // SNF VBP is deliberately separate from CMS Five-Star ratings.
  const snfVbpWithholdExposure =
    nonNegative(inputs.annualMedicarePartARevenue) * SNF_VBP_WITHHOLD_RATE;
  const snfVbpRecoveryOpportunity =
    snfVbpWithholdExposure * assumptions.snfVbpRecoveryRate;

  // No invented PBJ penalty: this strategic value requires a prospect-entered exposure.
  const complianceRiskOpportunity =
    nonNegative(inputs.complianceRiskExposure) *
    assumptions.complianceRiskReductionRate;

  const totalStrategicUpside = sum([
    censusGrowthOpportunity,
    snfVbpRecoveryOpportunity,
    complianceRiskOpportunity,
  ]);
  const potentialEnterpriseValue =
    totalPaycorInfluencedBenefit + totalStrategicUpside;

  const valueLineItems: ValueLineItem[] = [
    {
      key: 'turnover',
      label: 'Turnover cost avoidance',
      evidenceClass: 'influenced',
      currentBurden: baselineTurnoverBurden,
      attainableImprovement: assumptions.turnoverImprovementRate,
      paycorAttribution: assumptions.turnoverPaycorAttribution,
      annualBenefit: turnoverBenefit,
      includedInBaseROI: true,
      explanation:
        'Recruiting, onboarding, workforce management, learning, engagement and analytics can influence retention, while leadership, compensation, labor supply and clinical operations remain material drivers.',
    },
    {
      key: 'overtime',
      label: 'Overtime premium reduction',
      evidenceClass: 'influenced',
      currentBurden: baselineOvertimePremium,
      attainableImprovement: assumptions.overtimeReductionRate,
      paycorAttribution: assumptions.overtimePaycorAttribution,
      annualBenefit: overtimeBenefit,
      includedInBaseROI: true,
      explanation:
        'Values only the avoidable 0.5x premium and applies a Paycor contribution factor for scheduling, time visibility and exception management.',
    },
    {
      key: 'agency',
      label: 'Agency premium reduction',
      evidenceClass: 'influenced',
      currentBurden: baselineAgencyPremium,
      attainableImprovement: assumptions.agencyReductionRate,
      paycorAttribution: assumptions.agencyPaycorAttribution,
      annualBenefit: agencyBenefit,
      includedInBaseROI: true,
      explanation:
        'Values only the agency premium above internal hourly labor and recognizes that local labor supply, occupancy and clinical staffing strategy also drive agency use.',
    },
    {
      key: 'pbj',
      label: 'PBJ administration efficiency',
      evidenceClass: 'direct',
      currentBurden: baselinePbjAdminCost,
      attainableImprovement: assumptions.pbjEfficiencyRate,
      paycorAttribution: assumptions.pbjPaycorAttribution,
      annualBenefit: pbjBenefit,
      includedInBaseROI: true,
      explanation:
        'Represents reduced manual preparation, reconciliation and correction time through integrated time, payroll, employee records and reporting.',
    },
    {
      key: 'technology',
      label: 'Technology consolidation opportunity',
      evidenceClass: 'direct',
      currentBurden: totalCurrentTechSpend,
      attainableImprovement: assumptions.techRetirementRate,
      paycorAttribution: 1,
      annualBenefit: retiredTechBenefit,
      includedInBaseROI: true,
      explanation:
        'Includes only confirmed recurring systems that can be eliminated, consolidated or not renewed. It is counted once and is not also subtracted from the investment denominator.',
    },
    {
      key: 'strategic',
      label: 'Strategic downstream opportunity',
      evidenceClass: 'correlated',
      currentBurden: 0,
      attainableImprovement: 0,
      paycorAttribution: 0,
      annualBenefit: totalStrategicUpside,
      includedInBaseROI: false,
      explanation:
        'Includes customer-entered or scenario-modeled census, CMS-rating protection, SNF VBP and compliance exposure. It is displayed separately from base ROI.',
    },
  ];

  return {
    annualCompensationPerEmployee,
    estimatedCostPerTurnover,
    estimatedTurnoverEvents,
    baselineTurnoverBurden,
    baselineOvertimePremium,
    baselineAgencyPremium,
    baselinePbjAdminCost,
    totalCurrentTechSpend,
    totalDirectOpportunity,
    turnoverBenefit,
    overtimeBenefit,
    agencyBenefit,
    pbjBenefit,
    retiredTechBenefit,
    totalPaycorInfluencedBenefit,
    softwareCost,
    netAnnualBenefit,
    roiPercent,
    benefitCostRatio,
    paybackMonths,
    breakEvenRealizationRate,
    cmsStarDelta,
    annualRevenuePerResident,
    referralResidentsCaptured,
    censusGrowthOpportunity,
    snfVbpWithholdExposure,
    snfVbpRecoveryOpportunity,
    complianceRiskOpportunity,
    totalStrategicUpside,
    potentialEnterpriseValue,
    valueLineItems,
  };
}

export function calculatePortfolioROI(
  facilities: FacilityROICalculatorInputs[],
  assumptions: ScenarioAssumptions,
): PortfolioROIResults {
  const calculatedFacilities = facilities.map((inputs) => ({
    inputs,
    results: calculateFacilityROI(inputs, assumptions),
  }));

  const totalHeadcount = sum(facilities.map((facility) => facility.headcount));
  const weightedTurnoverRate =
    totalHeadcount > 0
      ? facilities.reduce(
          (total, facility) =>
            total + nonNegative(facility.turnoverRate) * nonNegative(facility.headcount),
          0,
        ) / totalHeadcount
      : 0;
  const weightedOverallRating =
    totalHeadcount > 0
      ? facilities.reduce(
          (total, facility) =>
            total + nonNegative(facility.overallRating) * nonNegative(facility.headcount),
          0,
        ) / totalHeadcount
      : 0;

  const totalDirectOpportunity = sum(
    calculatedFacilities.map(({ results }) => results.totalDirectOpportunity),
  );
  const totalPaycorInfluencedBenefit = sum(
    calculatedFacilities.map(({ results }) => results.totalPaycorInfluencedBenefit),
  );
  const totalSoftwareCost = sum(
    calculatedFacilities.map(({ results }) => results.softwareCost),
  );
  const netAnnualBenefit = totalPaycorInfluencedBenefit - totalSoftwareCost;
  const roiPercent =
    totalSoftwareCost > 0 ? (netAnnualBenefit / totalSoftwareCost) * 100 : null;
  const benefitCostRatio =
    totalSoftwareCost > 0
      ? totalPaycorInfluencedBenefit / totalSoftwareCost
      : null;
  const paybackMonths =
    totalSoftwareCost > 0 && totalPaycorInfluencedBenefit > 0
      ? (totalSoftwareCost / totalPaycorInfluencedBenefit) * MONTHS_PER_YEAR
      : null;
  const breakEvenRealizationRate =
    totalSoftwareCost > 0 && totalPaycorInfluencedBenefit > 0
      ? Math.min(1, totalSoftwareCost / totalPaycorInfluencedBenefit)
      : null;
  const totalStrategicUpside = sum(
    calculatedFacilities.map(({ results }) => results.totalStrategicUpside),
  );

  return {
    facilityCount: facilities.length,
    totalHeadcount,
    weightedTurnoverRate,
    weightedOverallRating,
    totalDirectOpportunity,
    totalPaycorInfluencedBenefit,
    totalSoftwareCost,
    netAnnualBenefit,
    roiPercent,
    benefitCostRatio,
    paybackMonths,
    breakEvenRealizationRate,
    totalStrategicUpside,
    potentialEnterpriseValue:
      totalPaycorInfluencedBenefit + totalStrategicUpside,
    facilities: calculatedFacilities,
  };
}

/**
 * Backward-compatible aliases for components that still import the original names.
 * New code should use FacilityROICalculatorInputs, FacilityROIResults and
 * calculateFacilityROI directly.
 */
export type ROICalculatorInputs = FacilityROICalculatorInputs;
export type ROICalculatorResults = FacilityROIResults;
