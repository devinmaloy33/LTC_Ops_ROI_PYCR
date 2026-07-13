import {
  AssumptionDefinition,
  ScenarioAssumptions,
  ScenarioKey,
} from './roi-types';

/**
 * Scenario rates are planning assumptions, not Paycor guarantees.
 * The external sources below support the relationship or regulatory context;
 * they do not establish universal customer outcome percentages.
 */
export const DEFAULT_SCENARIO_ASSUMPTIONS: Record<ScenarioKey, ScenarioAssumptions> = {
  conservative: {
    turnoverCostMultiple: 0.25,
    turnoverImprovementRate: 0.04,
    turnoverPaycorAttribution: 0.5,
    overtimeReductionRate: 0.05,
    overtimePaycorAttribution: 0.7,
    agencyReductionRate: 0.08,
    agencyPaycorAttribution: 0.6,
    pbjEfficiencyRate: 0.25,
    pbjPaycorAttribution: 0.85,
    techRetirementRate: 0.25,
    referralCaptureRate: 0.25,
    snfVbpRecoveryRate: 0.05,
    complianceRiskReductionRate: 0.25,
  },
  expected: {
    turnoverCostMultiple: 0.4,
    turnoverImprovementRate: 0.08,
    turnoverPaycorAttribution: 0.65,
    overtimeReductionRate: 0.1,
    overtimePaycorAttribution: 0.8,
    agencyReductionRate: 0.15,
    agencyPaycorAttribution: 0.75,
    pbjEfficiencyRate: 0.45,
    pbjPaycorAttribution: 0.9,
    techRetirementRate: 0.5,
    referralCaptureRate: 0.5,
    snfVbpRecoveryRate: 0.15,
    complianceRiskReductionRate: 0.5,
  },
  opportunity: {
    turnoverCostMultiple: 0.6,
    turnoverImprovementRate: 0.12,
    turnoverPaycorAttribution: 0.75,
    overtimeReductionRate: 0.15,
    overtimePaycorAttribution: 0.9,
    agencyReductionRate: 0.25,
    agencyPaycorAttribution: 0.85,
    pbjEfficiencyRate: 0.6,
    pbjPaycorAttribution: 0.95,
    techRetirementRate: 0.75,
    referralCaptureRate: 0.75,
    snfVbpRecoveryRate: 0.3,
    complianceRiskReductionRate: 0.75,
  },
};

const CMS_FIVE_STAR_URL =
  'https://www.cms.gov/medicare/health-safety-standards/certification-compliance/five-star-quality-rating-system';
const CMS_SNF_VBP_URL =
  'https://www.cms.gov/medicare/quality/nursing-home-improvement/value-based-purchasing';
const CMS_PBJ_URL =
  'https://www.cms.gov/medicare/quality/nursing-home-improvement/staffing-data-submission-pbj';

