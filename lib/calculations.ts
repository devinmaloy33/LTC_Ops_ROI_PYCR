import {
  FacilityROICalculatorInputs,
  FacilityROIResults,
  PortfolioROIResults,
  ScenarioAssumptions,
  ValueLineItem,
} from './roi-types';

export function calculateFacilityROI(
  inputs: FacilityROICalculatorInputs,
  assumptions: ScenarioAssumptions,
): FacilityROIResults {
  const headcount = Number(inputs.headcount) || 0;
  const turnoverRate = (Number(inputs.turnoverRate) || 0) / 100;
  const rnTurnover = (Number(inputs.rnTurnover) || 0) / 100;
  const hourlyRate = Number(inputs.hourlyRate) || 0;
  const adminLoadedRate = Number(inputs.adminLoadedHourlyRate) || 0;

  const softwareCost = Number(inputs.softwareCost) || 0;

  const currentTechSpend = Object.values(inputs.currentTechCosts || {}).reduce(
    (sum, val) => sum + (Number(val) || 0),
    0,
  );

  const annualDirectTechAvoided = currentTechSpend * assumptions.retainedTechAvoidedRate;

  const TURNOVER_REPLACEMENT_MULTIPLIER = 0.25;
  const annualSeparations = headcount * turnoverRate;
  const turnoverBaseBurden = annualSeparations * (hourlyRate * 2080 * TURNOVER_REPLACEMENT_MULTIPLIER);
  const annualTurnoverSavings = turnoverBaseBurden * assumptions.turnoverReductionRate;

  const overtimeHours = Number(inputs.overtimeHoursPerYear) || 0;
  const overtimePremiumHourly = hourlyRate * 0.5;
  const overtimeBaseBurden = overtimeHours * overtimePremiumHourly;
  const annualOvertimeSavings = overtimeBaseBurden * assumptions.overtimeReductionRate;

  const weeklyAgencyHours = Number(inputs.weeklyAgencyHours) || 0;
  const agencyHourlyRate = Number(inputs.agencyHourlyRate) || 0;
  const annualAgencyHours = weeklyAgencyHours * 52;
  const agencyPremiumHourly = Math.max(0, agencyHourlyRate - hourlyRate);
  const agencyBaseBurden = annualAgencyHours * agencyPremiumHourly;
  const annualAgencySavings = agencyBaseBurden * assumptions.agencyReductionRate;

  const pbjHoursPerMonth = Number(inputs.pbjHoursPerMonth) || 0;
  const pbjAnnualHours = pbjHoursPerMonth * 12;
  const pbjBaseBurden = pbjAnnualHours * adminLoadedRate;
  const annualPbjSavings = pbjBaseBurden * assumptions.pbjWorkflowReductionRate;

  const valueLineItems: ValueLineItem[] = [
    {
      key: 'turnover',
      label: 'Staff Turnover Reduction',
      evidenceClass: 'influenced',
      currentBurden: turnoverBaseBurden,
      attainableImprovement: assumptions.turnoverReductionRate,
      paycorAttribution: 1.0,
      annualBenefit: annualTurnoverSavings,
      explanation: `Reduces employee separations from ${annualSeparations.toFixed(1)}/yr using a conservative ${TURNOVER_REPLACEMENT_MULTIPLIER * 100}% of fully loaded salary replacement cost benchmark.`,
      includedInBaseROI: true,
    },
    {
      key: 'overtime',
      label: 'Overtime Premium Containment',
      evidenceClass: 'influenced',
      currentBurden: overtimeBaseBurden,
      attainableImprovement: assumptions.overtimeReductionRate,
      paycorAttribution: 1.0,
      annualBenefit: annualOvertimeSavings,
      explanation: `Restricts overtime premium leak. Models only the 0.5x premium over internal hourly labor — not the base wage.`,
      includedInBaseROI: true,
    },
    {
      key: 'agency',
      label: 'Agency Premium Containment',
      evidenceClass: 'influenced',
      currentBurden: agencyBaseBurden,
      attainableImprovement: assumptions.agencyReductionRate,
      paycorAttribution: 1.0,
      annualBenefit: annualAgencySavings,
      explanation: `Reclaims premium spend. Models only the premium above the standard internal rate (${(agencyHourlyRate - hourlyRate) > 0 ? `$${(agencyHourlyRate - hourlyRate).toFixed(2)}` : '$0.00'}/hr) — not the base wage.`,
      includedInBaseROI: true,
    },
    {
      key: 'pbj',
      label: 'PBJ Compliance Labor',
      evidenceClass: 'influenced',
      currentBurden: pbjBaseBurden,
      attainableImprovement: assumptions.pbjWorkflowReductionRate,
      paycorAttribution: 1.0,
      annualBenefit: annualPbjSavings,
      explanation: `Automates Payroll-Based Journal (PBJ) reporting and preparation. Avoids manual labor hours priced at administrative loaded rates.`,
      includedInBaseROI: true,
    },
    {
      key: 'tech',
      label: 'Avoided Legacy Technology',
      evidenceClass: 'direct',
      currentBurden: currentTechSpend,
      attainableImprovement: assumptions.retainedTechAvoidedRate,
      paycorAttribution: 1.0,
      annualBenefit: annualDirectTechAvoided,
      explanation: `Eliminates or reduces overlapping or redundant point solution costs, based on the confirmed retirable percentage.`,
      includedInBaseROI: true,
    },
  ];

  const totalDirectOpportunity = currentTechSpend;
  const totalPaycorInfluencedBenefit = valueLineItems
    .filter((item) => item.includedInBaseROI)
    .reduce((sum, item) => sum + item.annualBenefit, 0);

  const netAnnualBenefit = totalPaycorInfluencedBenefit - softwareCost;

  let roiPercent: number | null = null;
  let benefitCostRatio: number | null = null;
  let paybackMonths: number | null = null;

  if (softwareCost > 0) {
    roiPercent = (netAnnualBenefit / softwareCost) * 100;
    benefitCostRatio = totalPaycorInfluencedBenefit / softwareCost;
    paybackMonths = totalPaycorInfluencedBenefit > 0 ? (softwareCost / totalPaycorInfluencedBenefit) * 12 : null;
  }

  const referralGrowthValue =
    (Number(inputs.referralsPerStarLevel) || 0) *
    (Number(inputs.avgMonthlyResidentValue) || 0) *
    12 *
    assumptions.referralGrowthRate;

  const medicarePartARevenue = Number(inputs.annualMedicarePartARevenue) || 0;
  const snfVbpRecoveryValue = medicarePartARevenue * assumptions.retentionMedicarePartAShare;

  const complianceRiskExposure = Number(inputs.complianceRiskExposure) || 0;
  const complianceMitigationValue = complianceRiskExposure * assumptions.complianceExposureReductionRate;

  const totalStrategicUpside = referralGrowthValue + snfVbpRecoveryValue + complianceMitigationValue;

  return {
    inputs,
    valueLineItems,
    totalDirectOpportunity,
    totalPaycorInfluencedBenefit,
    netAnnualBenefit,
    roiPercent,
    benefitCostRatio,
    paybackMonths,
    totalCurrentTechSpend: currentTechSpend,
    totalStrategicUpside,
  };
}

