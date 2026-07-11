'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Calculator, Check, Info, WandSparkles, X } from 'lucide-react';
import {
  calculateGuidedEstimates,
  DEFAULT_GUIDED_ESTIMATE_DRIVERS,
  ESTIMATE_FIELD_HELP,
  GuidedEstimateDrivers,
  GuidedEstimateField,
  sourceRecordForEstimate,
} from '@/lib/guided-estimates';
import {
  FacilityInputSources,
  FacilityROICalculatorInputs,
  InputSourceRecord,
  TechCostMap,
} from '@/lib/roi-types';

interface EstimateAssistantProps {
  open: boolean;
  facility: FacilityROICalculatorInputs;
  onClose: () => void;
  onApply: (payload: {
    values: Partial<FacilityROICalculatorInputs>;
    inputSources: FacilityInputSources;
    technologyCosts?: TechCostMap;
    technologySources?: Partial<Record<keyof TechCostMap, InputSourceRecord>>;
  }) => void;
}

const FIELD_LABELS: Record<GuidedEstimateField, string> = {
  headcount: 'Employee headcount',
  hourlyRate: 'Average hourly wage',
  adminLoadedHourlyRate: 'Loaded administrative rate',
  overtimeHoursPerYear: 'Annual overtime hours',
  weeklyAgencyHours: 'Weekly agency hours',
  agencyHourlyRate: 'Agency hourly rate',
  pbjHoursPerMonth: 'PBJ preparation hours / month',
  annualMedicarePartARevenue: 'Annual Medicare FFS Part A revenue',
  avgMonthlyResidentValue: 'Average monthly resident value',
  complianceRiskExposure: 'Compliance exposure scenario',
  softwareCost: 'Paycor planning investment',
};

const FIELD_ORDER = Object.keys(FIELD_LABELS) as GuidedEstimateField[];

const moneyFields = new Set<GuidedEstimateField>([
  'hourlyRate',
  'adminLoadedHourlyRate',
  'agencyHourlyRate',
  'annualMedicarePartARevenue',
  'avgMonthlyResidentValue',
  'complianceRiskExposure',
  'softwareCost',
]);

const canAutoSelect = (
  field: GuidedEstimateField,
  facility: FacilityROICalculatorInputs,
) => {
  const source = facility.inputSources?.[field];
  return !source || source.source === 'default' || source.source === 'estimate';
};

const formatValue = (field: GuidedEstimateField, value: number) => {
  if (moneyFields.has(field)) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: field === 'hourlyRate' || field === 'agencyHourlyRate' || field === 'adminLoadedHourlyRate' ? 2 : 0,
    }).format(value);
  }
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
};

