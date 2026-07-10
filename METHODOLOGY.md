# LTC Operational ROI Methodology v2

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
