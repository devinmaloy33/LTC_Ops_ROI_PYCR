import { NextRequest, NextResponse } from "next/server";
import { getGemini } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { inputs, results } = body;

    if (!inputs || !results) {
      return NextResponse.json({ error: "Missing required inputs or results" }, { status: 400 });
    }

    const ai = getGemini();

    const prompt = `
You are an expert Long-Term Care (LTC) Industry Consultant and ROI strategist partnered with Paycor.
Analyze the following LTC facility details and their calculated Paycor ROI benefits. Provide a highly professional, actionable strategic advisory report in markdown format.

### Facility Profile:
- **Facility Name**: ${inputs.facilityName}
- **Employee Headcount (FTEs)**: ${inputs.headcount}
- **Average Hourly Labor Rate**: $${inputs.hourlyRate}/hr
- **Current Staff Turnover Rate**: ${inputs.turnoverRate}%
- **Weekly Agency Hours**: ${inputs.weeklyAgencyHours} hrs/week (at $${inputs.agencyHourlyRate}/hr)
- **Annual Overtime Hours**: ${inputs.overtimeHours} hrs/year
- **Manual PBJ Prep Time**: ${inputs.pbjHours} hours/year
- **CMS Staffing Star Rating**: ${inputs.baselineVbpStars} Stars (Baseline) to ${inputs.projectedVbpStars} Stars (Projected)

### Estimated Paycor ROI Impact (Calculated):
- **Annual Turnover Cost Avoidance**: $${Math.round(results.turnoverSavings).toLocaleString()} (through turnover reduction)
- **Agency Staffing Spend Savings**: $${Math.round(results.agencySavings).toLocaleString()} (through agency reduction via scheduling)
- **Overtime Optimization Savings**: $${Math.round(results.overtimeSavings).toLocaleString()} (through overtime reduction)
- **PBJ Compliance Admin Savings**: $${Math.round(results.pbjSavings).toLocaleString()} (through automation efficiency)
- **CMS Star Rating & Census Improvement Benefits**: $${Math.round(results.reclaimedCensusRevenue).toLocaleString()} (referral census growth)
- **Value-Based Purchasing (VBP) Bonus**: $${Math.round(results.vbpBonus).toLocaleString()}
- **Total Estimated Annual Savings**: $${Math.round(results.totalSavings).toLocaleString()}
- **Net Annual Benefit (ROI)**: $${Math.round(results.netBenefit).toLocaleString()} (${results.roi.toFixed(1)}% ROI)
- **Payback Period**: ${results.paybackPeriod.toFixed(1)} months

Write a beautifully structured executive advisory report with the following sections:
1. **Executive Summary**: A high-impact 2-sentence summary of the financial opportunity for ${inputs.facilityName}.
2. **Turnover & Retention Strategic Insights**: How Paycor Onboarding, Learning Management (LMS), and Pulse surveys can specifically address the ${inputs.turnoverRate}% turnover, highlighting the specific $${Math.round(results.turnoverSavings).toLocaleString()} savings.
3. **Agency & Overtime Management**: Actions to reduce agency staffing and overtime using Paycor's smart scheduling and real-time scheduling mobile app, saving $${Math.round(results.agencySavings + results.overtimeSavings).toLocaleString()} combined.
4. **PBJ Compliance & CMS Star Rating Optimization**: Explain the crucial link between Payroll-Based Journal (PBJ) automation, staffing hours per resident-day, and how moving from ${inputs.baselineVbpStars} stars will protect referrals and capture VBP bonus pools.
5. **Implementation Timeline & Roadmap**: 3 phases (Days 1-30, Days 31-60, Days 61-90) to capture these savings.

Keep the tone expert, encouraging, professional, and clear. Avoid overly technical AI jargon. Use strong business-oriented subheadings.
`;

    let text = "";
    const models = ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-3.1-flash-lite"];
    
    for (const model of models) {
      try {
        console.log(`Attempting strategy generation with model: ${model}`);
        const response = await ai.models.generateContent({
          model: model,
          contents: prompt,
        });
        if (response && response.text) {
          text = response.text;
          console.log(`Successfully generated strategy report using model: ${model}`);
          break;
        }
      } catch (err: any) {
        console.warn(`Model ${model} failed:`, err.message || err);
      }
    }

    if (!text) {
      console.warn("All Gemini models failed. Generating high-quality customized fallback report.");
      text = generateFallbackReport(inputs, results);
    }

    return NextResponse.json({ text });
  } catch (error: any) {
    console.error("Strategy API endpoint fallback failed:", error);
    return NextResponse.json(
      { 
        error: "Failed to generate AI strategic roadmap.", 
        details: error.message || error 
      }, 
      { status: 500 }
    );
  }
}

