# Guided Estimate Framework

## Purpose

A Paycor consultant may be meeting with a CHRO, CIO, IT leader, operator or finance leader who does not personally own every requested data point. The estimator creates a transparent planning value so the discussion can continue without silently inventing a number.

Every estimate is editable and carries its method, drivers, confidence and confirmation status into the customer report.

## Source hierarchy

1. CMS-reported
2. Prospect-confirmed
3. Consultant-confirmed
4. Guided estimate
5. Illustrative default

The application does not automatically overwrite a CMS, prospect or consultant value. Only default and previous estimate fields are selected automatically in the assistant.

## Estimate formulas

### Employee headcount

Preferred method when CMS census and total nurse HPRD are available:

`nursing FTEs = residents/day × total nurse HPRD × 365 ÷ productive hours per FTE`

`total headcount = nursing FTEs ÷ nursing share of total workforce`

Fallback method:

`total headcount = residents/day × employees per resident`

If residents/day is missing:

`residents/day = certified beds × occupancy rate`

This remains a planning estimate because CMS staffing hours do not represent the complete employee roster.

### Average hourly wage

`weighted wage = Σ(role workforce share × role hourly wage) ÷ Σ(role shares)`

Default roles are RN, LPN/LVN, CNA and other workforce. All role shares and wages are editable.

### Loaded administrative rate

`loaded admin rate = administrative base hourly wage × loaded labor factor`

### Overtime hours

`annual overtime hours = estimated headcount × 2,080 × overtime share of paid hours`

### Agency hours

`weekly agency hours = estimated headcount × nursing workforce share × 40 × agency share of nursing hours`

### Agency bill rate

`agency hourly rate = blended internal hourly wage × agency-rate multiplier`

### PBJ preparation labor

The consultant selects a workflow maturity level:

- Automated / integrated: 4 hours per month
- Mixed workflow: 12 hours per month
- Mostly manual: 24 hours per month
- High-complexity / multi-source: 40 hours per month

These are editable workflow planning values, not CMS benchmarks.

### Current technology costs

For each enabled module:

`annual module cost = estimated headcount × estimated PEPM × 12`

Only tools currently purchased and realistically retirable should be included in the ROI.

### Temporary Paycor investment

`planning investment = estimated headcount × planning PEPM × 12 + annual base fee`

This value is always marked `reportable: false`. It is an internal placeholder only and must be replaced with approved Paycor pricing before customer delivery.

### Medicare FFS Part A revenue

`annual Part A revenue = average residents/day × Part A census share × daily Part A revenue × 365`

This is low-confidence until finance confirms actual Medicare revenue or authorized remittance data.

### Average monthly resident value

`monthly resident value = blended daily resident revenue × 30.4375`

### Compliance exposure scenario

`exposure = residents at risk × days affected × daily resident revenue`

`+ remediation labor hours × loaded administrative rate`

`+ professional / consulting fees`

`+ optional recent CMS fines`

The result is a user-defined scenario, not an automatic CMS penalty, legal conclusion or guaranteed loss.

## Confidence labels

- **Medium:** CMS facility context directly supports part of the formula, but the final value still depends on editable operating ratios.
- **Low:** The value relies primarily on planning assumptions or a scenario selected by the consultant.

No estimate is labeled high confidence without prospect actuals.

## Customer-readiness rules

- Guided estimates may appear in the customer report when their method and confidence are disclosed.
- The consultant should identify the data owner who will validate each estimate.
- The Paycor investment must come from approved pricing; its planning estimate prevents report printing.
- Critical fields left as illustrative defaults also prevent customer-ready printing.
- Strategic upside remains separate from base ROI.

## Recommended discovery handoffs

| Field | Best validating owner |
|---|---|
| Headcount and wages | HR, payroll or finance |
| Overtime | Payroll, timekeeping or operations |
| Agency use and rates | Operations, staffing, AP or finance |
| PBJ labor | Payroll, staffing coordinator or compliance |
| Current technology costs | IT, procurement, finance or HR systems |
| Paycor investment | Paycor-approved proposal |
| Medicare Part A revenue | CFO, controller or reimbursement team |
| Resident value | Finance or revenue-cycle leadership |
| Compliance exposure | Compliance, operations, finance and legal |