export function calculatePortfolioROI(
  facilities: FacilityROICalculatorInputs[],
  assumptions: ScenarioAssumptions,
): PortfolioROIResults {
  const calculated = facilities.map((facility) => {
    return {
      inputs: facility,
      results: calculateFacilityROI(facility, assumptions),
    };
  });

  const totalHeadcount = calculated.reduce((sum, item) => sum + (Number(item.inputs.headcount) || 0), 0);
  const totalDirectOpportunity = calculated.reduce((sum, item) => sum + item.results.totalDirectOpportunity, 0);
  const totalPaycorInfluencedBenefit = calculated.reduce((sum, item) => sum + item.results.totalPaycorInfluencedBenefit, 0);
  const totalSoftwareCost = calculated.reduce((sum, item) => sum + (Number(item.inputs.softwareCost) || 0), 0);
  const totalStrategicUpside = calculated.reduce((sum, item) => sum + item.results.totalStrategicUpside, 0);

  const netAnnualBenefit = totalPaycorInfluencedBenefit - totalSoftwareCost;

  let roiPercent: number | null = null;
  let benefitCostRatio: number | null = null;
  let paybackMonths: number | null = null;

  if (totalSoftwareCost > 0) {
    roiPercent = (netAnnualBenefit / totalSoftwareCost) * 100;
    benefitCostRatio = totalPaycorInfluencedBenefit / totalSoftwareCost;
    paybackMonths = totalPaycorInfluencedBenefit > 0 ? (totalSoftwareCost / totalPaycorInfluencedBenefit) * 12 : null;
  }

  return {
    facilities: calculated,
    facilityCount: facilities.length,
    totalHeadcount,
    totalDirectOpportunity,
    totalPaycorInfluencedBenefit,
    totalSoftwareCost,
    netAnnualBenefit,
    roiPercent,
    benefitCostRatio,
    paybackMonths,
    totalStrategicUpside,
  };
}