function generateFallbackReport(inputs: any, results: any): string {
  return `
# Executive Strategic Advisory Report

### Prepared for: ${inputs.facilityName}
### Prepared by: Paycor Long-Term Care Advisory Suite
### Target Audience: ${inputs.targetAudience || "Executive Board of Trustees / Decision Makers"}

---

## 1. Executive Summary
An in-depth performance audit of **${inputs.facilityName}** reveals a significant opportunity to optimize operational efficiency and staffing compliance. By addressing current workforce challenges, the facility can capture **$${Math.round(results.totalSavings).toLocaleString()}** in gross annual savings, resulting in a **Net Annual Benefit of $${Math.round(results.netBenefit).toLocaleString()}** in Year 1 after accounting for the Paycor platform investment. This represents an exceptional first-year return on investment (**${results.roi.toFixed(0)}% ROI**) with a rapid payback period of **${results.paybackPeriod.toFixed(1)} months**.

---

## 2. Turnover & Retention Strategic Insights
**${inputs.facilityName}** is currently experiencing an annual staff turnover rate of **${inputs.turnoverRate}%**, with an estimated cost of **$6,500** per turnover incident. This results in an annual financial drain of **$${Math.round(results.baselineTurnoverCost).toLocaleString()}**.

### Strategic Recommendations:
* **Structured Onboarding**: Implement Paycor's structured, digital-first onboarding workflows to connect with new hires before Day 1, lowering the industry's critical 90-day CNA turnover.
* **Continuous Learning (LMS)**: Provide on-demand, mobile-friendly training modules through Paycor's Learning Management System to support professional growth and satisfy clinical compliance.
* **Pulse Surveys**: Use automated, anonymous pulse feedback tools to gauge employee satisfaction, identify burnout early, and address management bottlenecks before they trigger resignations.

By successfully reducing turnover by a conservative **15%**, your facility will avoid **$${Math.round(results.turnoverSavings).toLocaleString()}** in annual costs.

---

## 3. Agency & Overtime Management
With premium staffing costs representing a major margin pressure, we've identified significant agency and overtime leakage.

### Strategic Recommendations:
* **Proactive Mobile Scheduling**: Empower full-time and part-time staff to view, claim, and swap open shifts directly from their mobile devices using Paycor's scheduling app. This dramatically accelerates shift fulfillment without relying on expensive agency staff.
* **Real-time Overtime Alerts**: Set automated alerts within the Paycor scheduler to notify supervisors when scheduling a staff member will trigger overtime premiums, enabling proactive shift reallocation.
* **On-Demand Pay**: Offer Paycor's Earned Wage Access (EWA) as a premium benefit to incentivize existing staff to pick up difficult-to-fill shifts, boosting internal shift coverage.

By reducing agency reliance by **35%** and overtime by **15%**, the facility will recover **$${Math.round(results.agencySavings + results.overtimeSavings).toLocaleString()}** annually.

---

## 4. PBJ Compliance & CMS Star Rating Optimization
Managing Payroll-Based Journal (PBJ) reporting currently consumes manual administrative labor, costing **$${Math.round(results.baselinePbjCost).toLocaleString()}** per year. Furthermore, the facility's current CMS staffing rating of **${inputs.baselineVbpStars} Stars** limits market competitiveness and Value-Based Purchasing (VBP) incentives.

### Strategic Recommendations:
* **Automated PBJ Transmissions**: Automatically compile and validate timecard data against CMS specification rules, reducing manual audit times by **65%** and eliminating the risk of reporting penalties.
* **Real-time Staffing Star Predictor**: Monitor actual hours per resident-day (HPRD) against CMS staffing rating thresholds in real-time, allowing scheduling adjustments before the quarter closes.
* **VBP Incentive Optimization**: Improving the staffing star rating directly enhances the facility’s referral network attractiveness and unlocks up to **$${Math.round(results.vbpBonus).toLocaleString()}** in CMS performance incentives.

---

## 5. Implementation Timeline & Roadmap

### Phase 1: Days 1 to 30 — Foundations & Compliance Automation
* Integrate current payroll systems with Paycor’s automated PBJ compiler to eliminate manual timesheet audits.
* Roll out mobile onboarding portals to all incoming hires to streamline the digital credentialing process.

### Phase 2: Days 31 to 60 — Smart Scheduling & Retention Initiatives
* Launch the Paycor scheduling app to staff, allowing mobile open-shift bidding.
* Configure real-time scheduler alerts for overtime thresholds.
* Establish monthly pulse surveys to track clinical burn-out rates.

### Phase 3: Days 61 to 90 — Full Optimization & VBP Capture
* Transition fully away from high-rate nursing registries by filling vacant shifts internally.
* Leverage LMS learning paths for nursing advancement, cementing a high-retention culture.
* Track staffing HPRD metrics daily to secure a clear pathway toward a higher CMS Staffing Star Rating.
`;
}
