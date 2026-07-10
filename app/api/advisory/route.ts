import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      facilityName,
      baselineVbpStars,
      projectedVbpStars,
      headcount,
      hourlyRate,
      turnoverRate,
      rnTurnover,
      totalFines,
      healthDeficiencies,
      pbjHours,
      overtimeHours,
      annualMedicareBilling,
      weeklyAgencyHours,
      agencyHourlyRate,
      avgResidentValue,
      softwareCost,
      pbjAuditFailureActive,
      proposerName,
      proposerTitle,
      targetAudience
    } = body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key is not configured. Please add GEMINI_API_KEY to your environment variables.' },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    const isDefensiveMode = baselineVbpStars >= 4;
    const starDelta = projectedVbpStars - baselineVbpStars;

    const prompt = `
    You are an elite healthcare operations and financial strategy consultant specializing in Long-Term Care (LTC) and Skilled Nursing Facilities (SNFs).
    
    Generate a board-ready, high-impact Executive Advisory Report addressed to the target audience: **${targetAudience || 'C-Suite Executive / CFO'}**.
    
    This report is prepared by **${proposerName || 'Healthcare Strategy Consultant'}**, **${proposerTitle || 'Enterprise Sales Executive'}**, focusing on **${facilityName || 'the Facility'}**.
    
    ### Key Inputs & Facility Metrics:
    - **Facility Name**: ${facilityName || 'Silver Maple Health & Rehab'}
    - **Current CMS Rating**: ${baselineVbpStars} Stars
    - **Targeted CMS Rating**: ${projectedVbpStars} Stars
    - **Strategic Mode**: ${isDefensiveMode ? 'Defensive Strategy (Mitigating Risks & Protecting Ratings)' : `Growth Strategy (Gaining ${starDelta} Stars & Expanding Market Share)`}
    - **Total Nursing Headcount**: ${headcount}
    - **Nursing Turnover Rate**: ${turnoverRate}% (RN-Specific Turnover: ${rnTurnover}%)
    - **Hourly Nursing Wage (Baseline)**: $${hourlyRate}/hr
    - **CMS Health Deficiencies**: ${healthDeficiencies} deficiencies
    - **Recent CMS Fines/Penalties**: $${(totalFines || 0).toLocaleString()}
    - **PBJ Audit Preparation Burden**: ${pbjHours} hours/month
    - **Nursing Overtime Burden**: ${overtimeHours} hours/year
    - **Agency/Registry Utilization**: ${weeklyAgencyHours} hours/week at $${agencyHourlyRate}/hr
    - **Annual Medicare Billing**: $${(annualMedicareBilling || 0).toLocaleString()}
    - **Average Monthly Resident Value**: $${(avgResidentValue || 0).toLocaleString()}
    - **Proposed Solution Software Cost**: $${(softwareCost || 0).toLocaleString()}
    - **PBJ Audit Active Penalty Risk**: ${pbjAuditFailureActive ? 'CRITICAL RISK / ACTIVATED PENALTY (Estimated 6-Resident Medicare decertification equivalent loss)' : 'Standard Risk'}

    ### Strategic Context:
    The facility is trying to reconcile their operational leakages (turnover, agency, overtime, PBJ audit risks) with their growth or protection strategy.
    
    ### Report Structure Requirements:
    Please generate a cohesive, professional report with the following 4 sections. Use clean markdown. Avoid self-referencing and avoid generic filler.
    
    1. **Executive Synthesis**: A high-impact opening summary tailored to the ${targetAudience}. Connect the operational leaks (especially the ${turnoverRate}% turnover and ${weeklyAgencyHours} hrs/week agency dependencies) directly to CMS rating pressure and financial risk.
    2. **The Clinical-Financial Correlation**: Detail how RN and general nursing turnover (${rnTurnover}% / ${turnoverRate}%) impacts clinical quality scores, health inspection audits (discuss the ${healthDeficiencies} deficiencies and $${(totalFines || 0).toLocaleString()} fines), and why improving retention is the precursor to achieving the targeted ${projectedVbpStars}-Star rating.
    3. **Operational Leakage Audit**: Conduct a brief financial triage of their baseline leaks (Turnover cost, Overtime cost, Agency cost, PBJ Compliance admin costs) and show how mitigating these is not just a saving, but a self-funding mechanism for the proposed $${(softwareCost || 0).toLocaleString()} software.
    4. **Board-Ready Recommendations & Next Steps**: Outline 3-4 specific tactical actions. Frame them as a solid business case for immediate investment. Keep the tone professional, direct, numbers-driven, and highly persuasive.
    
    Maintain a highly polished, analytical corporate tone. Be specific, use exact numbers from the metrics provided, and avoid sales-pitch clichés. Use bold accents and bullet lists to make it highly readable.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        temperature: 0.2
      }
    });

    const reportText = response.text || 'Unable to generate strategy report at this time. Please try again.';

    return NextResponse.json({ advisory: reportText });
  } catch (error: any) {
    console.error('Failed to generate AI strategic advisory:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error while generating AI strategy' },
      { status: 500 }
    );
  }
}
