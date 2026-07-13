import { FacilityROICalculatorInputs, TrackedInputField } from '@/lib/roi-types';

export const CRITICAL_INPUT_FIELDS: TrackedInputField[] = [
  'headcount', 'hourlyRate', 'overtimeHoursPerYear', 'weeklyAgencyHours',
  'agencyHourlyRate', 'pbjHoursPerMonth', 'softwareCost',
];

export const CRITICAL_INPUT_LABELS: Record<string, string> = {
  headcount: 'Employee headcount',
  hourlyRate: 'Average hourly rate',
  overtimeHoursPerYear: 'Annual overtime hours',
  weeklyAgencyHours: 'Weekly agency hours',
  agencyHourlyRate: 'Agency hourly rate',
  pbjHoursPerMonth: 'Monthly PBJ administration hours',
  softwareCost: 'Annual Paycor investment',
};

export function getMissingCriticalFields(facility: FacilityROICalculatorInputs): TrackedInputField[] {
  return CRITICAL_INPUT_FIELDS.filter((field) => {
    const record = facility.inputSources?.[field];
    return !record || record.source === 'default' || record.reportable === false;
  });
}

export function getPortfolioReadiness(facilities: FacilityROICalculatorInputs[]) {
  const missing = facilities.flatMap((facility) => getMissingCriticalFields(facility).map((field) => ({
    ccn: facility.ccn || null,
    facilityName: facility.facilityName,
    field,
    label: CRITICAL_INPUT_LABELS[field] || field,
  })));
  return { complete: missing.length === 0, missing };
}
