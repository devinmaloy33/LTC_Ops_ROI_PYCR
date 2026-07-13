'use client';

import { jsPDF } from 'jspdf';
import { ASSUMPTION_DEFINITIONS } from './assumptions';
import { buildExecutiveNarrative } from './executive-narrative';
import {
  AnalysisMode,
  FacilityROICalculatorInputs,
  FacilityROIResults,
  PortfolioROIResults,
  ScenarioAssumptions,
  ScenarioKey,
  StrategicOpportunitySummary,
} from './roi-types';

interface PdfPayload {
  mode: AnalysisMode;
  facilityInputs: FacilityROICalculatorInputs;
  facilityResults: FacilityROIResults;
  portfolioResults?: PortfolioROIResults;
  scenario: ScenarioKey;
  assumptions: ScenarioAssumptions;
  proposerName: string;
  proposerTitle: string;
  targetAudience: string;
  strategicOpportunity: StrategicOpportunitySummary;
  includeAppendix: boolean;
  customerReady: boolean;
}

const money = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value || 0);

const percent = (value: number | null) =>
  value === null ? 'N/A' : `${value.toFixed(0)}%`;

export async function downloadRoiPdf(payload: PdfPayload): Promise<void> {
  const {
    mode,
    facilityInputs,
    facilityResults,
    portfolioResults,
    scenario,
    assumptions,
    proposerName,
    proposerTitle,
    targetAudience,
    strategicOpportunity,
    includeAppendix,
    customerReady,
  } = payload;

  const isPortfolio = mode === 'portfolio' && Boolean(portfolioResults);
  const doc = new jsPDF('p', 'pt', 'a4');

  // Page dimensions in points: A4 is 595.28 x 841.89
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 54;
  const contentWidth = pageWidth - margin * 2;
  let currentY = 60;

  function addHeader(isFirstPage = false) {
    if (isFirstPage) return;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(136, 139, 141); // Paycor grey
    doc.text('LTC & Skilled Nursing Operational ROI', margin, 40);
    doc.text(
      isPortfolio ? 'Portfolio Assessment' : `Facility Assessment · ${facilityInputs.facilityName}`,
      pageWidth - margin,
      40,
      { align: 'right' },
    );
    doc.setDrawColor(214, 215, 217); // Paycor border grey
    doc.setLineWidth(0.5);
    doc.line(margin, 46, pageWidth - margin, 46);
  }

  function addFooter(pageNumber: number, totalPagesPlaceholder = '') {
    doc.setDrawColor(214, 215, 217);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 50, pageWidth - margin, pageHeight - 50);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(136, 139, 141);
    doc.text(
      'This analysis is an estimate for business-planning purposes; it is not a guarantee of savings or clinical outcomes.',
      margin,
      pageHeight - 38,
      { maxWidth: contentWidth - 80 },
    );

    const pageStr = `Page ${pageNumber}${totalPagesPlaceholder}`;
    doc.text(pageStr, pageWidth - margin, pageHeight - 38, { align: 'right' });
  }

  function addDraftWatermark() {
    if (customerReady) return;
    doc.setTextColor(240, 240, 240);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(80);
    // Render text rotated across the page
    doc.text('PLANNING DRAFT', pageWidth / 2, pageHeight / 2, {
      align: 'center',
      angle: 45,
    });
  }

  function addNewPage() {
    doc.addPage();
    addDraftWatermark();
    currentY = 70;
  }

  // --- PAGE 1: TITLE & EXECUTIVE SUMMARY ---
  addDraftWatermark();

  // Paycor Orange Bar (Pantone 158: rgb(245, 130, 32))
  doc.setFillColor(245, 130, 32);
  doc.rect(margin, currentY, contentWidth, 6, 'F');
  currentY += 24;

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(245, 130, 32);
  doc.text('LONG-TERM CARE & SKILLED NURSING OPERATIONAL ROI', margin, currentY);
  currentY += 18;

  const titleText = isPortfolio
    ? `${facilityInputs.chainName || 'Portfolio'} — ${portfolioResults!.facilityCount}-Facility Business Case`
    : `Facility Business Case — ${facilityInputs.facilityName}`;

  doc.setFontSize(20);
  doc.setTextColor(59, 68, 70); // Paycor charcoal
  const splitTitle = doc.splitTextToSize(titleText, contentWidth);
  doc.text(splitTitle, margin, currentY);
  currentY += splitTitle.length * 24 + 4;

  if (!isPortfolio) {
    const location = [
      facilityInputs.facilityAddress,
      facilityInputs.city,
      facilityInputs.state,
      facilityInputs.zip,
    ]
      .filter(Boolean)
      .join(' · ');
    if (location) {
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(136, 139, 141);
      doc.text(location, margin, currentY);
      currentY += 14;
    }
  }

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(84, 88, 90); // Paycor medium grey
  doc.text(
    `Prepared for ${targetAudience || 'Executive Leadership'} by ${proposerName || 'Paycor Consultant'}${proposerTitle ? `, ${proposerTitle}` : ''}.`,
    margin,
    currentY,
  );
  currentY += 14;

  doc.setFontSize(8);
  doc.setTextColor(136, 139, 141);
  doc.text(
    `Scenario: ${scenario.toUpperCase()} (Base ROI reflects direct & Paycor-influenced values only).`,
    margin,
    currentY,
  );
  currentY += 28;

  // Executive Summary Narrative
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(59, 68, 70);
  doc.text('Executive Summary', margin, currentY);
  currentY += 16;

  // Draw light grey box for narrative
  const boxY = currentY;
  const narrative = buildExecutiveNarrative({
    mode,
    targetAudience,
    facility: facilityInputs,
    facilityResults,
    portfolioResults,
    strategicOpportunity,
    customerReady,
  });

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(84, 88, 90);

  let narrativeHeight = 12;
  const splitParagraphs = narrative.paragraphs.map((p) => {
    const lines = doc.splitTextToSize(p, contentWidth - 24);
    narrativeHeight += lines.length * 13 + 10;
    return lines;
  });

  doc.setFillColor(245, 246, 244); // Paycor bg light
  doc.rect(margin, boxY, contentWidth, narrativeHeight, 'F');

  let textY = boxY + 16;
  splitParagraphs.forEach((lines) => {
    doc.text(lines, margin + 12, textY);
    textY += lines.length * 13 + 10;
  });

  currentY = boxY + narrativeHeight + 24;

  // Executive Financial Metrics
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(59, 68, 70);
  doc.text('Executive Financial Summary', margin, currentY);
  currentY += 16;

  const baseBenefit = isPortfolio
    ? portfolioResults!.totalPaycorInfluencedBenefit
    : facilityResults.totalPaycorInfluencedBenefit;
  const investment = isPortfolio
    ? portfolioResults!.totalSoftwareCost
    : facilityResults.softwareCost;
  const netBenefit = isPortfolio
    ? portfolioResults!.netAnnualBenefit
    : facilityResults.netAnnualBenefit;
  const roi = isPortfolio ? portfolioResults!.roiPercent : facilityResults.roiPercent;
  const bcr = isPortfolio
    ? portfolioResults!.benefitCostRatio
    : facilityResults.benefitCostRatio;
  const payback = isPortfolio
    ? portfolioResults!.paybackMonths
    : facilityResults.paybackMonths;

  const metrics = [
    { label: 'Annual Benefit', value: money(baseBenefit) },
    { label: 'Annual Investment', value: money(investment) },
    { label: 'Net Annual Benefit', value: money(netBenefit) },
    { label: 'Net ROI', value: percent(roi) },
    { label: 'Benefit-Cost Ratio', value: bcr === null ? 'N/A' : `${bcr.toFixed(2)}x` },
    { label: 'Payback Period', value: payback === null ? 'N/A' : `${payback.toFixed(1)} mos` },
  ];

  const colWidth = contentWidth / 3;
  metrics.forEach((metric, index) => {
    const row = Math.floor(index / 3);
    const col = index % 3;
    const itemX = margin + col * colWidth;
    const itemY = currentY + row * 45;

    doc.setFillColor(245, 246, 244);
    doc.rect(itemX, itemY, colWidth - 8, 38, 'F');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(136, 139, 141);
    doc.text(metric.label.toUpperCase(), itemX + 8, itemY + 12);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(245, 130, 32);
    doc.text(metric.value, itemX + 8, itemY + 28);
  });

  addFooter(1);

  // --- PAGE 2: VALUATION DETAIL OR PORTFOLIO DETAIL ---
  addNewPage();
  addHeader();

  if (isPortfolio) {
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(59, 68, 70);
    doc.text('Portfolio Facilities Breakdown', margin, currentY);
    currentY += 20;

    // Draw Portfolio Table Header
    doc.setFillColor(245, 246, 244);
    doc.rect(margin, currentY, contentWidth, 20, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(59, 68, 70);
    doc.text('Facility', margin + 8, currentY + 13);
    doc.text('Chain', margin + 180, currentY + 13);
    doc.text('Headcount', margin + 280, currentY + 13, { align: 'right' });
    doc.text('Annual Benefit', margin + 360, currentY + 13, { align: 'right' });
    doc.text('Investment', margin + 430, currentY + 13, { align: 'right' });
    doc.text('Net ROI', margin + 480, currentY + 13, { align: 'right' });
    currentY += 20;

    doc.setFont('Helvetica', 'normal');
    portfolioResults!.facilities.forEach(({ inputs, results }) => {
      if (currentY > pageHeight - 100) {
        addFooter(2);
        addNewPage();
        addHeader();
        doc.setFillColor(245, 246, 244);
        doc.rect(margin, currentY, contentWidth, 20, 'F');
        doc.setFont('Helvetica', 'bold');
        doc.text('Facility', margin + 8, currentY + 13);
        doc.text('Chain', margin + 180, currentY + 13);
        doc.text('Headcount', margin + 280, currentY + 13, { align: 'right' });
        doc.text('Annual Benefit', margin + 360, currentY + 13, { align: 'right' });
        doc.text('Investment', margin + 430, currentY + 13, { align: 'right' });
        doc.text('Net ROI', margin + 480, currentY + 13, { align: 'right' });
        currentY += 20;
        doc.setFont('Helvetica', 'normal');
      }

      doc.setDrawColor(214, 215, 217);
      doc.line(margin, currentY, margin + contentWidth, currentY);

      doc.setFont('Helvetica', 'bold');
      doc.text(doc.splitTextToSize(inputs.facilityName, 160)[0], margin + 8, currentY + 13);
      doc.setFont('Helvetica', 'normal');
      doc.text(inputs.chainName ? doc.splitTextToSize(inputs.chainName, 90)[0] : '—', margin + 180, currentY + 13);
      doc.text(Math.round(inputs.headcount).toLocaleString(), margin + 280, currentY + 13, { align: 'right' });
      doc.text(money(results.totalPaycorInfluencedBenefit), margin + 360, currentY + 13, { align: 'right' });
      doc.text(money(results.softwareCost), margin + 430, currentY + 13, { align: 'right' });
      doc.text(percent(results.roiPercent), margin + 480, currentY + 13, { align: 'right' });

      currentY += 20;
    });
  } else {
    // Facility Profile
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(59, 68, 70);
    doc.text('Facility Operational Profile', margin, currentY);
    currentY += 16;

    const profile = [
      { label: 'Headcount', value: Math.round(facilityInputs.headcount).toLocaleString() },
      { label: 'Hourly Wage', value: money(facilityInputs.hourlyRate) },
      { label: 'Turnover Rate', value: `${facilityInputs.turnoverRate.toFixed(1)}%` },
      { label: 'CMS Rating', value: `${facilityInputs.overallRating.toFixed(1)} Stars` },
    ];

    profile.forEach((item, index) => {
      const itemX = margin + index * (contentWidth / 4);
      doc.setFillColor(245, 246, 244);
      doc.rect(itemX, currentY, contentWidth / 4 - 6, 28, 'F');
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(136, 139, 141);
      doc.text(item.label.toUpperCase(), itemX + 6, currentY + 10);
      doc.setFontSize(9);
      doc.setTextColor(59, 68, 70);
      doc.text(item.value, itemX + 6, currentY + 22);
    });
    currentY += 40;

    // Value Build Table
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Value Build Detail', margin, currentY);
    currentY += 16;

    doc.setFillColor(245, 246, 244);
    doc.rect(margin, currentY, contentWidth, 20, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(59, 68, 70);
    doc.text('Value Driver', margin + 8, currentY + 13);
    doc.text('Class', margin + 140, currentY + 13);
    doc.text('Burden', margin + 210, currentY + 13, { align: 'right' });
    doc.text('Improvement', margin + 290, currentY + 13, { align: 'right' });
    doc.text('Attribution', margin + 360, currentY + 13, { align: 'right' });
    doc.text('Annual Benefit', margin + 460, currentY + 13, { align: 'right' });
    currentY += 20;

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);

    facilityResults.valueLineItems
      .filter((item) => item.includedInBaseROI)
      .forEach((item) => {
        doc.setDrawColor(214, 215, 217);
        doc.line(margin, currentY, margin + contentWidth, currentY);

        doc.setFont('Helvetica', 'bold');
        doc.text(item.label, margin + 8, currentY + 13);
        doc.setFont('Helvetica', 'normal');
        doc.text(item.evidenceClass, margin + 140, currentY + 13);
        doc.text(item.currentBurden > 0 ? money(item.currentBurden) : '—', margin + 210, currentY + 13, { align: 'right' });
        doc.text(item.attainableImprovement > 0 ? `${(item.attainableImprovement * 100).toFixed(0)}%` : '—', margin + 290, currentY + 13, { align: 'right' });
        doc.text(item.paycorAttribution > 0 ? `${(item.paycorAttribution * 100).toFixed(0)}%` : '—', margin + 360, currentY + 13, { align: 'right' });
        doc.text(money(item.annualBenefit), margin + 460, currentY + 13, { align: 'right' });

        const detailLines = doc.splitTextToSize(item.explanation, contentWidth - 16);
        currentY += 18;
        doc.setFont('Helvetica', 'italic');
        doc.setFontSize(7);
        doc.setTextColor(136, 139, 141);
        doc.text(detailLines, margin + 8, currentY + 2);
        currentY += detailLines.length * 9 + 4;

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(84, 88, 90);
      });
  }

  addFooter(2);

  // --- PAGE 3: STRATEGIC OPPORTUNITY ---
  addNewPage();
  addHeader();

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(59, 68, 70);
  doc.text('Strategic Downstream Opportunity', margin, currentY);
  currentY += 14;

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(136, 139, 141);
  const discLines = doc.splitTextToSize(strategicOpportunity.disclosure, contentWidth);
  doc.text(discLines, margin, currentY);
  currentY += discLines.length * 11 + 16;

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(59, 68, 70);
  doc.text(
    `Unlocking correlated strategic value: ${money(strategicOpportunity.valueLow)} – ${money(strategicOpportunity.valueHigh)}`,
    margin,
    currentY,
  );
  currentY += 16;

  strategicOpportunity.modules.forEach((module) => {
    if (currentY > pageHeight - 160) {
      addFooter(3);
      addNewPage();
      addHeader();
    }

    doc.setDrawColor(214, 215, 217);
    doc.line(margin, currentY, margin + contentWidth, currentY);
    currentY += 14;

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(59, 68, 70);
    doc.text(module.title, margin, currentY);

    if (module.valueIncludedInRange && module.valueHigh > 0) {
      doc.text(`${money(module.valueLow)} – ${money(module.valueHigh)}`, pageWidth - margin, currentY, { align: 'right' });
    }
    currentY += 12;

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(245, 130, 32);
    doc.text(module.statusLabel.toUpperCase(), margin, currentY);
    currentY += 12;

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(84, 88, 90);
    const narrativeLines = doc.splitTextToSize(module.narrative, contentWidth);
    doc.text(narrativeLines, margin, currentY);
    currentY += narrativeLines.length * 11 + 6;

    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(136, 139, 141);
    const methLines = doc.splitTextToSize(`Methodology: ${module.methodology}`, contentWidth);
    doc.text(methLines, margin, currentY);
    currentY += methLines.length * 10 + 12;
  });

  addFooter(3);

  // --- PAGE 4: APPENDIX (IF REQUESTED) ---
  if (includeAppendix) {
    addNewPage();
    addHeader();

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(59, 68, 70);
    doc.text('Methodology Appendix: Scenario Assumptions', margin, currentY);
    currentY += 18;

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(84, 88, 90);

    ASSUMPTION_DEFINITIONS.forEach((definition) => {
      if (currentY > pageHeight - 120) {
        addFooter(4);
        addNewPage();
        addHeader();
      }

      doc.setDrawColor(214, 215, 217);
      doc.line(margin, currentY, margin + contentWidth, currentY);
      currentY += 14;

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(59, 68, 70);
      doc.text(definition.label, margin, currentY);

      const val = assumptions[definition.key];
      const valStr = definition.isPercentage ? `${(val * 100).toFixed(1)}%` : val.toFixed(2);
      doc.text(valStr, pageWidth - margin, currentY, { align: 'right' });
      currentY += 12;

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(84, 88, 90);
      const descLines = doc.splitTextToSize(definition.description, contentWidth);
      doc.text(descLines, margin, currentY);
      currentY += descLines.length * 10 + 6;

      doc.setFont('Helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(136, 139, 141);
      doc.text(`Evidence Class: ${definition.evidenceClass.toUpperCase()} · Source: ${definition.sourceLabel}`, margin, currentY);
      currentY += 14;
    });

    addFooter(4);
  }

  // Save the PDF
  const filename = isPortfolio
    ? `Paycor_LTC_ROI_Portfolio_Assessment.pdf`
    : `Paycor_LTC_ROI_Facility_Assessment_${facilityInputs.facilityName.replace(/\s+/g, '_')}.pdf`;

  doc.save(filename);
}