export default function EstimateAssistant({
  open,
  facility,
  onClose,
  onApply,
}: EstimateAssistantProps) {
  const [drivers, setDrivers] = useState<GuidedEstimateDrivers>(
    DEFAULT_GUIDED_ESTIMATE_DRIVERS,
  );
  const [selectedFields, setSelectedFields] = useState<Set<GuidedEstimateField>>(
    new Set(),
  );
  const [includeTechnology, setIncludeTechnology] = useState(true);
  const [activeSection, setActiveSection] = useState<'results' | 'workforce' | 'financial' | 'technology'>('results');

  useEffect(() => {
    if (!open) return;
    setSelectedFields(
      new Set(FIELD_ORDER.filter((field) => canAutoSelect(field, facility))),
    );
  }, [open, facility]);

  const estimates = useMemo(
    () => calculateGuidedEstimates(facility, drivers),
    [facility, drivers],
  );

  if (!open) return null;

  const updateDriver = <K extends keyof GuidedEstimateDrivers>(
    key: K,
    value: GuidedEstimateDrivers[K],
  ) => setDrivers((current) => ({ ...current, [key]: value }));

  const toggleField = (field: GuidedEstimateField) => {
    setSelectedFields((current) => {
      const next = new Set(current);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });
  };

  const applySelected = () => {
    const values: Partial<FacilityROICalculatorInputs> = {};
    const inputSources: FacilityInputSources = {};

    selectedFields.forEach((field) => {
      const estimate = estimates.values[field];
      if (!estimate) return;
      (values as Record<string, number>)[field] = estimate.value;
      inputSources[field] = sourceRecordForEstimate(estimate);
    });

    onApply({
      values,
      inputSources,
      technologyCosts: includeTechnology ? estimates.technologyCosts : undefined,
      technologySources: includeTechnology ? estimates.technologySources : undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 p-3 md:p-6 overflow-y-auto">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 p-4 md:p-5 flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <div className="rounded-xl bg-paycor-orange/10 p-2 text-paycor-orange shrink-0">
              <WandSparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-paycor-charcoal">Guided Estimate Assistant</h2>
              <p className="text-[11px] text-paycor-medium-grey mt-1 max-w-3xl leading-relaxed">
                Build a transparent planning estimate when the person in the room does not own the data. Every applied value is labeled <strong>Estimate</strong>, shows its formula and confidence, remains editable, and should be replaced with actuals when available.
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl border border-slate-200" aria-label="Close estimate assistant">
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="p-4 md:p-6">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[10px] leading-relaxed text-amber-900 mb-5 flex gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              <strong>Business-case safeguard:</strong> these are discovery fallbacks—not CMS-reported facts or guaranteed outcomes. The Paycor investment estimate is internal planning only and must be replaced by an approved quote before the report is customer-ready.
            </span>
          </div>

          <nav className="flex flex-wrap gap-2 mb-5">
            {([
              ['results', 'Estimate Results'],
              ['workforce', 'Workforce Drivers'],
              ['financial', 'Financial Drivers'],
              ['technology', 'Technology Drivers'],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveSection(key)}
                className={`px-3 py-2 rounded-xl text-[10px] font-extrabold border ${activeSection === key ? 'bg-paycor-charcoal text-white border-paycor-charcoal' : 'bg-white text-paycor-medium-grey border-slate-200'}`}
              >
                {label}
              </button>
            ))}
          </nav>

          {activeSection === 'results' && (
            <div className="space-y-3">
              {FIELD_ORDER.map((field) => {
                const estimate = estimates.values[field];
                if (!estimate) return null;
                const currentSource = facility.inputSources?.[field];
                const protectedActual = currentSource && !['default', 'estimate'].includes(currentSource.source);
                const help = ESTIMATE_FIELD_HELP[field];
                return (
                  <div key={field} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                      <label className="flex gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedFields.has(field)}
                          onChange={() => toggleField(field)}
                          className="mt-1 accent-paycor-orange"
                        />
                        <span>
                          <span className="flex flex-wrap items-center gap-2">
                            <strong className="text-sm">{FIELD_LABELS[field]}</strong>
                            <span className={`rounded-full px-2 py-0.5 text-[8px] uppercase font-extrabold ${estimate.confidence === 'medium' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                              {estimate.confidence} confidence
                            </span>
                            {!estimate.reportable && (
                              <span className="rounded-full px-2 py-0.5 text-[8px] uppercase font-extrabold bg-red-50 text-red-700">internal only</span>
                            )}
                          </span>
                          <span className="block text-[10px] text-paycor-medium-grey mt-1 leading-relaxed">{estimate.method}</span>
                          {help && (
                            <span className="block text-[9px] text-paycor-grey mt-1">
                              Actual source: {help.actualSource}
                            </span>
                          )}
                          {protectedActual && (
                            <span className="block text-[9px] text-sky-700 mt-1 font-bold">
                              Current value is labeled {currentSource.source}; this estimate is not selected automatically.
                            </span>
                          )}
                        </span>
                      </label>
                      <div className="md:text-right shrink-0">
                        <p className="text-[9px] uppercase tracking-wider font-bold text-paycor-grey">Calculated estimate</p>
                        <p className="text-xl font-black text-paycor-orange mt-1">{formatValue(field, estimate.value)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}

              <label className="rounded-2xl border border-slate-200 p-4 flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={includeTechnology} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setIncludeTechnology(event.target.checked)} className="mt-1 accent-paycor-orange" />
                <span>
                  <strong className="text-sm">Estimate selected current technology costs</strong>
                  <span className="block text-[10px] text-paycor-medium-grey mt-1">
                    Uses estimated headcount × editable PEPM × 12 for each enabled module. Include only tools that may realistically be retired.
                  </span>
                </span>
              </label>
            </div>
          )}

          {activeSection === 'workforce' && (
            <div className="space-y-5">
              <DriverSection title="Facility sizing" description="CMS census and staffing values are used when available. All ratios remain editable.">
                <DriverNumber label="Occupancy rate" value={drivers.occupancyRate * 100} suffix="%" onChange={(value) => updateDriver('occupancyRate', value / 100)} />
                <DriverNumber label="Employees per resident" value={drivers.employeesPerResident} step={0.05} onChange={(value) => updateDriver('employeesPerResident', value)} />
                <DriverNumber label="Nursing share of total workforce" value={drivers.nursingWorkforceShare * 100} suffix="%" onChange={(value) => updateDriver('nursingWorkforceShare', value / 100)} />
                <DriverNumber label="Productive hours per FTE / year" value={drivers.annualProductiveHoursPerFte} onChange={(value) => updateDriver('annualProductiveHoursPerFte', value)} />
              </DriverSection>

              <DriverSection title="Wage mix" description="Update these with local or prospect-informed wage assumptions whenever possible.">
                <DriverNumber label="RN workforce share" value={drivers.rnWorkforceShare * 100} suffix="%" onChange={(value) => updateDriver('rnWorkforceShare', value / 100)} />
                <DriverNumber label="RN hourly wage" value={drivers.rnHourlyWage} prefix="$" onChange={(value) => updateDriver('rnHourlyWage', value)} />
                <DriverNumber label="LPN/LVN workforce share" value={drivers.lpnWorkforceShare * 100} suffix="%" onChange={(value) => updateDriver('lpnWorkforceShare', value / 100)} />
                <DriverNumber label="LPN/LVN hourly wage" value={drivers.lpnHourlyWage} prefix="$" onChange={(value) => updateDriver('lpnHourlyWage', value)} />
                <DriverNumber label="CNA workforce share" value={drivers.cnaWorkforceShare * 100} suffix="%" onChange={(value) => updateDriver('cnaWorkforceShare', value / 100)} />
                <DriverNumber label="CNA hourly wage" value={drivers.cnaHourlyWage} prefix="$" onChange={(value) => updateDriver('cnaHourlyWage', value)} />
                <DriverNumber label="Other workforce share" value={drivers.otherWorkforceShare * 100} suffix="%" onChange={(value) => updateDriver('otherWorkforceShare', value / 100)} />
                <DriverNumber label="Other workforce hourly wage" value={drivers.otherHourlyWage} prefix="$" onChange={(value) => updateDriver('otherHourlyWage', value)} />
                <DriverNumber label="Administrative base hourly wage" value={drivers.adminBaseHourlyWage} prefix="$" onChange={(value) => updateDriver('adminBaseHourlyWage', value)} />
                <DriverNumber label="Loaded labor factor" value={drivers.loadedLaborFactor} step={0.01} suffix="x" onChange={(value) => updateDriver('loadedLaborFactor', value)} />
              </DriverSection>

              <DriverSection title="Premium labor and PBJ" description="Use the prospect's payroll, agency and workflow actuals as soon as they become available.">
                <DriverNumber label="Overtime share of paid hours" value={drivers.overtimeShareOfPaidHours * 100} suffix="%" step={0.1} onChange={(value) => updateDriver('overtimeShareOfPaidHours', value / 100)} />
                <DriverNumber label="Agency share of nursing hours" value={drivers.agencyShareOfNursingHours * 100} suffix="%" step={0.1} onChange={(value) => updateDriver('agencyShareOfNursingHours', value / 100)} />
                <DriverNumber label="Agency rate multiplier" value={drivers.agencyRateMultiplier} suffix="x" step={0.05} onChange={(value) => updateDriver('agencyRateMultiplier', value)} />
                <label>
                  <span className="block text-[9px] uppercase tracking-wider font-bold text-paycor-grey mb-1">PBJ workflow maturity</span>
                  <select value={drivers.pbjWorkflowMaturity} onChange={(event: React.ChangeEvent<HTMLSelectElement>) => updateDriver('pbjWorkflowMaturity', event.target.value as GuidedEstimateDrivers['pbjWorkflowMaturity'])} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">
                    <option value="automated">Automated / well integrated — 4 hrs/mo</option>
                    <option value="mixed">Mixed workflow — 12 hrs/mo</option>
                    <option value="manual">Mostly manual — 24 hrs/mo</option>
                    <option value="high-complexity">High complexity / multi-source — 40 hrs/mo</option>
                  </select>
                </label>
              </DriverSection>
            </div>
          )}

          {activeSection === 'financial' && (
            <div className="space-y-5">
              <DriverSection title="Resident and Medicare revenue" description="These values are directional until finance confirms payer mix and net revenue.">
                <DriverNumber label="Medicare Part A census share" value={drivers.medicarePartACensusShare * 100} suffix="%" step={0.5} onChange={(value) => updateDriver('medicarePartACensusShare', value / 100)} />
                <DriverNumber label="Medicare Part A daily revenue" value={drivers.medicarePartADailyRevenue} prefix="$" onChange={(value) => updateDriver('medicarePartADailyRevenue', value)} />
                <DriverNumber label="Blended daily resident revenue" value={drivers.blendedDailyResidentRevenue} prefix="$" onChange={(value) => updateDriver('blendedDailyResidentRevenue', value)} />
              </DriverSection>

              <DriverSection title="Compliance scenario" description="Leave at zero unless the prospect wants to model a specific operational risk scenario.">
                <DriverNumber label="Residents at risk" value={drivers.complianceResidentsAtRisk} onChange={(value) => updateDriver('complianceResidentsAtRisk', value)} />
                <DriverNumber label="Days affected" value={drivers.complianceDaysAtRisk} onChange={(value) => updateDriver('complianceDaysAtRisk', value)} />
                <DriverNumber label="Remediation labor hours" value={drivers.complianceRemediationHours} onChange={(value) => updateDriver('complianceRemediationHours', value)} />
                <DriverNumber label="Professional / consulting fees" value={drivers.complianceProfessionalFees} prefix="$" onChange={(value) => updateDriver('complianceProfessionalFees', value)} />
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3">
                  <input type="checkbox" checked={drivers.includeRecentCmsFinesInExposure} onChange={(event: React.ChangeEvent<HTMLInputElement>) => updateDriver('includeRecentCmsFinesInExposure', event.target.checked)} />
                  <span className="text-[10px] font-bold">Include CMS-reported recent fines in the scenario</span>
                </label>
              </DriverSection>

              <DriverSection title="Internal Paycor planning estimate" description="This is a temporary internal denominator only. It is blocked from customer-ready treatment until replaced with approved pricing.">
                <DriverNumber label="Planning PEPM" value={drivers.planningPaycorPepm} prefix="$" onChange={(value) => updateDriver('planningPaycorPepm', value)} />
                <DriverNumber label="Annual base fee" value={drivers.planningAnnualBaseFee} prefix="$" onChange={(value) => updateDriver('planningAnnualBaseFee', value)} />
              </DriverSection>
            </div>
          )}

          {activeSection === 'technology' && (
            <div>
              <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-[10px] text-sky-900 mb-4 flex gap-2">
                <Info className="w-4 h-4 shrink-0" />
                Estimate only systems the prospect currently pays for. In the final ROI, only the confirmed retirable portion is counted as avoided annual cost.
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(Object.keys(drivers.techModulePepm) as Array<keyof TechCostMap>).map((key) => (
                  <div key={key} className="rounded-xl border border-slate-200 p-3 flex items-center gap-3">
                    <input type="checkbox" checked={drivers.activeTechModules[key]} onChange={(event: React.ChangeEvent<HTMLInputElement>) => updateDriver('activeTechModules', { ...drivers.activeTechModules, [key]: event.target.checked })} />
                    <div className="flex-1">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-paycor-medium-grey">{formatTechKey(key)}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-paycor-grey">$</span>
                        <input type="number" min="0" step="0.25" value={drivers.techModulePepm[key]} onChange={(event: React.ChangeEvent<HTMLInputElement>) => updateDriver('techModulePepm', { ...drivers.techModulePepm, [key]: Number(event.target.value) || 0 })} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm" />
                        <span className="text-[9px] text-paycor-grey">PEPM</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <footer className="mt-6 pt-5 border-t border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <p className="text-[9px] text-paycor-grey max-w-2xl leading-relaxed">
              Selected estimates will not overwrite confirmed CMS or prospect values unless you deliberately select those fields. All estimates remain editable in the main calculator.
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setDrivers(DEFAULT_GUIDED_ESTIMATE_DRIVERS)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold">Reset drivers</button>
              <button type="button" onClick={applySelected} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-paycor-orange text-white text-xs font-extrabold">
                <Check className="w-4 h-4" /> Apply selected estimates
              </button>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

function DriverSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 p-4">
      <div className="flex gap-2 mb-4">
        <Calculator className="w-4 h-4 text-paycor-orange shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-extrabold">{title}</h3>
          <p className="text-[10px] text-paycor-medium-grey mt-1">{description}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">{children}</div>
    </section>
  );
}

function DriverNumber({
  label,
  value,
  onChange,
  prefix,
  suffix,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
  step?: number;
}) {
  return (
    <label>
      <span className="block text-[9px] uppercase tracking-wider font-bold text-paycor-grey mb-1">{label}</span>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-2.5 text-xs text-paycor-grey">{prefix}</span>}
        <input type="number" min="0" step={step} value={Number.isFinite(value) ? value : 0} onChange={(event: React.ChangeEvent<HTMLInputElement>) => onChange(Number(event.target.value) || 0)} className={`w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-sm ${prefix ? 'pl-7' : 'pl-3'} ${suffix ? 'pr-9' : 'pr-3'}`} />
        {suffix && <span className="absolute right-3 top-2.5 text-xs text-paycor-grey">{suffix}</span>}
      </div>
    </label>
  );
}

function formatTechKey(key: keyof TechCostMap) {
  return {
    recruiting: 'Recruiting / ATS',
    onboarding: 'Onboarding / I-9',
    payroll: 'Core HR / Payroll',
    time: 'Time & Attendance',
    scheduling: 'Staff Scheduling',
    benefits: 'Benefits Administration',
    lms: 'Learning Management',
    performance: 'Performance Management',
    other: 'Other HR Technology',
  }[key];
}
