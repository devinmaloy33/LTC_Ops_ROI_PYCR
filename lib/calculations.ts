export interface ROICalculatorInputs {
  // General Facility Metrics
  headcount: number;
  hourlyRate: number;
  turnoverRate: number;
  rnTurnover: number;
  totalFines: number;
  healthDeficiencies: number;
  adminTurnover: string; // From CMS data
  
  // Compliance & Premium Cost Drivers
  pbjHours: number;
  overtimeHours: number;
  annualMedicareBilling: number;
  baselineVbpStars: number;
  projectedVbpStars?: number; // Optional user selected target rating

  // Module 3: Agency & Contract Labor
  weeklyAgencyHours: number;
  agencyHourlyRate: number;

  // CMS Star Rating & Referral Census Growth
  referralsPerStarLevel?: number;
  avgResidentValue: number;

  // HR Tech Stack Inputs
  softwareCost: number; // Proposed
  currentTechCosts: { [key: string]: number }; // Total of new tech inputs
  
  // Wizard Pro logic
  pbjAuditFailureActive: boolean;
}

export interface ROICalculatorResults {
  isDefensiveMode: boolean;
  targetCmsStarRating: number | string;
  baselineTurnoverCost: number;
  baselineOvertimeCost: number;
  baselineAgencyCost: number;
  baselinePbjCost: number;
  pbjPenaltyCost: number;
  totalBaselineStaffingBurden: number;
  turnoverSavings: number;
  overtimeSavings: number;
  agencySavings: number;
  pbjSavings: number;
  totalStaffingSavings: number;
  resolvedReferralsLostCurrently: number;
  conservativeNewReferrals: number;
  optimisticNewReferrals: number;
  annualRevenuePerResident: number;
  conservativeReferralRevenueImpact: number;
  optimisticReferralRevenueImpact: number;
  totalCurrentTechSpend: number;
  netInvestment: number;
  totalAnnualImpactConservative: number;
  totalAnnualImpactOptimistic: number;
  roiRatioConservative: number;
  roiRatioOptimistic: number;
  paybackPeriodMonthsConservative: number;
  paybackPeriodMonthsOptimistic: number;
}

