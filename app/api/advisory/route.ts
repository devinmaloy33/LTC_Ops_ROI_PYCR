import { NextRequest, NextResponse } from 'next/server';
import { getGemini } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      mode,
      facility,
      facilityResults,
      portfolioResults,
      scenario,
      assumptions,
      proposerName,
      proposerTitle,
      targetAudience,
      strategicOpportunity,
    } = body;

    if (!facility || !facilityResults || !assumptions) {
      return NextResponse.json(
        { error: 'Missing facility, results or assumptions.' },
        { status: 400 },
      );
    }

    const isPortfolio = mode === 'portfolio';
    const results = isPortfolio ? portfolioResults : facilityResults;
    if (!results) {
      return NextResponse.json(
        { error: 'Missing calculated results.' },
        { status: 400 },
      );
    }

    const ai = getGemini();
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    const prompt = `
You are a senior healthcare workforce, financial-value and long-term care operations consultant preparing a customer-facing advisory for Paycor.

Your task is to EXPLAIN the verified calculator outputs below. Do not create new savings estimates, outcome percentages, clinical claims, CMS penalties, census assumptions or guarantees. Do not imply that Paycor alone causes improvements in turnover, agency use, CMS ratings, census, reimbursement or quality outcomes.

Required causation language:
- "Direct" means customer-measured administrative or technology cost that can be traced to a workflow or confirmed contract.
- "Paycor-influenced" means Paycor capabilities can contribute to the outcome, but leadership, adoption, compensation, labor supply, census, acuity, culture and clinical operations also matter.
- "Correlated strategic opportunity" means a downstream possibility and must remain separate from base ROI.
- Use the supplied strategicOpportunity object exactly. Do not create an additional range or monetize the CMS performance module.
- CMS Five-Star ratings and the Skilled Nursing Facility Value-Based Purchasing (SNF VBP) Program are separate programs.
- Respect the inputSources metadata. Never describe an illustrative default, consultant assumption or calculated value as CMS-reported or prospect-confirmed.
- Structure the executive narrative invisibly in this sequence: align with the audience's role and responsibilities; connect those responsibilities to verified business context; preserve autonomy by inviting validation and a decision rather than using pressure.
- Do not name or disclose any persuasion framework, behavioral profile, psychological label or covert technique.
- Do not infer personality, vulnerability, emotion or private traits. Use only the stated audience role, verified inputs and calculated results.

Prepared by: ${proposerName || 'Paycor Consultant'}${proposerTitle ? `, ${proposerTitle}` : ''}
Audience: ${targetAudience || 'Executive Leadership Team'}
Analysis mode: ${isPortfolio ? 'Multi-facility portfolio' : 'Single facility'}
Scenario: ${scenario}

Facility context:
${JSON.stringify(facility, null, 2)}

Verified calculated results:
${JSON.stringify(results, null, 2)}

Editable methodology assumptions:
${JSON.stringify(assumptions, null, 2)}

Verified strategic downstream opportunity (excluded from base ROI):
${JSON.stringify(strategicOpportunity || {}, null, 2)}

Write a concise, board-ready report in clean markdown with these sections:

1. Executive Synthesis
- State the current operating opportunity, annual Paycor-influenced benefit, annual investment, net annual benefit, net ROI and payback period exactly as calculated.
- Distinguish strategic upside from base ROI.

2. Operational Value Findings
- Explain turnover, overtime premium, agency premium, PBJ administration and technology-consolidation value.
- Make clear that overtime models the 0.5x premium and agency models the premium above internal hourly labor.

3. Capability-to-Outcome Map
- Map recruiting, onboarding, scheduling, time and attendance, payroll/HR, learning, performance/engagement and analytics to the relevant outcomes.
- Use many-to-many relationships where appropriate.
- Avoid saying a capability guarantees an outcome.

4. Strategic Downstream Opportunity
- Use four concise subsections: Census & Admissions Capacity, CMS Performance Context, SNF VBP Financial Exposure, and Compliance & Survey Readiness.
- Repeat the supplied strategic range and explicitly state that it is excluded from base ROI.
- Explain that CMS Overall, Health Inspection, Staffing and Quality Measure ratings are Five-Star components.
- Explain that SNF VBP is separate and that any modeled recovery is a correlated scenario.
- Treat CMS performance as qualitative context unless the supplied strategicOpportunity object specifically monetizes another module.
- Do not invent a PBJ penalty or assert that a rating change automatically creates referrals.

5. Recommended Validation and Next Steps
- List the prospect data that should be validated before final approval: turnover replacement costs, overtime detail, agency invoices, PBJ labor, retiring contracts, Medicare FFS Part A revenue, and implementation scope.
- Recommend a post-implementation measurement plan.

6. Data Provenance and Methodology Disclosure
- Summarize which material inputs are CMS-reported, prospect-entered, consultant-modeled, calculated or still illustrative defaults.
- State that missing CMS fields were not replaced with national averages.
- State that results are planning estimates, not guarantees.
- Explain that the AI did not calculate or alter the financial values; it only interpreted the supplied calculator outputs.

Tone: professional, analytical, customer-ready and direct. Use exact figures from the calculated results. Avoid sales clichés and unsupported superlatives.
`;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        temperature: 0.15,
      },
    });

    return NextResponse.json({
      advisory:
        response.text ||
        'The advisory could not be generated. Please review the verified calculator report.',
    });
  } catch (error: any) {
    console.error('Failed to generate advisory:', error);
    return NextResponse.json(
      {
        error: 'AI advisory is temporarily unavailable. The verified financial report remains available.',
        code: 'ADVISORY_UNAVAILABLE',
      },
      { status: 503 },
    );
  }
}
