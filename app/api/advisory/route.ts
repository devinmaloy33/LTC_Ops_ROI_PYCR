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
- "Correlated strategic upside" means a downstream possibility and must remain separate from base ROI.
- CMS Five-Star ratings and the Skilled Nursing Facility Value-Based Purchasing (SNF VBP) Program are separate programs.

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

4. CMS, Census and SNF VBP Context
- Explain that CMS Overall, Health Inspection, Staffing and Quality Measure ratings are Five-Star components.
- Explain that SNF VBP is separate and that any modeled value is strategic upside.
- Do not invent a PBJ penalty or assert that a rating change automatically creates referrals.

5. Recommended Validation and Next Steps
- List the prospect data that should be validated before final approval: turnover replacement costs, overtime detail, agency invoices, PBJ labor, retiring contracts, Medicare FFS Part A revenue, and implementation scope.
- Recommend a post-implementation measurement plan.

6. Methodology Disclosure
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
        error:
          error?.message ||
          'Internal server error while generating the advisory.',
      },
      { status: 500 },
    );
  }
}