export function calculateROIMetrics(inputs: ROICalculatorInputs): ROICalculatorResults {
  const {
    headcount, hourlyRate, turnoverRate, pbjHours, overtimeHours,
    annualMedicareBilling, baselineVbpStars, projectedVbpStars, weeklyAgencyHours,
    agencyHourlyRate, avgResidentValue, softwareCost, pbjAuditFailureActive,
    currentTechCosts
  } = inputs;

  // Calculate total current tech spend
  const totalCurrentTechSpend = currentTechCosts 
    ? Object.values(currentTechCosts).reduce((acc, val) => acc + (Number(val) || 0), 0)
    : 0;

  const costPerTurnover = 6500;
  const currentTurnoverEvents = headcount * (turnoverRate / 100);
  const baselineTurnoverCost = currentTurnoverEvents * costPerTurnover;
  const baselineOvertimeCost = overtimeHours * hourlyRate * 1.5;
  const baselineAgencyCost = weeklyAgencyHours * agencyHourlyRate * 52;
  const baselinePbjCost = pbjHours * hourlyRate;
  
  // PBJ Penalty Logic
  const annualRevenuePerResident = avgResidentValue * 12;
  const pbjPenaltyCost = pbjAuditFailureActive ? (6 * annualRevenuePerResident) : 0; 
  
  const totalBaselineStaffingBurden = baselineTurnoverCost + baselineOvertimeCost + baselineAgencyCost + baselinePbjCost + pbjPenaltyCost;

  const turnoverSavings = baselineTurnoverCost * 0.15;
  const overtimeSavings = baselineOvertimeCost * 0.15;
  const agencySavings = baselineAgencyCost * 0.30;
  const pbjSavings = baselinePbjCost * 0.65;
  const totalStaffingSavings = turnoverSavings + overtimeSavings + agencySavings + pbjSavings;

  const isDefensiveMode = baselineVbpStars >= 4;
  
  // Dynamic Target Calculation using projectedVbpStars if provided
  const resolvedProjectedStars = projectedVbpStars ?? (isDefensiveMode ? baselineVbpStars : Math.min(5, baselineVbpStars + 1));
  let targetCmsStarRating: number | string = resolvedProjectedStars;
  if (isDefensiveMode) {
    targetCmsStarRating = "Protect and Defend Current Rating";
  }

  let resolvedReferralsLostCurrently = 0;
  if (baselineVbpStars === 1 || baselineVbpStars === 2) resolvedReferralsLostCurrently = 24;
  else if (baselineVbpStars === 3) resolvedReferralsLostCurrently = 12;

  // Calculate Star Improvement Delta
  const starImprovement = isDefensiveMode ? 0 : Math.max(0, resolvedProjectedStars - baselineVbpStars);
  const referralsGainedPerStar = inputs.referralsPerStarLevel ?? 2;
  
  // Gained referrals scales by the star improvement factor (min 1 star fallback if active growth strategy)
  const scalingFactor = isDefensiveMode ? 0 : Math.max(1, starImprovement);
  
  const conservativeNewReferrals = scalingFactor * referralsGainedPerStar;
  const optimisticNewReferrals = conservativeNewReferrals * 2;
  
  // VBP Bonus: 1.5% bonus multiplier per Star level increase
  const vbpBonus = isDefensiveMode ? 0 : (scalingFactor * annualMedicareBilling * 0.015);

  const conservativeReferralRevenueImpact = (conservativeNewReferrals * annualRevenuePerResident) + vbpBonus;
  const optimisticReferralRevenueImpact = (optimisticNewReferrals * annualRevenuePerResident) + vbpBonus;

  // Adjusted ROI including total current tech spend as a potential 'reclaimed' cost
  const totalAnnualImpactConservative = totalStaffingSavings + conservativeReferralRevenueImpact + pbjPenaltyCost + totalCurrentTechSpend;
  const totalAnnualImpactOptimistic = totalStaffingSavings + optimisticReferralRevenueImpact + pbjPenaltyCost + totalCurrentTechSpend;

  const netInvestment = softwareCost - totalCurrentTechSpend;
  const roiRatioConservative = netInvestment > 0 ? (totalAnnualImpactConservative / netInvestment) * 100 : 1000;
  const roiRatioOptimistic = netInvestment > 0 ? (totalAnnualImpactOptimistic / netInvestment) * 100 : 1000;

  const paybackPeriodMonthsConservative = totalAnnualImpactConservative > 0 ? (netInvestment > 0 ? (netInvestment / totalAnnualImpactConservative) * 12 : 0) : 12;
  const paybackPeriodMonthsOptimistic = totalAnnualImpactOptimistic > 0 ? (netInvestment > 0 ? (netInvestment / totalAnnualImpactOptimistic) * 12 : 0) : 12;

  return {
    isDefensiveMode, targetCmsStarRating, baselineTurnoverCost, baselineOvertimeCost,
    baselineAgencyCost, baselinePbjCost, pbjPenaltyCost, totalBaselineStaffingBurden,
    turnoverSavings, overtimeSavings, agencySavings, pbjSavings, totalStaffingSavings,
    resolvedReferralsLostCurrently, conservativeNewReferrals, optimisticNewReferrals,
    annualRevenuePerResident, conservativeReferralRevenueImpact, optimisticReferralRevenueImpact,
    totalCurrentTechSpend, netInvestment, totalAnnualImpactConservative, totalAnnualImpactOptimistic,
    roiRatioConservative, roiRatioOptimistic, paybackPeriodMonthsConservative, paybackPeriodMonthsOptimistic
  };
}
