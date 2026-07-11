# CMS Provider Data Contract

## Authoritative provider dataset

- Dataset ID: `4pq5-n9py`
- Application name: Nursing Home General Information
- Endpoint used by the server route:
  `https://data.cms.gov/provider-data/api/1/datastore/query/4pq5-n9py/0`
- Join key: six-digit CMS Certification Number (`CCN`)

The browser does not call CMS directly. The Next.js route calls CMS server-side, validates the response and returns a normalized provider object.

## Normalized field map

| Calculator field | Preferred CMS API field | Accepted compatibility alias | Missing behavior |
|---|---|---|---|
| CCN | `cms_certification_number_ccn` | `federal_provider_number` | Empty record rejected by the user interface |
| Facility name | `provider_name` | — | Displays Unknown Facility |
| Address | `provider_address` | — | Blank |
| City | `citytown` | `city_town` | Blank |
| State | `state` | — | Blank |
| ZIP | `zip_code` | — | Blank |
| Certified beds | `number_of_certified_beds` | — | `null` |
| Average residents/day | `average_number_of_residents_per_day` | — | `null` |
| Overall rating | `overall_rating` | — | `null`; no fallback |
| Staffing rating | `staffing_rating` | — | `null`; no fallback |
| Health inspection rating | `health_inspection_rating` | — | `null`; no fallback |
| Quality measure rating | `qm_rating` | `quality_measure_rating` | `null`; no fallback |
| Long-stay QM rating | `long_stay_qm_rating` | — | `null` |
| Short-stay QM rating | `short_stay_qm_rating` | — | `null` |
| Nursing turnover | `total_nursing_staff_turnover` | — | `null`; no fallback |
| RN turnover | `registered_nurse_turnover` | — | `null`; no fallback |
| Administrator departures | `number_of_administrators_who_have_left_the_nursing_home` | `administrator_turnover` | `null` |
| RN HPRD | `reported_rn_staffing_hours_per_resident_per_day` | — | `null` |
| Nurse aide HPRD | `reported_nurse_aide_staffing_hours_per_resident_per_day` | `reported_cna_staffing_hours_per_resident_per_day` | `null` |
| Total nurse HPRD | `reported_total_nurse_staffing_hours_per_resident_per_day` | — | `null` |
| Total fines | `total_amount_of_fines_in_dollars` | — | `null`; zero preserved |
| Health deficiencies | `rating_cycle_1_total_number_of_health_deficiencies` | `total_number_of_health_deficiencies` | `null`; zero preserved |
| Chain name | `chain_name` | — | `null` |
| Chain facility count | `number_of_facilities_in_chain` | — | `null` |

## Fields CMS provider data must not populate

The provider dataset is not treated as the source for:

- Employee headcount
- Average hourly wage
- Administrative loaded wage
- Overtime hours
- Agency hours or agency rate
- PBJ preparation labor
- Existing HR technology spend
- Paycor investment
- Medicare FFS Part A revenue
- Resident monthly value
- Referral gains
- Compliance financial exposure

These must be prospect-entered, consultant-modeled with disclosure, or obtained from another authorized source.

## Null and zero policy

- `null`, blank and unparseable values remain `null`.
- Numeric zero remains zero.
- Missing CMS data is never converted to a national average behind the scenes.
- The UI applies only non-null CMS values.
- Existing prospect-entered values remain unchanged when CMS is missing the field.

## Pagination policy

The browser requests 50 records at a time. The server asks CMS for 51 records; the extra record determines whether a next page exists. This prevents a state or portfolio search from being silently truncated.

## Source metadata policy

Each imported field records:

- Source type: `cms`
- Dataset ID
- CMS source field
- Retrieval timestamp
- Source label

Manual changes replace the source classification with `prospect`. Modeled targets use `consultant`. Untouched seed data remains `default`.

## Schema-change diagnostic

Use:

`/api/providers?search=XXXXXX&debug=1`

The response includes the raw CMS column names and which fields the route recognized. Use this after CMS data releases or if a field unexpectedly stops populating.

## Guided-estimator use of CMS context — v4

The following CMS fields may be retained as context for the Guided Estimate Assistant:

- certified beds
- average residents per day
- RN HPRD
- nurse aide HPRD
- total nurse HPRD

These fields may support a transparent headcount or revenue planning formula. They do not become employee headcount, payroll, agency, overtime or revenue actuals. The resulting values are classified as `estimate`, not `cms`.

The estimator records the CMS-supported drivers in the estimate metadata and requires prospect confirmation. Missing CMS context is not backfilled with a hidden CMS or national value; the assistant uses only its visibly editable planning drivers.

## v5 strategic-use fields

The following CMS values may be retained as contextual inputs for the strategic card and guided estimator:

- certified beds
- average residents per day
- reported RN staffing HPRD
- reported nurse-aide staffing HPRD
- reported total nurse staffing HPRD

These fields support capacity and workforce context. They do not represent employee headcount, payroll expense, facility revenue, admissions demand or a prediction of future CMS performance.
