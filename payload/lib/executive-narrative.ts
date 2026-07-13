import {
  AnalysisMode,
  FacilityROICalculatorInputs,
  FacilityROIResults,
  PortfolioROIResults,
  StrategicOpportunitySummary,
} from './roi-types';

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
      identity: 'protecting operating margin while funding the workforce infrastructure required for dependable care delivery',
      emphasis: 'margin protection, payback, and the defensibility of the modeled benefit',
    };
  }
  if (/chro|human resources|hr |people/.test(audience)) {
    return {
      identity: 'building a stable workforce while increasing manager capacity and improving the employee experience',
      emphasis: 'retention, workforce stability, manager capacity, and adoption',
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
      identity: 'supporting consistent clinical staffing while reducing administrative friction around workforce records and scheduling',
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
  const {
    mode,
    targetAudience,
    facility,
    facilityResults,
    portfolioResults,
    strategicOpportunity,
    customerReady,
  } = input;
  const lens = audienceLens(targetAudience || 'executive leadership team');
  const isPortfolio = mode === 'portfolio' && Boolean(portfolioResults);
  const baseBenefit = isPortfolio
    ? portfolioResults!.totalPaycorInfluencedBenefit
    : facilityResults.totalPaycorInfluencedBenefit;
  const investment = isPortfolio
    ? portfolioResults!.totalSoftwareCost
    : facilityResults.softwareCost;
  const netBenefit = isPortfolio
    ? portfolioResults!.netAnnualBenefit
    : facilityResults.netAnnualBenefit;
  const breakEven = isPortfolio
    ? portfolioResults!.breakEvenRealizationRate
    : facilityResults.breakEvenRealizationRate;
  const facilityCount = isPortfolio ? portfolioResults!.facilityCount : 1;
  const organizationName = isPortfolio
    ? facility.chainName || `${facilityCount}-facility portfolio`
    : facility.chainName || facility.facilityName;

  const lineItems = isPortfolio
    ? portfolioResults!.facilities.flatMap((item) =>
        item.results.valueLineItems.filter((line) => line.includedInBaseROI),
      )
    : facilityResults.valueLineItems.filter((line) => line.includedInBaseROI);
  const driverTotals = lineItems.reduce<Record<string, number>>((totals, line) => {
    totals[line.label] = (totals[line.label] || 0) + line.annualBenefit;
    return totals;
  }, {});
  const [topDriver = 'workforce and technology improvement', topDriverValue = 0] =
    Object.entries(driverTotals).sort((left, right) => right[1] - left[1])[0] || [];

  const breakEvenStatement =
    breakEven === null
      ? 'Approved annual pricing is still required before ROI, benefit-cost ratio, and payback can be finalized.'
      : `The investment reaches break-even if approximately ${(breakEven * 100).toFixed(0)}% of the modeled annual benefit is realized.`;

  const strategicText =
    strategicOpportunity.valueHigh > 0
      ? `A separate strategic business-context range of ${money(strategicOpportunity.valueLow)} to ${money(strategicOpportunity.valueHigh)} is disclosed for census capacity, SNF VBP exposure, and compliance readiness. It is not included in base ROI.`
      : 'Strategic business context remains qualitative until the relevant financial inputs are confirmed.';

  // This sequence aligns the message with the audience's role, supplies verified
  // business context, and preserves the prospect's decision autonomy. The internal
  // construction framework is never named in customer-facing output.
  const paragraphs = [
    `What leadership is managing: The ${targetAudience || 'executive leadership team'} is responsible for ${lens.identity}.`,
    `What the model indicates: ${organizationName} shows ${money(baseBenefit)} in annual Paycor-influenced benefit under the selected scenario, led by ${topDriver.toLowerCase()} (${money(topDriverValue)}). Against ${money(investment)} in annual investment, modeled net annual benefit is ${money(netBenefit)}. ${breakEvenStatement}`,
    `What leadership controls: ${strategicText} Leadership can validate the remaining estimates, confirm implementation scope, and decide which opportunities are sufficiently supported for the final investment case.${customerReady ? '' : ' This assessment should remain a planning draft until flagged inputs are confirmed or approved.'}`,
  ];

  return {
    headline: isPortfolio
      ? `${organizationName}: ${money(baseBenefit)} in modeled annual Paycor-influenced value`
      : `${facility.facilityName}: ${money(baseBenefit)} in modeled annual Paycor-influenced value`,
    paragraphs,
    topDriver,
    breakEvenStatement,
    nextStep: customerReady
      ? `Review the implementation scope through the lens of ${lens.emphasis}, assign measurement owners, and establish 90- and 180-day value reviews.`
      : 'Confirm the flagged workforce, pricing, and financial inputs before sharing the customer-ready business case.',
  };
}
