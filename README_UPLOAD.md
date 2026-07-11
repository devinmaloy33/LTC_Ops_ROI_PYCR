# LTC ROI Strategic Asset v5 — Strategic Downstream Opportunity

This is a cumulative replacement package. It supersedes Methodology v2 and Strategic Asset v3/v4. Upload every code file in this package to AI Studio while preserving its folder path.

## What v5 changes

1. Adds a standalone **Strategic Downstream Opportunity** card immediately below **Facility / Portfolio Value Reconciliation**.
2. Keeps strategic downstream value explicitly labeled:
   - correlated
   - outside base ROI
   - not a guaranteed Paycor outcome
3. Uses the information already collected instead of adding a large required questionnaire.
4. Shows four compact modules:
   - Census & Admissions Capacity
   - CMS Performance Context
   - SNF VBP Financial Exposure
   - Compliance & Survey Readiness
5. Calculates a conservative-to-opportunity strategic range from the existing scenario engine.
6. Does not monetize CMS rating readiness separately, avoiding double counting with census and referral scenarios.
7. Adds only three optional progressive-disclosure refinements:
   - whether staffing has constrained admissions
   - whether the stated CMS strategy is protection or improvement
   - whether active compliance remediation is underway
8. Adds expandable “How this was determined” content for each module.
9. Reproduces the strategic modules, range, methods and disclosures in the customer-facing report.
10. Sends the verified strategic object to the AI advisory and prohibits the model from inventing additional value.

## Cumulative v4 capabilities retained

- CMS values are imported only when present.
- Missing CMS values remain missing rather than being replaced with hidden averages.
- CMS bed, resident and nurse-HPRD context can support transparent guided estimates.
- Non-CMS workforce and financial inputs can be estimated through the Guided Estimate Assistant.
- Every estimate includes method, confidence and confirmation requirements.
- Confirmed actuals are protected from automatic replacement.
- Temporary Paycor pricing is internal only and blocks customer-ready printing.
- CMS Five-Star ratings and SNF VBP remain separate.
- Facility and portfolio analysis are supported.

## Files to upload

### Application

- `app/page.tsx`
- `app/api/providers/route.ts`
- `app/api/advisory/route.ts`

### Components

- `components/assumptions-panel.tsx`
- `components/estimate-assistant.tsx`
- `components/printable-report.tsx`
- `components/sheets-sync.tsx`
- `components/strategic-opportunity-card.tsx`

### Business logic

- `lib/assumptions.ts`
- `lib/calculations.ts`
- `lib/gemini.ts`
- `lib/guided-estimates.ts`
- `lib/roi-types.ts`
- `lib/strategic-opportunity.ts`

### Configuration

- `next.config.ts`

## Post-upload validation

### 1. CMS import

Open:

`/api/providers?search=XXXXXX&debug=1`

Replace `XXXXXX` with a known six-digit CCN. Confirm:

- provider information is returned
- missing fields are `null`
- the response includes dataset ID `4pq5-n9py`
- certified beds, average residents/day and available staffing HPRD are returned when reported

### 2. Guided estimates

1. Apply a CMS facility.
2. Select **Estimate Unknown Inputs**.
3. Confirm headcount uses CMS census and HPRD when available.
4. Apply selected estimates.
5. Confirm estimated values display an `ESTIMATE` source badge.
6. Confirm the temporary Paycor estimate is marked internal-only.

### 3. Strategic card

1. Continue to **Value & Assumptions**.
2. Confirm the Strategic Downstream Opportunity card appears directly below Facility Value Reconciliation.
3. Confirm the card contains four modules.
4. Confirm CMS Performance Context has no separate dollar value.
5. Confirm the strategic range does not change base ROI.
6. Expand **How this was determined** for each module.
7. Change each optional refinement and confirm the narrative or priority updates.

### 4. Customer report

1. Open the customer report.
2. Confirm the strategic range and four modules appear separately from the financial summary.
3. Confirm estimated inputs display method and confidence in provenance.
4. Confirm printing is blocked when critical fields remain illustrative defaults or Paycor pricing is internal-only.
5. Replace temporary pricing with approved pricing and confirm printing becomes available after other critical fields are resolved.

### 5. AI advisory

Generate an advisory and confirm it:

- repeats the verified strategic range rather than creating another range
- treats CMS performance as qualitative context
- keeps SNF VBP separate from CMS Five-Star ratings
- states that strategic opportunity is excluded from base ROI
- does not invent penalties, referral gains or clinical outcomes
