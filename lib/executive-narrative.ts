import { AnalysisMode, FacilityROICalculatorInputs, FacilityROIResults, PortfolioROIResults, StrategicOpportunitySummary } from './roi-types';

export interface ExecutiveNarrativeInput {
  mode: AnalysisMode;
  targetAudience: string;
  facility: FacilityROICalculatorInputs;
  facilityResults: FacilityROIResults;
  portfolioResults?: PortfolioROIResults;
  strategicOpportunity: StrategicOpportunitySummary;
  customerReady: boolean;
}

export interface ExecutiveNarrative {
  headline: string;
  paragraphs: string[];
  topDriver: string;
  breakEvenStatement: string;
  nextStep: string;
}

const money = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Math.max(0, value || 0));

function audienceLens(targetAudience: string) {
  const audience = targetAudience.toLowerCase();
  if (/cfo|finance|financial|controller/.test(audience)) {
    return {
      identity: 'protecting operating margin while maintaining the workforce infrastructure required for reliable care delivery',
      emphasis: 'margin protection, payback, and the defensibility of each modeled benefit',
    };
  }
  if (/chro|human resources|hr |people/.test(audience)) {
    return {
      identity: 'building a stable workforce while giving managers better visibility and employees a more consistent experience',
      emphasis: 'retention, manager capacity, workforce stability, and adoption',
    };
  }
  if (/cio|technology|information|it /.test(audience)) {
    return {
      identity: 'simplifying the employee-technology environment without sacrificing data integrity, security, or operational continuity',
      emphasis: 'platform consolidation, integrations, data governance, and administrative support burden',
    };
  }
  if (/coo|operations|administrator/.test(audience)) {
    return {
      identity: 'maintaining dependable staffing, operational continuity, and the capacity to serve residents',
      emphasis: 'staffing reliability, labor control, compliance readiness, and admissions capacity',
    };
  }
  if (/cno|clinical|nursing/.test(audience)) {
    return {
      identity: 'supporting consistent clinical staffing and reducing administrative friction around workforce records and scheduling',
      emphasis: 'staffing consistency, documentation, readiness, and care-team support',
    };
  }
  if (/ceo|owner|president|board/.test(audience)) {
    return {
      identity: 'balancing enterprise resilience, growth, workforce risk, and responsible capital allocation',
      emphasis: 'enterprise value, scalability, operating risk, and strategic flexibility',
    };
  }
  return {
    identity: 'balancing workforce stability, financial discipline, operational continuity, and resident-service capacity',
    emphasis: 'a balanced financial, workforce, and operating view',
  };
}

export function buildExecutiveNarrative(input: ExecutiveNarrativeInput): ExecutiveNarrative {
  const { mode, targetAudience, facility, facilityResults, portfolioResults, strategicOpportunity, customerReady } = input;
  const lens = audienceLens(targetAudience || 'executive leadership team');
  const isPortfolio = mode === 'portfolio' && portfolioResults;
  const baseBenefit = isPortfolio ? portfolioResults.totalPaycorInfluencedBenefit : facilityResults.totalPaycorInfluencedBenefit;
  const investment = isPortfolio ? portfolioResults.totalSoftwareCost : facilityResults.softwareCost;
  const netBenefit = isPortfolio ? portfolioResults.netAnnualBenefit : facilityResults.netAnnualBenefit;
  const breakEven = isPortfolio ? portfolioResults.breakEvenRealizationRate : facilityResults.breakEvenRealizationRate;
  const facilityCount = isPortfolio ? portfolioResults.facilityCount : 1;
  const organizationName = isPortfolio
    ? facility.chainName || `${facilityCount}-facility portfolio`
    : facility.chainName || facility.facilityName;

  const lineItems = isPortfolio
    ? portfolioResults.facilities.flatMap((item) => item.results.valueLineItems.filter((line) => line.includedInBaseROI))
    : facilityResults.valueLineItems.filter((line) => line.includedInBaseROI);
  const driverTotals = lineItems.reduce<Record<string, number>>((totals, line) => {
    totals[line.label] = (totals[line.label] || 0) + line.annualBenefit;
    return totals;
  }, {});
  const [topDriver = 'workforce and technology improvement', topDriverValue = 0] =
    Object.entries(driverTotals).sort((left, right) => right[1] - left[1])[0] || [];

  const breakEvenStatement = breakEven === null
    ? 'An approved annual investment is still required before ROI, benefit-cost ratio, and payback can be finalized.'
    : `The investment reaches break-even if approximately ${(breakEven * 100).toFixed(0)}% of the modeled annual benefit is realized.`;

  const strategicText = strategicOpportunity.valueHigh > 0
    ? `A separate correlated strategic range of ${money(strategicOpportunity.valueLow)}–${money(strategicOpportunity.valueHigh)} provides context for census capacity, SNF VBP exposure, and compliance readiness; it is not included in base ROI.`
    : 'Strategic downstream value remains qualitative until the relevant financial inputs are confirmed.';

  // The sequence below intentionally reflects identity, business context, and decision autonomy.
  // Those internal construction labels never appear in the customer-facing output.
  const paragraphs = [
    `For the ${targetAudience || 'executive leadership team'} responsible for ${lens.identity}, this assessment is designed to separate measurable operational value from longer-term possibilities rather than blending every outcome into one headline number.`,
    `${organizationName} shows ${money(baseBenefit)} in annual Paycor-influenced benefit under the selected scenario, led by ${topDriver.toLowerCase()} (${money(topDriverValue)}). Against an annual investment of ${money(investment)}, the modeled net annual benefit is ${money(netBenefit)}. ${breakEvenStatement} The decision lens emphasizes ${lens.emphasis}.`,
    `${strategicText} Leadership can validate the remaining estimated inputs, confirm implementation scope, and decide which opportunities are sufficiently supported to include in the final investment case.${customerReady ? '' : ' This version should remain a planning draft until the flagged inputs are confirmed or approved.'}`,
  ];

  return {
    headline: isPortfolio
      ? `${organizationName} Workforce Value Assessment`
      : `${facility.facilityName} Workforce Value Assessment`,
    paragraphs,
    topDriver,
    breakEvenStatement,
    nextStep: customerReady
      ? 'Review the implementation scope, agree on measurement owners, and establish a 90- and 180-day value-validation plan.'
      : 'Confirm the flagged workforce, pricing, and financial inputs before sharing the final customer-ready business case.',
  };
}