export const ASSUMPTION_DEFINITIONS: AssumptionDefinition[] = [
  {
    key: 'turnoverCostMultiple',
    label: 'Turnover cost as annual compensation multiple',
    description:
      'Estimates recruiting, onboarding, vacancy, training and early-productivity burden per replacement. Validate against the prospect’s finance or HR data whenever available.',
    evidenceClass: 'influenced',
    sourceKind: 'consultant',
    sourceLabel: 'Scenario-planning input; customer validation preferred',
    isPercentage: true,
    min: 0,
    max: 1.5,
    step: 0.05,
  },
  {
    key: 'turnoverImprovementRate',
    label: 'Attainable turnover improvement',
    description:
      'The portion of current turnover events that may be avoided through stronger recruiting, onboarding, workforce management, learning, engagement and manager visibility.',
    evidenceClass: 'influenced',
    sourceKind: 'consultant',
    sourceLabel: 'Scenario assumption; not a guaranteed Paycor result',
    isPercentage: true,
    min: 0,
    max: 0.5,
    step: 0.01,
  },
  {
    key: 'turnoverPaycorAttribution',
    label: 'Paycor contribution to turnover improvement',
    description:
      'Recognizes that compensation, leadership, local labor supply, workload, clinical operations and culture also affect turnover.',
    evidenceClass: 'influenced',
    sourceKind: 'consultant',
    sourceLabel: 'Causation guardrail; consultant and prospect judgment',
    isPercentage: true,
    min: 0,
    max: 1,
    step: 0.05,
  },
  {
    key: 'overtimeReductionRate',
    label: 'Attainable overtime-premium reduction',
    description:
      'Models reduction in avoidable overtime premium through scheduling, time visibility, exception management and staffing decisions. The calculator conservatively values the premium portion, not all worked hours.',
    evidenceClass: 'influenced',
    sourceKind: 'consultant',
    sourceLabel: 'Scenario assumption; prospect overtime history preferred',
    isPercentage: true,
    min: 0,
    max: 0.75,
    step: 0.01,
  },
  {
    key: 'overtimePaycorAttribution',
    label: 'Paycor contribution to overtime improvement',
    description:
      'Separates platform-enabled visibility and control from census, acuity, vacancies, call-offs and management execution.',
    evidenceClass: 'influenced',
    sourceKind: 'consultant',
    sourceLabel: 'Causation guardrail',
    isPercentage: true,
    min: 0,
    max: 1,
    step: 0.05,
  },
  {
    key: 'agencyReductionRate',
    label: 'Attainable agency-premium reduction',
    description:
      'Models the avoidable premium above comparable internal hourly labor rather than treating all agency spend as removable.',
    evidenceClass: 'influenced',
    sourceKind: 'consultant',
    sourceLabel: 'Scenario assumption; validate with agency invoices and internal wage data',
    isPercentage: true,
    min: 0,
    max: 0.75,
    step: 0.01,
  },
  {
    key: 'agencyPaycorAttribution',
    label: 'Paycor contribution to agency improvement',
    description:
      'Recognizes that local labor supply, occupancy, acuity, vacancies, clinical leadership and staffing strategy also drive agency use.',
    evidenceClass: 'influenced',
    sourceKind: 'consultant',
    sourceLabel: 'Causation guardrail',
    isPercentage: true,
    min: 0,
    max: 1,
    step: 0.05,
  },
  {
    key: 'pbjEfficiencyRate',
    label: 'PBJ administration efficiency',
    description:
      'Models reduced manual preparation, reconciliation and correction time. PBJ is a CMS staffing-data submission requirement; this assumption should be validated against the prospect’s current workflow.',
    evidenceClass: 'direct',
    sourceKind: 'cms',
    sourceLabel: 'CMS PBJ program context; efficiency rate is user-adjustable',
    sourceUrl: CMS_PBJ_URL,
    isPercentage: true,
    min: 0,
    max: 0.9,
    step: 0.01,
  },
  {
    key: 'pbjPaycorAttribution',
    label: 'Paycor contribution to PBJ efficiency',
    description:
      'Represents the portion of attainable administrative savings enabled by integrated time, payroll, employee records and reporting.',
    evidenceClass: 'direct',
    sourceKind: 'consultant',
    sourceLabel: 'Workflow-mapping assumption',
    isPercentage: true,
    min: 0,
    max: 1,
    step: 0.05,
  },
  {
    key: 'techRetirementRate',
    label: 'Technology consolidation opportunity realized',
    description:
      'Applies the confirmed portion of the current fragmented technology stack that can be eliminated, consolidated or not renewed. It is counted once as recurring avoided cost and is not also subtracted from the investment denominator.',
    evidenceClass: 'direct',
    sourceKind: 'prospect',
    sourceLabel: 'Prospect contracts and renewal schedules',
    isPercentage: true,
    min: 0,
    max: 1,
    step: 0.05,
  },
  {
    key: 'referralCaptureRate',
    label: 'Potential referral/census capture',
    description:
      'Applies only to strategic upside. CMS Five-Star ratings include an overall rating and separate health-inspection, staffing and quality-measure ratings; they are not the SNF VBP program.',
    evidenceClass: 'correlated',
    sourceKind: 'cms',
    sourceLabel: 'CMS Five-Star program context; revenue capture is prospect-defined',
    sourceUrl: CMS_FIVE_STAR_URL,
    isPercentage: true,
    min: 0,
    max: 1,
    step: 0.05,
  },
  {
    key: 'snfVbpRecoveryRate',
    label: 'Potential SNF VBP withhold recovery improvement',
    description:
      'Applies only to strategic upside. CMS withholds 2% of Medicare FFS Part A payments to fund SNF VBP and applies incentive payments based on program performance. The calculator does not treat CMS stars as VBP scores.',
    evidenceClass: 'correlated',
    sourceKind: 'cms',
    sourceLabel: 'CMS SNF VBP program; improvement rate is user-adjustable',
    sourceUrl: CMS_SNF_VBP_URL,
    isPercentage: true,
    min: 0,
    max: 1,
    step: 0.05,
  },
  {
    key: 'complianceRiskReductionRate',
    label: 'Potential reduction in user-entered compliance exposure',
    description:
      'Applies only to strategic upside. The prospect must supply the exposure amount; the calculator no longer invents a fixed PBJ penalty or census-loss value.',
    evidenceClass: 'correlated',
    sourceKind: 'prospect',
    sourceLabel: 'Prospect-provided risk estimate',
    isPercentage: true,
    min: 0,
    max: 1,
    step: 0.05,
  },
];

export function getScenarioAssumptions(scenario: ScenarioKey): ScenarioAssumptions {
  return { ...DEFAULT_SCENARIO_ASSUMPTIONS[scenario] };
}
