'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { 
  Building2, Users, DollarSign, TrendingUp, CheckCircle, 
  ChevronRight, ChevronLeft, FileText, TrendingDown, Zap, 
  FileDown, Sparkles, RefreshCw, AlertCircle, 
  Clock, Briefcase, AlertTriangle, ShieldAlert,
  ToggleLeft, ToggleRight, Star
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import ReactMarkdown from 'react-markdown';
import SheetsSync from '../components/sheets-sync';
import PrintableReport from '../components/printable-report';
import { calculateROIMetrics } from '@/lib/calculations';

export default function LtcRoiCalculator() {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pbjAuditFailureActive, setPbjAuditFailureActive] = useState(false);
  const [step3Tab, setStep3Tab] = useState<'brief' | 'ai_advisory'>('brief');

  // Input States - Restored Granular Controls
  const [facilityName, setFacilityName] = useState<string>('Silver Maple Health & Rehab');
  const [headcount, setHeadcount] = useState<number>(120);
  const [hourlyRate, setHourlyRate] = useState<number>(32);
  const [turnoverRate, setTurnoverRate] = useState<number>(55);
  const [rnTurnover, setRnTurnover] = useState<number>(45);
  const [adminTurnover, setAdminTurnover] = useState<string>('No'); // New CMS Administrative turnover field
  const [totalFines, setTotalFines] = useState<number>(0);
  const [healthDeficiencies, setHealthDeficiencies] = useState<number>(0);
  const [pbjHours, setPbjHours] = useState<number>(140);
  const [overtimeHours, setOvertimeHours] = useState<number>(4800);
  const [annualMedicareBilling, setAnnualMedicareBilling] = useState<number>(4500000);
  const [baselineVbpStars, setBaselineVbpStars] = useState<number>(3.0);
  const [projectedVbpStars, setProjectedVbpStars] = useState<number>(4.0);
  const [weeklyAgencyHours, setWeeklyAgencyHours] = useState<number>(40);
  const [agencyHourlyRate, setAgencyHourlyRate] = useState<number>(67);
  const [referralsPerStarLevel, setReferralsPerStarLevel] = useState<number>(2);
  const [avgResidentValue, setAvgResidentValue] = useState<number>(8750);
  
  // New HR Tech Stack audit inputs
  const [techCosts, setTechCosts] = useState({
    recruiting: 0,
    onboarding: 0,
    payroll: 0,
    time: 0,
    scheduling: 0,
    benefits: 0,
    lms: 0,
    performance: 0,
    other: 0,
  });

  // Proposal Configuration
  const [proposerName, setProposerName] = useState<string>('Bob Coughlin');
  const [proposerTitle, setProposerTitle] = useState<string>('LTC Strategist');
  const [targetAudience, setTargetAudience] = useState<string>('Chief Financial Officer');
  const [softwareCost, setSoftwareCost] = useState<number>(0);

  const [aiStrategy, setAiStrategy] = useState<string>('');
  const [aiStrategyLoading, setAiStrategyLoading] = useState<boolean>(false);
  const [aiStrategyError, setAiStrategyError] = useState<string>('');

  const handleApplySheetMetrics = useCallback((metrics: any) => {
    if (metrics.facilityName !== undefined) setFacilityName(metrics.facilityName);
    if (metrics.headcount !== undefined) setHeadcount(metrics.headcount);
    if (metrics.hourlyRate !== undefined) setHourlyRate(metrics.hourlyRate);
    if (metrics.turnoverRate !== undefined) setTurnoverRate(metrics.turnoverRate);
    if (metrics.rnTurnover !== undefined) setRnTurnover(metrics.rnTurnover);
    if (metrics.adminTurnover !== undefined) setAdminTurnover(metrics.adminTurnover);
    if (metrics.totalFines !== undefined) setTotalFines(metrics.totalFines);
    if (metrics.healthDeficiencies !== undefined) setHealthDeficiencies(metrics.healthDeficiencies);
    if (metrics.baselineVbpStars !== undefined) {
       setBaselineVbpStars(metrics.baselineVbpStars);
       setProjectedVbpStars(Math.min(5, metrics.baselineVbpStars + 1));
    }
    if (metrics.annualMedicareBilling !== undefined) setAnnualMedicareBilling(metrics.annualMedicareBilling);
  }, []);

  const results = useMemo(() => {
    return calculateROIMetrics({
      headcount, hourlyRate, turnoverRate, rnTurnover, totalFines, healthDeficiencies, adminTurnover,
      pbjHours, overtimeHours, annualMedicareBilling, baselineVbpStars, weeklyAgencyHours,
      agencyHourlyRate, avgResidentValue, softwareCost, pbjAuditFailureActive, referralsPerStarLevel, projectedVbpStars,
      currentTechCosts: techCosts
    });
  }, [
    headcount, hourlyRate, turnoverRate, rnTurnover, totalFines, healthDeficiencies, adminTurnover,
    pbjHours, overtimeHours, annualMedicareBilling, baselineVbpStars, weeklyAgencyHours,
    agencyHourlyRate, avgResidentValue, softwareCost, pbjAuditFailureActive, referralsPerStarLevel, projectedVbpStars, techCosts
  ]);

  const chartData = useMemo(() => [
    { name: 'Turnover', Baseline: Math.round(results.baselineTurnoverCost), Projected: Math.round(results.baselineTurnoverCost - results.turnoverSavings) },
    { name: 'Overtime', Baseline: Math.round(results.baselineOvertimeCost), Projected: Math.round(results.baselineOvertimeCost - results.overtimeSavings) },
    { name: 'Agency', Baseline: Math.round(results.baselineAgencyCost), Projected: Math.round(results.baselineAgencyCost - results.agencySavings) },
    { name: 'PBJ Admin', Baseline: Math.round(results.baselinePbjCost), Projected: Math.round(results.baselinePbjCost - results.pbjSavings) },
    ...(pbjAuditFailureActive ? [{ name: 'Audit Penalty', Baseline: Math.round(results.pbjPenaltyCost), Projected: 0 }] : [])
  ], [results, pbjAuditFailureActive]);

  const generateAiStrategyReport = async () => {
    setAiStrategyLoading(true);
    setAiStrategyError('');
    try {
      const response = await fetch('/api/advisory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          facilityName,
          baselineVbpStars,
          projectedVbpStars,
          headcount,
          hourlyRate,
          turnoverRate,
          rnTurnover,
          adminTurnover,
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
          targetAudience,
          referralsPerStarLevel,
          currentTechCosts: techCosts
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to generate advisory report');
      }

      const data = await response.json();
      setAiStrategy(data.advisory);
    } catch (err: any) {
      console.error(err);
      setAiStrategyError(err.message || 'An error occurred during strategy report generation.');
    } finally {
      setAiStrategyLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 relative font-sans text-paycor-charcoal">
      {/* Header */}
      <div id="calculator-header" className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white border border-paycor-border-grey rounded-2xl p-6 shadow-sm">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-white bg-paycor-charcoal px-2.5 py-1 rounded-md">B2B Enterprise Value Engine</span>
          <h1 className="text-2xl font-extrabold text-paycor-charcoal mt-2">LTC Operational <span className="text-paycor-orange font-normal italic font-jennasue">ROI Strategy</span></h1>
          <p className="text-xs text-paycor-medium-grey mt-1">Transform turnover, leakage, and compliance data into an executive-ready business case.</p>
        </div>
        <button id="btn-global-download" onClick={() => setShowPdfModal(true)} className="flex items-center gap-2 bg-paycor-orange hover:bg-paycor-red-orange text-white font-bold py-2.5 px-4 rounded-xl shadow-sm text-xs transition">
          <FileDown className="w-4 h-4" /> Download PDF Report
        </button>
      </div>

      {/* Stepper */}
      <div id="stepper-nav" className="grid grid-cols-3 bg-white border border-paycor-border-grey rounded-2xl p-2 mb-8 shadow-sm text-center font-bold text-xs select-none">
        {[1, 2, 3].map(step => (
          <button key={step} id={`btn-step-${step}`} onClick={() => setActiveStep(step)} className={`py-3 rounded-xl transition flex items-center justify-center gap-2 ${activeStep === step ? 'bg-paycor-orange text-white' : 'text-paycor-medium-grey hover:bg-slate-50'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${activeStep === step ? 'bg-white text-paycor-orange' : 'bg-slate-100 text-paycor-medium-grey'}`}>{step}</span>
            {step === 1 ? 'Diagnostic Registry' : step === 2 ? 'The Leakage Matrix' : 'Board-Ready Case'}
          </button>
        ))}
      </div>

      {/* STEP 1: Diagnostic Registry */}
      {activeStep === 1 && (
        <div id="step-1-container" className="space-y-6 animate-fadeIn">
          <SheetsSync onApplyMetrics={handleApplySheetMetrics} currentValues={{ facilityName, headcount, hourlyRate, turnoverRate, pbjHours, overtimeHours, annualMedicareBilling }} />
          
          <div id="manual-overrides-panel" className="bg-white border border-paycor-border-grey rounded-2xl p-6 shadow-sm">
            <h2 className="text-sm font-extrabold text-paycor-charcoal uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3 mb-6">
              <Building2 className="w-4 h-4 text-paycor-orange" /> Operational Diagnostics & Settings
            </h2>
            
            {/* SECTION 1: FACILITY PROFILE & QUALITY */}
            <div className="mb-6">
              <h3 className="text-xs font-bold text-paycor-orange uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-paycor-orange"></span> Section 1: Facility Profile &amp; Quality Metrics
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Facility Name</label>
                  <input type="text" value={facilityName} onChange={(e) => setFacilityName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-paycor-charcoal focus:border-paycor-orange outline-none transition" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Baseline Stars</label>
                  <select value={baselineVbpStars} onChange={(e) => setBaselineVbpStars(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-paycor-charcoal focus:border-paycor-orange outline-none transition">
                    {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}.0 Stars</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Projected Stars</label>
                  <select value={projectedVbpStars} onChange={(e) => setProjectedVbpStars(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-paycor-charcoal focus:border-paycor-orange outline-none transition">
                    {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}.0 Stars</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">CMS Health Deficiencies</label>
                  <input type="number" value={healthDeficiencies} onChange={(e) => setHealthDeficiencies(Number(e.target.value) || 0)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-paycor-charcoal focus:border-paycor-orange outline-none transition" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Surveyor Fines ($)</label>
                  <input type="number" value={totalFines} onChange={(e) => setTotalFines(Number(e.target.value) || 0)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-paycor-charcoal focus:border-paycor-orange outline-none transition" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Referrals Per Star Level</label>
                  <input type="number" value={referralsPerStarLevel} onChange={(e) => setReferralsPerStarLevel(Number(e.target.value) || 0)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-paycor-charcoal focus:border-paycor-orange outline-none transition" />
                </div>
              </div>
            </div>

            {/* SECTION 2: LABOR & OPERATIONAL DRIVERS */}
            <div className="mb-6 border-t border-slate-100 pt-5">
              <h3 className="text-xs font-bold text-paycor-orange uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-paycor-orange"></span> Section 2: Labor &amp; Operational Metrics
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Total Headcount</label>
                  <input type="number" value={headcount} onChange={(e) => setHeadcount(Number(e.target.value) || 0)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-paycor-charcoal focus:border-paycor-orange outline-none transition" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Average Hourly Rate ($)</label>
                  <input type="number" value={hourlyRate} onChange={(e) => setHourlyRate(Number(e.target.value) || 0)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-paycor-charcoal focus:border-paycor-orange outline-none transition" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">General Turnover (%)</label>
                  <input type="number" value={turnoverRate} onChange={(e) => setTurnoverRate(Number(e.target.value) || 0)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-paycor-charcoal focus:border-paycor-orange outline-none transition" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">RN-Specific Turnover (%)</label>
                  <input type="number" value={rnTurnover} onChange={(e) => setRnTurnover(Number(e.target.value) || 0)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-paycor-charcoal focus:border-paycor-orange outline-none transition" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Administrator Turnover</label>
                  <select value={adminTurnover} onChange={(e) => setAdminTurnover(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-paycor-charcoal focus:border-paycor-orange outline-none transition">
                    <option value="No">No (Stable)</option>
                    <option value="Yes">Yes (New Admin in past 12 mo)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* SECTION 3: COMPLIANCE & PREMIUM RECOVERY */}
            <div className="mb-6 border-t border-slate-100 pt-5">
              <h3 className="text-xs font-bold text-paycor-orange uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-paycor-orange"></span> Section 3: Compliance &amp; Premium Cost Metrics
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">PBJ Audit Prep (hrs/mo)</label>
                  <input type="number" value={pbjHours} onChange={(e) => setPbjHours(Number(e.target.value) || 0)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-paycor-charcoal focus:border-paycor-orange outline-none transition" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Annual Overtime Hours</label>
                  <input type="number" value={overtimeHours} onChange={(e) => setOvertimeHours(Number(e.target.value) || 0)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-paycor-charcoal focus:border-paycor-orange outline-none transition" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Weekly Agency Hours</label>
                  <input type="number" value={weeklyAgencyHours} onChange={(e) => setWeeklyAgencyHours(Number(e.target.value) || 0)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-paycor-charcoal focus:border-paycor-orange outline-none transition" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Agency Hourly Rate ($)</label>
                  <input type="number" value={agencyHourlyRate} onChange={(e) => setAgencyHourlyRate(Number(e.target.value) || 0)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-paycor-charcoal focus:border-paycor-orange outline-none transition" />
                </div>
              </div>
            </div>

            {/* SECTION 4: FINANCIAL & REVENUE DRIVERS */}
            <div className="mb-6 border-t border-slate-100 pt-5">
              <h3 className="text-xs font-bold text-paycor-orange uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-paycor-orange"></span> Section 4: Financial &amp; Census Growth Metrics
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Avg Monthly Resident Value ($)</label>
                  <input type="number" value={avgResidentValue} onChange={(e) => setAvgResidentValue(Number(e.target.value) || 0)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-paycor-charcoal focus:border-paycor-orange outline-none transition" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Medicare Annual Billing ($)</label>
                  <input type="number" value={annualMedicareBilling} onChange={(e) => setAnnualMedicareBilling(Number(e.target.value) || 0)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-paycor-charcoal focus:border-paycor-orange outline-none transition" />
                </div>
              </div>
            </div>

            {/* SECTION 5: RETIRED LEGACY HR TECH STACK AUDIT */}
            <div className="mb-6 border-t border-slate-100 pt-5">
              <h3 className="text-xs font-bold text-paycor-orange uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-paycor-orange"></span> Section 5: Retired Legacy HR Tech Stack Audit
              </h3>
              <p className="text-[10px] text-paycor-grey mb-4 leading-relaxed">Quantify current tech stack fees to demonstrate platform consolidation. Paycor replaces multiple disconnected legacy systems, reclaiming these active costs to offset software cost.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Recruiting / ATS Software Cost ($/yr)</label>
                  <input type="number" value={techCosts.recruiting || ''} placeholder="0" onChange={(e) => setTechCosts({ ...techCosts, recruiting: Number(e.target.value) || 0 })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-paycor-charcoal focus:border-paycor-orange outline-none transition" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Onboarding / I-9 Software Cost ($/yr)</label>
                  <input type="number" value={techCosts.onboarding || ''} placeholder="0" onChange={(e) => setTechCosts({ ...techCosts, onboarding: Number(e.target.value) || 0 })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-paycor-charcoal focus:border-paycor-orange outline-none transition" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Core HR / Payroll Software Cost ($/yr)</label>
                  <input type="number" value={techCosts.payroll || ''} placeholder="0" onChange={(e) => setTechCosts({ ...techCosts, payroll: Number(e.target.value) || 0 })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-paycor-charcoal focus:border-paycor-orange outline-none transition" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Time &amp; Attendance Software Cost ($/yr)</label>
                  <input type="number" value={techCosts.time || ''} placeholder="0" onChange={(e) => setTechCosts({ ...techCosts, time: Number(e.target.value) || 0 })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-paycor-charcoal focus:border-paycor-orange outline-none transition" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Staff Scheduling Software Cost ($/yr)</label>
                  <input type="number" value={techCosts.scheduling || ''} placeholder="0" onChange={(e) => setTechCosts({ ...techCosts, scheduling: Number(e.target.value) || 0 })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-paycor-charcoal focus:border-paycor-orange outline-none transition" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Benefits Admin Software Cost ($/yr)</label>
                  <input type="number" value={techCosts.benefits || ''} placeholder="0" onChange={(e) => setTechCosts({ ...techCosts, benefits: Number(e.target.value) || 0 })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-paycor-charcoal focus:border-paycor-orange outline-none transition" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">LMS / Training Platform Cost ($/yr)</label>
                  <input type="number" value={techCosts.lms || ''} placeholder="0" onChange={(e) => setTechCosts({ ...techCosts, lms: Number(e.target.value) || 0 })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-paycor-charcoal focus:border-paycor-orange outline-none transition" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Performance Software Cost ($/yr)</label>
                  <input type="number" value={techCosts.performance || ''} placeholder="0" onChange={(e) => setTechCosts({ ...techCosts, performance: Number(e.target.value) || 0 })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-paycor-charcoal focus:border-paycor-orange outline-none transition" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Other Isolated HR Tools Cost ($/yr)</label>
                  <input type="number" value={techCosts.other || ''} placeholder="0" onChange={(e) => setTechCosts({ ...techCosts, other: Number(e.target.value) || 0 })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-paycor-charcoal focus:border-paycor-orange outline-none transition" />
                </div>
              </div>

              {/* LIVE TACK REPLACEMENT TICKER */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-full bg-paycor-orange/10 flex items-center justify-center text-paycor-orange font-bold text-sm shrink-0">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-paycor-charcoal">Legacy Tech Reclamation Audit</h4>
                    <p className="text-[10px] text-paycor-grey mt-0.5">Sum of retired services consolidated by Paycor.</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-center shrink-0 w-full sm:w-auto justify-around sm:justify-end">
                  <div>
                    <p className="text-[9px] font-bold text-paycor-grey uppercase">Legacy Costs Retired</p>
                    <p className="text-sm font-black text-paycor-charcoal">${Math.round(results.totalCurrentTechSpend).toLocaleString()}/yr</p>
                  </div>
                  <div className="border-l border-slate-200 pl-4">
                    <p className="text-[9px] font-bold text-paycor-grey uppercase">Proposed Software Cost</p>
                    <p className="text-sm font-bold text-paycor-charcoal">${Math.round(softwareCost).toLocaleString()}/yr</p>
                  </div>
                  <div className="border-l border-slate-200 pl-4">
                    <p className="text-[9px] font-bold text-paycor-grey uppercase">Net Platform Cost</p>
                    {results.netInvestment <= 0 ? (
                      <span className="bg-paycor-green/10 border border-paycor-green/20 text-paycor-green font-extrabold text-[10px] px-2 py-0.5 rounded-full inline-block mt-0.5">Immediate Net-Zero!</span>
                    ) : (
                      <p className="text-sm font-black text-paycor-orange">${Math.round(results.netInvestment).toLocaleString()}/yr</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {results.isDefensiveMode ? (
              <div id="defensive-badge-panel" className="p-3.5 bg-paycor-green/5 border border-paycor-green/20 rounded-xl flex items-start space-x-2 text-xs text-paycor-charcoal">
                <Star className="w-4 h-4 text-paycor-green shrink-0 mt-0.5" />
                <span><strong>Defensive Strategy Engaged:</strong> This facility is rated 4.0+ stars. The calculations have automatically pivoted to focus on risk mitigation, nursing retention shielding, and safeguarding your hospital discharges against compliance downgrades.</span>
              </div>
            ) : (
              <div id="growth-badge-panel" className="p-3.5 bg-paycor-orange/5 border border-paycor-orange/20 rounded-xl flex items-start space-x-2 text-xs text-paycor-charcoal">
                <TrendingDown className="w-4 h-4 text-paycor-orange shrink-0 mt-0.5" />
                <span><strong>Growth Strategy Engaged:</strong> This facility is rated 1.0-3.0 stars. The math engine projects they are currently leaking an estimated <strong>{results.resolvedReferralsLostCurrently} hospital preferred-referral discharges per year</strong> to higher-rated area competitors. Targeting a lift to <strong>{projectedVbpStars}.0 Stars</strong> will unlock significant commercial census growth.</span>
              </div>
            )}
            
            <div className="flex justify-end mt-6 pt-4 border-t border-slate-100">
              <button id="btn-next-to-leakage" onClick={() => setActiveStep(2)} className="flex items-center gap-2 bg-paycor-orange hover:bg-paycor-red-orange text-white font-bold py-2.5 px-6 rounded-xl transition shadow-sm text-sm">
                Proceed to Leakage Matrix <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: The Leakage Matrix */}
      {activeStep === 2 && (
        <div id="step-2-container" className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fadeIn">
          {/* Left Column: Toggles & Risk */}
          <div className="space-y-6">
            <div id="pbj-audit-simulator-panel" className="bg-white border border-paycor-border-grey rounded-2xl overflow-hidden shadow-sm">
              <div className="bg-white border-b border-slate-100 p-4 flex justify-between items-center text-paycor-charcoal">
                <div className="flex items-center space-x-2">
                  <ShieldAlert className="w-4 h-4 text-paycor-orange" />
                  <span className="font-extrabold text-sm uppercase tracking-wider">PBJ Audit Simulator</span>
                </div>
                <button id="btn-toggle-pbj" onClick={() => setPbjAuditFailureActive(!pbjAuditFailureActive)} className="focus:outline-none">
                  {pbjAuditFailureActive ? <ToggleRight className="w-8 h-8 text-paycor-orange" /> : <ToggleLeft className="w-8 h-8 text-paycor-grey" />}
                </button>
              </div>
              <div className="p-5 text-xs text-paycor-medium-grey">
                <p className="leading-relaxed">Simulate a PBJ compliance audit failure, which instantly triggers a 90-day 1-Star penalty and hospital preferred-referral freeze.</p>
                {pbjAuditFailureActive && (
                  <div id="pbj-warning-message" className="mt-4 p-3.5 bg-paycor-red-orange/10 border border-paycor-red-orange/20 text-paycor-charcoal rounded-xl font-bold flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-paycor-red-orange shrink-0 mt-0.5" />
                    <span>Penalty Active: Added ${Math.round(results.pbjPenaltyCost).toLocaleString()} in lost annualized census revenue due to the simulated CMS citation level.</span>
                  </div>
                )}
              </div>
            </div>

            <div id="competitor-leakage-panel" className="bg-white border border-paycor-border-grey rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-sm text-paycor-charcoal mb-4">Competitor Leakage Mapping</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-semibold text-paycor-medium-grey mb-1">
                    <span>{facilityName} (Current)</span>
                    <span className="font-bold">{baselineVbpStars} Stars</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden flex">
                    <div className="h-full bg-paycor-orange transition-all duration-500" style={{ width: `${baselineVbpStars * 20}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-semibold text-paycor-medium-grey mb-1">
                    <span>Local Market Competitor Average</span>
                    <span className="font-bold">3.8 Stars</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden flex">
                    <div className="h-full bg-paycor-navy transition-all duration-500" style={{ width: `${3.8 * 20}%` }} />
                  </div>
                </div>
                {!results.isDefensiveMode && (
                  <div>
                    <div className="flex justify-between text-xs font-semibold text-paycor-medium-grey mb-1">
                      <span>{facilityName} (Target Objective)</span>
                      <span className="font-bold text-paycor-green">{projectedVbpStars} Stars</span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden flex">
                      <div className="h-full bg-paycor-green transition-all duration-500" style={{ width: `${projectedVbpStars * 20}%` }} />
                    </div>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-paycor-grey mt-4 leading-relaxed">Closing the {Math.max(0, projectedVbpStars - baselineVbpStars).toFixed(1)}-Star gap directly drives discharge retention and safeguards reimbursement multipliers.</p>
            </div>
          </div>

          {/* Right Column: Visual Projections */}
          <div id="visual-projections-panel" className="bg-white border border-paycor-border-grey rounded-2xl p-6 shadow-sm flex flex-col">
            <h2 className="text-base font-extrabold text-paycor-charcoal">Cost Projections</h2>
            <p className="text-xs text-paycor-medium-grey mt-1 mb-6">Annualized savings mapped to Paycor direct-care workforce solutions.</p>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <XAxis dataKey="name" fontSize={10} stroke="#888B8D" />
                  <YAxis fontSize={10} stroke="#888B8D" />
                  <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                  <Legend height={30} verticalAlign="top" iconSize={10} />
                  <Bar dataKey="Baseline" fill="#3B4446" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Projected" fill="#F58220" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-between items-center mt-auto pt-4 border-t border-slate-100">
              <button id="btn-back-to-registry" onClick={() => setActiveStep(1)} className="text-xs text-paycor-medium-grey font-bold hover:underline">
                &larr; Back to Registry
              </button>
              <button id="btn-generate-case" onClick={() => setActiveStep(3)} className="flex items-center gap-2 bg-paycor-orange hover:bg-paycor-red-orange text-white font-bold py-2.5 px-6 rounded-xl transition shadow-sm text-sm">
                Generate Executive Case <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Board Ready Case */}
      {activeStep === 3 && (
        <div id="step-3-container" className="bg-white border border-paycor-border-grey rounded-2xl overflow-hidden shadow-sm animate-fadeIn">
          <div className="bg-white border-b border-slate-100 p-6 text-center">
            <h2 className="text-xl font-extrabold text-paycor-charcoal">Final Financial Reconciliation</h2>
            <p className="text-xs text-paycor-medium-grey mt-1">Strategic Operations &amp; Value Delivery</p>
          </div>
          
          <div className="p-6">
            {/* Tab Switches */}
            <div id="step-3-tabs" className="flex border-b border-paycor-border-grey mb-6">
              <button
                id="btn-tab-brief"
                onClick={() => setStep3Tab('brief')}
                className={`py-2.5 px-4 font-bold text-xs border-b-2 transition ${step3Tab === 'brief' ? 'border-paycor-orange text-paycor-orange' : 'border-transparent text-paycor-grey hover:text-paycor-charcoal'}`}
              >
                Executive Financial Brief
              </button>
              <button
                id="btn-tab-advisory"
                onClick={() => setStep3Tab('ai_advisory')}
                className={`py-2.5 px-4 font-bold text-xs border-b-2 transition flex items-center gap-1.5 ${step3Tab === 'ai_advisory' ? 'border-paycor-orange text-paycor-orange' : 'border-transparent text-paycor-grey hover:text-paycor-charcoal'}`}
              >
                <Sparkles className="w-3.5 h-3.5" /> AI Strategic Advisory
              </button>
            </div>

            {step3Tab === 'brief' ? (
              <div id="tab-brief-content" className="animate-fadeIn">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 border-b border-paycor-border-grey pb-8">
                  <div className="border-r border-slate-200 pr-6 text-center">
                    <p className="text-[10px] uppercase font-bold text-paycor-grey tracking-wider">Conservative ROI Model</p>
                    <p className="text-3xl font-black text-paycor-charcoal mt-2">${Math.round(results.totalAnnualImpactConservative).toLocaleString()}</p>
                    <p className="text-sm text-paycor-green font-bold mt-2">{results.roiRatioConservative.toFixed(0)}% ROI</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] uppercase font-bold text-paycor-grey tracking-wider">Optimistic ROI Model</p>
                    <p className="text-3xl font-black text-paycor-charcoal mt-2">${Math.round(results.totalAnnualImpactOptimistic).toLocaleString()}</p>
                    <p className="text-sm text-paycor-orange font-bold mt-2">{results.roiRatioOptimistic.toFixed(0)}% ROI</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-5 mb-8 bg-slate-50 border border-slate-100 p-5 rounded-2xl">
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-paycor-grey uppercase">Staffing Savings</p>
                    <p className="text-base font-extrabold text-paycor-charcoal mt-1">${Math.round(results.totalStaffingSavings).toLocaleString()}/yr</p>
                  </div>
                  <div className="text-center border-l border-slate-200 pl-4">
                    <p className="text-[10px] font-bold text-paycor-grey uppercase">VBP &amp; Census Gain</p>
                    <p className="text-base font-extrabold text-paycor-charcoal mt-1">
                      ${Math.round(results.conservativeReferralRevenueImpact).toLocaleString()} - ${Math.round(results.optimisticReferralRevenueImpact).toLocaleString()}/yr
                    </p>
                  </div>
                  <div className="text-center border-l border-slate-200 pl-4">
                    <p className="text-[10px] font-bold text-paycor-grey uppercase">Legacy Tech Reclaims</p>
                    <p className="text-base font-extrabold text-paycor-green mt-1">
                      +${Math.round(results.totalCurrentTechSpend).toLocaleString()}/yr
                    </p>
                  </div>
                  <div className="text-center border-l border-slate-200 pl-4">
                    <p className="text-[10px] font-bold text-paycor-grey uppercase">Payback Window</p>
                    <p className="text-base font-extrabold text-paycor-orange mt-1">
                      {results.paybackPeriodMonthsOptimistic.toFixed(1)} to {results.paybackPeriodMonthsConservative.toFixed(1)} Months
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div id="tab-advisory-content" className="animate-fadeIn space-y-4">
                {aiStrategy ? (
                  <div className="space-y-4">
                    <div id="ai-report-card" className="bg-slate-50 border border-paycor-border-grey rounded-2xl p-6 md:p-8 max-h-[420px] overflow-y-auto shadow-inner text-sm leading-relaxed text-slate-800 prose prose-slate">
                      <ReactMarkdown>{aiStrategy}</ReactMarkdown>
                    </div>
                    <div className="flex justify-end">
                      <button 
                        id="btn-regenerate-ai"
                        onClick={generateAiStrategyReport} 
                        disabled={aiStrategyLoading} 
                        className="flex items-center gap-2 border border-paycor-border-grey hover:border-paycor-orange text-paycor-charcoal hover:text-paycor-orange font-bold text-xs py-2 px-4 rounded-xl transition disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${aiStrategyLoading ? 'animate-spin' : ''}`} /> Regenerate Strategic advisory
                      </button>
                    </div>
                  </div>
                ) : (
                  <div id="ai-generation-prompt-card" className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center max-w-xl mx-auto">
                    <Sparkles className="w-10 h-10 text-paycor-orange mx-auto mb-4" />
                    <h3 className="font-extrabold text-paycor-charcoal text-base">Generate Strategic Board Advisory</h3>
                    <p className="text-xs text-paycor-medium-grey mt-2 mb-6">Let Gemini analyze your current operational leakages, PBJ compliance risks, and county CMS benchmarks to draft a highly technical, numbers-driven strategic advisory memo tailored for **{targetAudience}**.</p>
                    
                    <button 
                      id="btn-generate-ai-advisory"
                      onClick={generateAiStrategyReport} 
                      disabled={aiStrategyLoading}
                      className="w-full flex items-center justify-center gap-2 bg-paycor-orange hover:bg-paycor-red-orange text-white font-bold py-3 px-6 rounded-xl transition shadow-sm text-sm disabled:opacity-50"
                    >
                      {aiStrategyLoading ? (
                        <>
                           <RefreshCw className="w-4 h-4 animate-spin" />
                           <span>Generating Advisory...</span>
                        </>
                      ) : (
                        <>
                           <Sparkles className="w-4 h-4" />
                           <span>Draft Executive Memo</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {aiStrategyError && (
                  <div id="ai-error-banner" className="p-4 bg-paycor-red-orange/10 border border-paycor-red-orange/20 text-paycor-charcoal text-xs rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-paycor-red-orange shrink-0" />
                    <span>{aiStrategyError}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-6 border-t border-slate-100 pt-5">
              <button id="btn-back-to-matrix" onClick={() => setActiveStep(2)} className="text-xs text-paycor-medium-grey font-bold hover:underline order-2 md:order-1">
                &larr; Back to Leakage Matrix
              </button>
              <button id="btn-launch-pdf" onClick={() => setShowPdfModal(true)} className="w-full md:w-auto flex items-center justify-center gap-2 bg-paycor-orange hover:bg-paycor-red-orange text-white font-bold py-3 px-8 rounded-xl shadow-sm transition order-1 md:order-2 text-sm">
                <FileDown className="w-5 h-5" /> Launch PDF Presentation
              </button>
            </div>
            
            {/* Proposal Configuration Fields */}
            <div id="proposal-configuration-panel" className="mt-8 bg-slate-50 p-5 rounded-2xl border border-paycor-border-grey">
              <h3 className="text-xs font-bold text-paycor-charcoal uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-paycor-orange" /> Final Proposal Configuration
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Prepared By</label>
                  <input type="text" value={proposerName} onChange={(e) => setProposerName(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-paycor-charcoal focus:border-paycor-orange outline-none transition" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Title</label>
                  <input type="text" value={proposerTitle} onChange={(e) => setProposerTitle(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-paycor-charcoal focus:border-paycor-orange outline-none transition" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Target Audience</label>
                  <input type="text" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-paycor-charcoal focus:border-paycor-orange outline-none transition" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Software Cost ($)</label>
                  <input type="number" value={softwareCost} onChange={(e) => setSoftwareCost(Number(e.target.value))} className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-paycor-charcoal focus:border-paycor-orange outline-none transition" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full Screen Printable Modal Overlay */}
      {showPdfModal && (
        <PrintableReport 
          inputs={{ 
            headcount, hourlyRate, turnoverRate, rnTurnover, totalFines, healthDeficiencies, adminTurnover,
            pbjHours, overtimeHours, annualMedicareBilling, baselineVbpStars, projectedVbpStars, 
            weeklyAgencyHours, agencyHourlyRate, avgResidentValue, softwareCost, pbjAuditFailureActive,
            referralsPerStarLevel, facilityName, proposerName, proposerTitle, targetAudience,
            currentTechCosts: techCosts
          }} 
          results={results} 
          onClose={() => setShowPdfModal(false)} 
        />
      )}
    </div>
  );
}
