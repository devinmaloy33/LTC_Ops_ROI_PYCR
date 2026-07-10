import React, { useRef } from "react";
import { Printer, X, FileText } from "lucide-react";
import { ROICalculatorInputs, ROICalculatorResults } from "../lib/calculations";

interface PrintableReportProps {
  inputs: ROICalculatorInputs & { 
    facilityName: string; 
    proposerName: string; 
    proposerTitle: string;
    targetAudience?: string;
  };
  results: ROICalculatorResults;
  onClose: () => void;
}

export default function PrintableReport({ inputs, results, onClose }: PrintableReportProps) {
  const handlePrint = () => window.print();

  return (
    <div className="fixed inset-0 bg-paycor-charcoal/80 z-50 overflow-y-auto flex items-start justify-center p-4 md:p-8 animate-fadeIn print:bg-white print:p-0">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-xl overflow-hidden my-4 print:shadow-none print:my-0 print:rounded-none border border-paycor-border-grey">
        
        {/* Web Only Controls bar */}
        <div className="bg-white p-4 flex items-center justify-between text-paycor-charcoal border-b border-paycor-border-grey print:hidden">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-paycor-orange" />
            <span className="font-extrabold text-xs tracking-wide uppercase text-paycor-charcoal">Board-Ready Business Case PDF Generator</span>
          </div>
          <div className="flex items-center space-x-3">
            <button onClick={handlePrint} className="bg-paycor-orange hover:bg-paycor-red-orange text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center space-x-1.5 transition shadow-sm">
              <Printer className="w-4 h-4" />
              <span>Print or Save as PDF</span>
            </button>
            <button onClick={onClose} className="text-paycor-grey hover:text-paycor-charcoal p-1 transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document */}
        <div className="p-8 md:p-12 bg-white text-paycor-charcoal print:p-6 font-sans">
          
          <div className="border-b-4 border-paycor-orange pb-6 flex justify-between items-start">
            <div>
              <p className="text-paycor-orange font-extrabold text-[10px] tracking-wider uppercase">Paycor Long-Term Care (LTC) ROI Advisory Group</p>
              <h1 className="text-2xl md:text-3xl font-extrabold text-paycor-charcoal mt-1 tracking-tight">CMS-Aligned ROI Business Case</h1>
              <p className="text-xs font-medium text-paycor-medium-grey mt-0.5">Staffing Stability, Rating Protection & Revenue Maximization</p>
            </div>
            <div className="text-right">
              <span className="font-jennasue text-paycor-orange text-3xl leading-none block">Diagnostic Roadmap</span>
              <p className="text-[10px] text-paycor-grey mt-1">Generated: {new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 bg-paycor-bg-light/30 border border-paycor-border-grey rounded-lg p-4 my-6">
            <div>
              <p className="text-[9px] font-bold text-paycor-grey uppercase">Diagnostic Subject</p>
              <p className="text-xs font-bold text-paycor-charcoal mt-0.5 truncate">{inputs.facilityName}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-paycor-grey uppercase">Prepared For</p>
              <p className="text-xs font-bold text-paycor-charcoal mt-0.5 truncate">{inputs.targetAudience || "Chief Financial Officer"}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-paycor-grey uppercase">Prepared By</p>
              <p className="text-xs font-bold text-paycor-charcoal mt-0.5 truncate">{inputs.proposerName}</p>
              <p className="text-[9px] text-paycor-medium-grey leading-tight truncate">{inputs.proposerTitle}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-paycor-grey uppercase">Current CMS Stars</p>
              <div className="flex items-center text-paycor-charcoal font-bold mt-0.5">
                <span className="text-xs">{inputs.baselineVbpStars} Stars</span>
                <span className="text-paycor-amber ml-1">{"★".repeat(Math.floor(inputs.baselineVbpStars))}</span>
              </div>
            </div>
            <div>
              <p className="text-[9px] font-bold text-paycor-grey uppercase">Target CMS Stars</p>
              <p className="text-xs font-bold text-paycor-green mt-0.5">
                {results.isDefensiveMode ? "Protect 4.0+ Stars" : `${inputs.projectedVbpStars || results.targetCmsStarRating} Stars`}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
            {/* Column A */}
            <div className="border border-paycor-border-grey rounded-lg p-4 space-y-4">
              <h3 className="font-extrabold text-[11px] uppercase tracking-wider text-paycor-charcoal border-b border-paycor-border-grey pb-2">I. Baseline Operational Loss Analysis</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-paycor-medium-grey font-medium">Annual Contract Agency Overhead:</span>
                  <span className="font-bold text-paycor-charcoal">${Math.round(inputs.weeklyAgencyHours * inputs.agencyHourlyRate * 52).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-paycor-medium-grey font-medium">Direct-Care Staff Turnover Drag:</span>
                  <span className="font-bold text-paycor-charcoal">${Math.round(results.baselineTurnoverCost).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-paycor-medium-grey font-medium">Administrator Turnover:</span>
                  <span className="font-bold text-paycor-charcoal">{inputs.adminTurnover || "No"}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-paycor-medium-grey font-medium">CMS Fines &amp; Deficiencies:</span>
                  <span className="font-bold text-paycor-charcoal">${(inputs.totalFines || 0).toLocaleString()} ({inputs.healthDeficiencies || 0} Deficiencies)</span>
                </div>
                <div className="flex justify-between items-center text-xs border-t border-paycor-border-grey pt-2 font-bold">
                  <span className="text-paycor-charcoal">Total Baseline Staffing Burden:</span>
                  <span className="text-paycor-red-orange">${Math.round(results.totalBaselineStaffingBurden).toLocaleString()}</span>
                </div>
              </div>
              <div className="bg-paycor-bg-light/30 border border-paycor-border-grey/60 p-3 rounded-lg text-[11px] leading-relaxed">
                <p className="font-bold text-paycor-charcoal">Discharge Referral Benchmarks:</p>
                <p className="text-paycor-medium-grey mt-1">
                  At your current {inputs.baselineVbpStars}-star rating, hospital preferred-referral leakage is estimated at <strong>{results.isDefensiveMode ? "0%" : "30-85%"}</strong>. 
                  {results.isDefensiveMode ? " Your status shields your referrals. If compliance decays, a drop risks losing critical discharges." : ` Stabilizing operations to reach ${results.targetCmsStarRating} Stars reclaims key market share.`}
                </p>
              </div>
            </div>

            {/* Column B */}
            <div className="border border-paycor-border-grey rounded-lg p-4 space-y-4">
              <h3 className="font-extrabold text-[11px] uppercase tracking-wider text-paycor-charcoal border-b border-paycor-border-grey pb-2">II. Calculated Optimization Savings Range</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-paycor-medium-grey font-medium">Turnover Reduction &amp; Stabilization:</span>
                  <span className="font-bold text-paycor-green">${Math.round(results.turnoverSavings).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-paycor-medium-grey font-medium">Agency Spend Recovery (30% reduction):</span>
                  <span className="font-bold text-paycor-green">${Math.round(results.agencySavings).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-paycor-medium-grey font-medium">PBJ Compliance Administration Savings:</span>
                  <span className="font-bold text-paycor-green">${Math.round(results.pbjSavings).toLocaleString()}</span>
                </div>
                {results.totalCurrentTechSpend > 0 && (
                  <div className="flex justify-between items-center text-xs text-paycor-green">
                    <span>Legacy Tech Spend Reclaimed/Retired:</span>
                    <span className="font-bold">+${Math.round(results.totalCurrentTechSpend).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-xs border-t border-paycor-border-grey pt-2 font-bold">
                  <span className="text-paycor-charcoal">Total Direct Savings + Reclaims:</span>
                  <span className="text-paycor-green">${Math.round(results.totalStaffingSavings + results.totalCurrentTechSpend).toLocaleString()}</span>
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-lg text-[11px] leading-relaxed">
                <p className="font-extrabold text-paycor-orange uppercase tracking-wider text-[10px]">Referral / Rating Revenue Impact Range:</p>
                <div className="flex justify-between mt-1.5 text-[10px]">
                  <span className="text-paycor-medium-grey font-medium">Conservative (+{results.conservativeNewReferrals} discharges):</span>
                  <span className="font-bold text-paycor-charcoal">+${Math.round(results.conservativeReferralRevenueImpact).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[10px] mt-0.5">
                  <span className="text-paycor-medium-grey font-medium">Optimistic (+{results.optimisticNewReferrals} discharges):</span>
                  <span className="font-bold text-paycor-orange">+${Math.round(results.optimisticReferralRevenueImpact).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Retired Legacy Software Audit Detailed Table if available */}
          {results.totalCurrentTechSpend > 0 && (
            <div className="border border-paycor-border-grey rounded-lg p-4 my-6 space-y-3">
              <h3 className="font-extrabold text-[11px] uppercase tracking-wider text-paycor-charcoal border-b border-paycor-border-grey pb-2">III. Retired Legacy Software Audit</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-xs">
                {inputs.currentTechCosts && Object.entries(inputs.currentTechCosts).map(([key, value]) => {
                  if (!value) return null;
                  return (
                    <div key={key} className="bg-paycor-bg-light/20 p-2 rounded border border-paycor-border-grey/40">
                      <p className="text-[10px] font-bold text-paycor-grey uppercase truncate">{key}</p>
                      <p className="font-bold text-paycor-charcoal mt-0.5">${value.toLocaleString()}</p>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between items-center text-xs bg-paycor-bg-light/30 p-2 rounded font-bold border border-paycor-border-grey/60">
                <span>Proposed New Software Annual Cost:</span>
                <span className="text-paycor-charcoal">${inputs.softwareCost.toLocaleString()}</span>
                <span>Retired Legacy Total Cost:</span>
                <span className="text-paycor-red-orange">${results.totalCurrentTechSpend.toLocaleString()}</span>
                <span>Net New Investment:</span>
                <span className={`${results.netInvestment <= 0 ? "text-paycor-green font-extrabold" : "text-paycor-charcoal"}`}>
                  {results.netInvestment <= 0 ? "Immediate Net-Zero Savings!" : `$${results.netInvestment.toLocaleString()}`}
                </span>
              </div>
            </div>
          )}

          <div className="bg-white border border-paycor-border-grey rounded-xl p-6 my-6 relative overflow-hidden shadow-sm">
            <div className="absolute top-0 right-0 h-full w-24 bg-paycor-orange/5 transform skew-x-12 translate-x-8" />
            <h3 className="font-extrabold text-[10px] uppercase tracking-wider text-paycor-orange mb-4">IV. Consolidated Financial Projections &amp; ROI</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="border-r border-slate-200 pr-4">
                <p className="text-[10px] uppercase font-bold text-paycor-grey tracking-wider">Total Annual Benefit</p>
                <p className="text-lg md:text-xl font-extrabold text-paycor-charcoal mt-1">
                  ${Math.round(results.totalAnnualImpactConservative).toLocaleString()} - ${Math.round(results.totalAnnualImpactOptimistic).toLocaleString()}
                </p>
              </div>
              <div className="border-r border-slate-200 pr-4">
                <p className="text-[10px] uppercase font-bold text-paycor-grey tracking-wider">Estimated ROI</p>
                <p className="text-lg md:text-xl font-extrabold text-paycor-orange mt-1">
                  {results.roiRatioConservative.toFixed(0)}% - {results.roiRatioOptimistic.toFixed(0)}%
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-paycor-grey tracking-wider">Payback Period</p>
                <p className="text-lg md:text-xl font-extrabold text-paycor-charcoal mt-1">
                  {results.paybackPeriodMonthsOptimistic.toFixed(1)} to {results.paybackPeriodMonthsConservative.toFixed(1)} Mo
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
