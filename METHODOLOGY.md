# LTC Operational ROI Methodology v4

## Product intent

The calculator is designed primarily for a Paycor consultant to complete with a prospect. It also supports a guided self-service route. It can model one facility or aggregate multiple facilities into a portfolio business case.

## Value hierarchy

### 1. Current direct opportunity

The prospect's measurable operating burden:

- turnover replacement burden
- overtime premium
- agency premium above internal hourly labor
- PBJ administration labor
- current recurring HR technology spend

### 2. Paycor-influenced annual benefit

For influenced outcomes:

`current burden × attainable improvement × Paycor attribution`

For confirmed technology retirement:

`current recurring technology spend × retirement rate`

This value is included once. It is not also subtracted from the software-investment denominator.

### 3. Strategic downstream opportunity

The following remain outside base ROI:

- modeled census/referral growth
- census protection
- potential SNF VBP recovery
- prospect-entered compliance exposure reduction

These outcomes are correlated or multi-causal and are not guaranteed Paycor results.

## Core formulas

### Turnover burden

`estimated turnover events = headcount × turnover rate`

`annual compensation = hourly rate × 2,080`

`estimated cost per turnover = annual compensation × turnover cost multiple`

`turnover burden = turnover events × estimated cost per turnover`

### Overtime premium

`overtime premium = overtime hours × hourly rate × 0.5`

The model values the premium only, because the underlying productive hour may still need to be covered at straight time.

### Agency premium

`agency premium per hour = max(agency rate − internal hourly rate, 0)`

`annual agency premium = weekly agency hours × agency premium per hour × 52`

The model does not treat all agency spend as removable.

### PBJ administration

`annual PBJ administration = PBJ hours per month × 12 × loaded admin hourly rate`

### Net ROI

`net annual benefit = Paycor-influenced annual benefit − annual Paycor investment`

`net ROI = net annual benefit ÷ annual Paycor investment`

`benefit-cost ratio = Paycor-influenced annual benefit ÷ annual Paycor investment`

`payback months = annual Paycor investment ÷ Paycor-influenced annual benefit × 12`

### SNF VBP context

`SNF VBP withhold exposure = Medicare FFS Part A revenue × 2%`

`modeled recovery opportunity = withhold exposure × user-selected recovery improvement`

This is strategic upside, not base ROI. CMS Five-Star ratings are not used as SNF VBP scores.

## Evidence classes

- **Direct:** customer-measured administrative labor or confirmed recurring technology cost.
- **Influenced:** Paycor capabilities can contribute, but other organizational and market factors remain material.
- **Correlated:** downstream strategic possibility shown separately from base ROI.

## Capability-to-outcome relationships

The mapping is intentionally many-to-many.

| Paycor capability | Operational mechanisms | Potential outcomes |
|---|---|---|
| Recruiting | candidate flow, source visibility, workflow automation | vacancy duration, agency dependency, recruiting administration |
| Onboarding | document completion, readiness, workflow consistency | time to productivity, early retention, administrative efficiency |
| Scheduling | open-shift visibility, employee access, schedule controls | overtime premium, agency premium, manager time, uncovered shifts |
| Time and attendance | accurate hours, exceptions, approvals | payroll corrections, overtime visibility, PBJ data support |
| Payroll and HR | unified employee records and workflows | duplicate entry, processing time, system consolidation |
| Learning | required training and development tracking | training administration, readiness, retention support |
| Performance and engagement | feedback, goals, surveys, manager visibility | early retention intervention and manager consistency |
| Analytics | labor, turnover and workforce trends | faster intervention and portfolio prioritization |

## Regulatory sources

- CMS Five-Star Quality Rating System: https://www.cms.gov/medicare/health-safety-standards/certification-compliance/five-star-quality-rating-system
- CMS Skilled Nursing Facility Value-Based Purchasing Program: https://www.cms.gov/medicare/quality/nursing-home-improvement/value-based-purchasing
- CMS Payroll-Based Journal staffing data submission: https://www.cms.gov/medicare/quality/nursing-home-improvement/staffing-data-submission-pbj

The CMS sources establish regulatory context and program definitions. They do not validate the calculator's scenario improvement percentages. Scenario rates must be replaced with prospect actuals or validated Paycor customer evidence whenever available.

## CMS data integrity and provenance

The v3 data layer imports only non-null values reported by the CMS Nursing Home General Information dataset. Missing CMS fields are not replaced with hidden averages. Employee headcount and facility financial inputs remain prospect-entered.

Each material input is classified as CMS-reported, prospect-entered, consultant-modeled, calculated, researched or illustrative default. The customer report reproduces this provenance so reviewers can distinguish authoritative external data from discovery inputs and scenario assumptions.

The calculator keeps the CMS Five-Star Quality Rating System separate from the Skilled Nursing Facility Value-Based Purchasing Program. Five-Star component ratings can be imported from the provider dataset. Facility-specific Medicare FFS Part A revenue and confidential SNF VBP feedback are not inferred from the provider dataset.

## Guided estimate governance — v4

When a prospect attendee does not know a material input, the calculator can generate a disclosed planning estimate rather than leaving the field blank or silently applying an industry average.

The estimator uses CMS census and staffing context where available, plus editable operating drivers. It records the formula, driver values, confidence and confirmation requirement in the input provenance. Confirmed CMS or prospect values are protected from automatic replacement.

Guided estimates are not treated as CMS facts. They are not guarantees and should be validated with the appropriate data owner. An estimated Paycor investment is internal planning only and blocks customer-report printing until approved pricing is entered.

See `GUIDED_ESTIMATES.md` for formulas, default drivers and customer-readiness rules.

## Strategic downstream presentation — v5

The strategic downstream opportunity is now presented in a standalone card below Facility or Portfolio Value Reconciliation. It does not add new required inputs.

The range is generated from the calculator's conservative and opportunity assumption sets. Census capacity, SNF VBP recovery and customer-entered compliance exposure may contribute to the range. CMS performance remains qualitative to avoid monetizing a rating change, implying causation or double counting referral/census value.

Each module provides:

- current condition
- priority classification
- scenario range where applicable
- source context
- calculation method
- explanation of Paycor's possible influence
- factors outside Paycor's control

Three optional progressive-disclosure refinements can improve the narrative without blocking the analysis. See `STRATEGIC_DOWNSTREAM.md`.
