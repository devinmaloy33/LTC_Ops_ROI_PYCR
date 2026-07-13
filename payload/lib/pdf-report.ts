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
  ValueLineItem,
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

const number = (value: number, digits = 0) =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value || 0);

const percent = (value: number | null) =>
  value === null ? 'N/A' : `${value.toFixed(0)}%`;

async function loadPublicImageAsDataUrl(assetPath: string): Promise<string | null> {
  try {
    const response = await fetch(assetPath);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function safeFilename(value: string): string {
  return value
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 90);
}

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
  const logo = await loadPublicImageAsDataUrl('/paycor-logo.png');

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 46;
  const contentWidth = pageWidth - margin * 2;
  const footerY = pageHeight - 36;
  const bodyBottom = pageHeight - 64;
  let currentY = 44;

  const colors = {
    orange: [245, 130, 32] as [number, number, number],
    charcoal: [59, 68, 70] as [number, number, number],
    medium: [84, 88, 90] as [number, number, number],
    grey: [136, 139, 141] as [number, number, number],
    border: [214, 215, 217] as [number, number, number],
    light: [245, 246, 244] as [number, number, number],
    amber: [255, 247, 224] as [number, number, number],
  };

  function setTextColor(color: [number, number, number]) {
    doc.setTextColor(color[0], color[1], color[2]);
  }

  function drawDraftBanner() {
    if (customerReady) return;
    doc.setFillColor(...colors.amber);
    doc.setDrawColor(226, 176, 70);
    doc.roundedRect(pageWidth - margin - 92, 18, 92, 20, 4, 4, 'FD');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(132, 86, 0);
    doc.text('PLANNING DRAFT', pageWidth - margin - 46, 31, { align: 'center' });
  }

  function drawContinuationHeader() {
    if (logo) doc.addImage(logo, 'PNG', margin, 14, 62, 30);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    setTextColor(colors.grey);
    doc.text(
      'LTC & Skilled Nursing Operational ROI',
      logo ? margin + 72 : margin,
      34,
    );
    doc.text(
      isPortfolio
        ? 'Portfolio Assessment'
        : `Facility Assessment · ${facilityInputs.facilityName}`,
      pageWidth - margin,
      34,
      { align: 'right', maxWidth: 230 },
    );
    doc.setDrawColor(...colors.border);
    doc.line(margin, 48, pageWidth - margin, 48);
    drawDraftBanner();
    currentY = 66;
  }

  function addPage() {
    doc.addPage();
    drawContinuationHeader();
  }

  function ensureSpace(requiredHeight: number) {
    if (currentY + requiredHeight > bodyBottom) addPage();
  }

  function heading(text: string, size = 12, spacingAfter = 14) {
    ensureSpace(size + spacingAfter + 8);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(size);
    setTextColor(colors.charcoal);
    doc.text(text, margin, currentY);
    currentY += spacingAfter;
  }

  function wrappedText(
    text: string,
    x: number,
    width: number,
    size = 8.5,
    lineHeight = 11,
    color = colors.medium,
    fontStyle: 'normal' | 'bold' | 'italic' = 'normal',
  ) {
    doc.setFont('Helvetica', fontStyle);
    doc.setFontSize(size);
    setTextColor(color);
    const normalized = text.replace(/→/g, 'to').replace(/[–—]/g, '-');
    const lines = doc.splitTextToSize(normalized, width);
    doc.text(lines, x, currentY);
    currentY += lines.length * lineHeight;
    return lines.length * lineHeight;
  }

  function metricGrid(
    metrics: Array<{ label: string; value: string }>,
    columns = 3,
  ) {
    const gap = 8;
    const rows = Math.ceil(metrics.length / columns);
    const height = 43;
    const width = (contentWidth - gap * (columns - 1)) / columns;
    ensureSpace(rows * (height + gap));
    metrics.forEach((metric, index) => {
      const row = Math.floor(index / columns);
      const col = index % columns;
      const x = margin + col * (width + gap);
      const y = currentY + row * (height + gap);
      doc.setFillColor(...colors.light);
      doc.setDrawColor(...colors.border);
      doc.roundedRect(x, y, width, height, 5, 5, 'FD');
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(6.5);
      setTextColor(colors.grey);
      doc.text(metric.label.toUpperCase(), x + 8, y + 12, { maxWidth: width - 16 });
      doc.setFontSize(12);
      setTextColor(colors.charcoal);
      doc.text(metric.value, x + 8, y + 31, { maxWidth: width - 16 });
    });
    currentY += rows * (height + gap) + 4;
  }

  function runRateCard(
    x: number,
    y: number,
    width: number,
    label: string,
    annual: number,
    monthly: number,
    note: string,
    emphasis = false,
  ) {
    const noteLines = doc.splitTextToSize(note, width - 16);
    const height = 70 + noteLines.length * 8;
    if (emphasis) {
      doc.setFillColor(255, 249, 244);
      doc.setDrawColor(245, 177, 120);
    } else {
      doc.setFillColor(...colors.light);
      doc.setDrawColor(...colors.border);
    }
    doc.roundedRect(x, y, width, height, 5, 5, 'FD');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(6.5);
    setTextColor(colors.grey);
    doc.text(label.toUpperCase(), x + 8, y + 12, { maxWidth: width - 16 });
    doc.setFontSize(11.5);
    setTextColor(emphasis ? colors.orange : colors.charcoal);
    doc.text(`${money(annual)} / year`, x + 8, y + 32);
    doc.setFontSize(8.5);
    setTextColor(colors.medium);
    doc.text(`${money(monthly)} / month`, x + 8, y + 47);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(6.5);
    setTextColor(colors.grey);
    doc.text(noteLines, x + 8, y + 61);
    return height;
  }

  function drawValueDriverCard(item: ValueLineItem) {
    const explanation = item.explanation.replace(/→/g, 'to').replace(/[–—]/g, '-');
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    const explanationLines = doc.splitTextToSize(explanation, contentWidth - 24);
    const height = 65 + explanationLines.length * 9;
    ensureSpace(height + 10);
    const y = currentY;
    doc.setDrawColor(...colors.border);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin, y, contentWidth, height, 6, 6, 'FD');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9.5);
    setTextColor(colors.charcoal);
    doc.text(item.label, margin + 10, y + 16, { maxWidth: contentWidth - 155 });

    doc.setFontSize(7);
    setTextColor(colors.grey);
    doc.text(item.evidenceClass.toUpperCase(), margin + 10, y + 29);

    doc.setFontSize(12);
    setTextColor(colors.orange);
    doc.text(money(item.annualBenefit), pageWidth - margin - 10, y + 18, {
      align: 'right',
    });
    doc.setFontSize(6.5);
    setTextColor(colors.grey);
    doc.text('ANNUAL BENEFIT', pageWidth - margin - 10, y + 30, {
      align: 'right',
    });

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    setTextColor(colors.medium);
    doc.text(explanationLines, margin + 10, y + 43);

    const metricsY = y + 49 + explanationLines.length * 9;
    const metricWidth = (contentWidth - 20) / 3;
    const metricLabels = [
      ['Current burden', item.currentBurden > 0 ? money(item.currentBurden) : '-'],
      ['Modeled improvement', `${(item.attainableImprovement * 100).toFixed(0)}%`],
      ['Paycor contribution', `${(item.paycorAttribution * 100).toFixed(0)}%`],
    ];
    metricLabels.forEach(([label, value], index) => {
      const x = margin + 10 + index * metricWidth;
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(6.2);
      setTextColor(colors.grey);
      doc.text(label.toUpperCase(), x, metricsY);
      doc.setFontSize(8.5);
      setTextColor(colors.charcoal);
      doc.text(value, x, metricsY + 12);
    });
    currentY += height + 10;
  }

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
  const breakEven = isPortfolio
    ? portfolioResults!.breakEvenRealizationRate
    : facilityResults.breakEvenRealizationRate;
  const currentBurden = isPortfolio
    ? portfolioResults!.totalDirectOpportunity
    : facilityResults.totalDirectOpportunity;
  const headcount = isPortfolio ? portfolioResults!.totalHeadcount : facilityInputs.headcount;
  const investmentPepm = headcount > 0 ? investment / headcount / 12 : 0;
  const narrative = buildExecutiveNarrative({
    mode,
    targetAudience,
    facility: facilityInputs,
    facilityResults,
    portfolioResults,
    strategicOpportunity,
    customerReady,
  });

  // Page 1: executive case
  if (logo) doc.addImage(logo, 'PNG', margin, 18, 116, 56);
  drawDraftBanner();
  currentY = logo ? 91 : 46;
  doc.setFillColor(...colors.orange);
  doc.rect(margin, currentY, contentWidth, 5, 'F');
  currentY += 19;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  setTextColor(colors.orange);
  doc.text('LONG-TERM CARE & SKILLED NURSING OPERATIONAL ROI', margin, currentY);
  currentY += 18;

  const titleText = isPortfolio
    ? `${facilityInputs.chainName || 'Portfolio'} - ${portfolioResults!.facilityCount}-Facility Business Case`
    : `Facility Business Case - ${facilityInputs.facilityName}`;
  doc.setFontSize(19);
  setTextColor(colors.charcoal);
  const titleLines = doc.splitTextToSize(titleText, contentWidth);
  doc.text(titleLines, margin, currentY);
  currentY += titleLines.length * 22 + 2;

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
      doc.setFontSize(8.5);
      setTextColor(colors.grey);
      doc.text(location, margin, currentY, { maxWidth: contentWidth });
      currentY += 13;
    }
  }

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  setTextColor(colors.medium);
  const prepared = `Prepared for ${targetAudience || 'Executive Leadership'} by ${proposerName || 'Paycor Consultant'}${proposerTitle ? `, ${proposerTitle}` : ''}.`;
  doc.text(doc.splitTextToSize(prepared, contentWidth), margin, currentY);
  currentY += 15;
  doc.setFontSize(7.5);
  setTextColor(colors.grey);
  doc.text(
    `Scenario: ${scenario.toUpperCase()} · Base ROI excludes correlated strategic business context.`,
    margin,
    currentY,
  );
  currentY += 23;

  heading('Executive Summary', 11.5, 15);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  setTextColor(colors.charcoal);
  const headlineLines = doc.splitTextToSize(narrative.headline, contentWidth - 20);
  const paragraphLines = narrative.paragraphs.map((paragraph) =>
    doc.splitTextToSize(paragraph.replace(/[–—]/g, '-'), contentWidth - 20),
  );
  const narrativeHeight =
    22 + headlineLines.length * 13 + paragraphLines.reduce((total, lines) => total + lines.length * 9 + 8, 0);
  ensureSpace(narrativeHeight);
  const narrativeY = currentY;
  doc.setFillColor(...colors.light);
  doc.setDrawColor(...colors.border);
  doc.roundedRect(margin, narrativeY, contentWidth, narrativeHeight, 6, 6, 'FD');
  doc.text(headlineLines, margin + 10, narrativeY + 17);
  let paragraphY = narrativeY + 24 + headlineLines.length * 13;
  paragraphLines.forEach((lines) => {
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.7);
    setTextColor(colors.medium);
    doc.text(lines, margin + 10, paragraphY);
    paragraphY += lines.length * 9 + 8;
  });
  currentY += narrativeHeight + 18;

  heading('Executive Financial Summary', 11.5, 15);
  metricGrid(
    [
      { label: 'Annual Paycor-Influenced Benefit', value: money(baseBenefit) },
      { label: 'Annual Investment', value: money(investment) },
      { label: 'Net Annual Benefit', value: money(netBenefit) },
      { label: 'Net ROI', value: percent(roi) },
      { label: 'Benefit-Cost Ratio', value: bcr === null ? 'N/A' : `${bcr.toFixed(2)}x` },
      { label: 'Payback Period', value: payback === null ? 'N/A' : `${payback.toFixed(1)} mos` },
      { label: 'Break-Even Realization', value: breakEven === null ? 'N/A' : `${(breakEven * 100).toFixed(0)}%` },
      { label: 'Investment per Employee', value: investmentPepm > 0 ? `${money(investmentPepm)} PEPM` : 'N/A' },
    ],
    4,
  );

  heading('Status Quo Run Rate', 11.5, 15);
  const gap = 8;
  const runWidth = (contentWidth - gap * 2) / 3;
  const runNotes = [
    'Gross modeled burden. Not all of this amount is addressable by Paycor.',
    'The amount used in base ROI after improvement and contribution assumptions.',
    'Opportunity not yet pursued, subject to validation and successful adoption.',
  ];
  const runHeights = [
    runRateCard(margin, currentY, runWidth, 'Current modeled operating burden', currentBurden, currentBurden / 12, runNotes[0]),
    runRateCard(margin + runWidth + gap, currentY, runWidth, 'Paycor-influenced opportunity', baseBenefit, baseBenefit / 12, runNotes[1], true),
    runRateCard(margin + (runWidth + gap) * 2, currentY, runWidth, 'Modeled cost of delay', baseBenefit, baseBenefit / 12, runNotes[2]),
  ];
  currentY += Math.max(...runHeights) + 12;

  // Page 2: operational profile and value build
  addPage();
  if (isPortfolio) {
    heading('Portfolio Facilities', 12, 18);
    portfolioResults!.facilities.forEach(({ inputs, results }) => {
      const height = 52;
      ensureSpace(height + 8);
      doc.setDrawColor(...colors.border);
      doc.roundedRect(margin, currentY, contentWidth, height, 5, 5, 'S');
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      setTextColor(colors.charcoal);
      doc.text(doc.splitTextToSize(inputs.facilityName, 210)[0], margin + 10, currentY + 16);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7);
      setTextColor(colors.grey);
      doc.text(
        [inputs.city, inputs.state, inputs.chainName].filter(Boolean).join(' · ') || 'Location not reported',
        margin + 10,
        currentY + 30,
        { maxWidth: 210 },
      );
      const items = [
        ['Annual Benefit', money(results.totalPaycorInfluencedBenefit)],
        ['Investment', money(results.softwareCost)],
        ['Net ROI', percent(results.roiPercent)],
      ];
      items.forEach(([label, value], index) => {
        const x = margin + 280 + index * 72;
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(6.3);
        setTextColor(colors.grey);
        doc.text(label.toUpperCase(), x, currentY + 14, { align: 'right' });
        doc.setFontSize(9);
        setTextColor(colors.charcoal);
        doc.text(value, x, currentY + 30, { align: 'right' });
      });
      currentY += height + 8;
    });
  } else {
    heading('Facility Operational Profile', 12, 18);
    metricGrid(
      [
        { label: 'Headcount', value: number(facilityInputs.headcount) },
        { label: 'Turnover Rate Used', value: `${number(facilityInputs.turnoverRate, 1)}%` },
        { label: 'Eligible Workforce', value: number(facilityResults.turnoverEligibleHeadcount) },
        { label: 'Turnover Events / Year', value: number(facilityResults.estimatedTurnoverEvents, 1) },
        { label: 'Cost per Turnover', value: money(facilityResults.estimatedCostPerTurnover) },
        { label: 'Overtime Hours / Week', value: number(facilityResults.weeklyOvertimeHours, 1) },
        { label: 'Overtime FTE Equivalent', value: number(facilityResults.overtimeFteEquivalent, 2) },
        { label: 'Agency FTE Equivalent', value: number(facilityResults.agencyFteEquivalent, 2) },
      ],
      4,
    );
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.3);
    setTextColor(colors.grey);
    const formula = `Turnover model: ${facilityResults.turnoverPopulationLabel}; ${facilityResults.turnoverCostMethodLabel}. ${number(facilityResults.estimatedTurnoverEvents, 1)} annual events x ${money(facilityResults.estimatedCostPerTurnover)} per event = ${money(facilityResults.baselineTurnoverBurden)} current modeled burden.`;
    const formulaLines = doc.splitTextToSize(formula, contentWidth);
    doc.text(formulaLines, margin, currentY);
    currentY += formulaLines.length * 9 + 16;

    heading('Value Build Detail', 12, 18);
    facilityResults.valueLineItems
      .filter((item) => item.includedInBaseROI)
      .forEach(drawValueDriverCard);
  }

  // Page 3: strategic business context
  addPage();
  heading('Strategic Business Context', 12, 16);
  wrappedText(strategicOpportunity.disclosure, margin, contentWidth, 8, 10, colors.grey);
  currentY += 8;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  setTextColor(colors.charcoal);
  doc.text(
    `Correlated strategic range: ${money(strategicOpportunity.valueLow)} to ${money(strategicOpportunity.valueHigh)}`,
    margin,
    currentY,
  );
  currentY += 18;

  strategicOpportunity.modules.forEach((module) => {
    const narrativeText = module.narrative.replace(/→/g, 'to').replace(/[–—]/g, '-');
    const methodologyText = `Methodology: ${module.methodology.replace(/→/g, 'to').replace(/[–—]/g, '-')}`;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.8);
    const narrativeLines = doc.splitTextToSize(narrativeText, contentWidth - 20);
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(7);
    const methodologyLines = doc.splitTextToSize(methodologyText, contentWidth - 20);
    const height = 48 + narrativeLines.length * 9 + methodologyLines.length * 8;
    ensureSpace(height + 10);
    const y = currentY;
    doc.setDrawColor(...colors.border);
    doc.roundedRect(margin, y, contentWidth, height, 6, 6, 'S');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9.5);
    setTextColor(colors.charcoal);
    doc.text(module.title, margin + 10, y + 16, { maxWidth: contentWidth - 170 });
    if (module.valueIncludedInRange && module.valueHigh > 0) {
      doc.setFontSize(9.5);
      setTextColor(colors.orange);
      doc.text(
        `${money(module.valueLow)} to ${money(module.valueHigh)}`,
        pageWidth - margin - 10,
        y + 16,
        { align: 'right' },
      );
    }
    doc.setFontSize(6.5);
    setTextColor(colors.grey);
    doc.text(module.statusLabel.toUpperCase(), margin + 10, y + 29);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.8);
    setTextColor(colors.medium);
    doc.text(narrativeLines, margin + 10, y + 42);
    const methY = y + 48 + narrativeLines.length * 9;
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(7);
    setTextColor(colors.grey);
    doc.text(methodologyLines, margin + 10, methY);
    currentY += height + 10;
  });

  ensureSpace(70);
  heading('Recommended Next Step', 11.5, 16);
  doc.setFillColor(...colors.light);
  doc.setDrawColor(...colors.border);
  const nextLines = doc.splitTextToSize(narrative.nextStep, contentWidth - 20);
  const nextHeight = 22 + nextLines.length * 10;
  doc.roundedRect(margin, currentY, contentWidth, nextHeight, 5, 5, 'FD');
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.2);
  setTextColor(colors.medium);
  doc.text(nextLines, margin + 10, currentY + 16);
  currentY += nextHeight + 10;

  if (includeAppendix) {
    addPage();
    heading('Methodology Appendix: Scenario Assumptions', 12, 18);
    ASSUMPTION_DEFINITIONS.forEach((definition) => {
      const descriptionLines = doc.splitTextToSize(
        definition.description.replace(/[–—]/g, '-'),
        contentWidth - 20,
      );
      const sourceLines = doc.splitTextToSize(
        `Evidence: ${definition.evidenceClass} · Source context: ${definition.sourceLabel}`,
        contentWidth - 20,
      );
      const height = 43 + descriptionLines.length * 9 + sourceLines.length * 8;
      ensureSpace(height + 8);
      const y = currentY;
      doc.setDrawColor(...colors.border);
      doc.roundedRect(margin, y, contentWidth, height, 5, 5, 'S');
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8.7);
      setTextColor(colors.charcoal);
      doc.text(definition.label, margin + 10, y + 15, { maxWidth: contentWidth - 110 });
      const assumptionValue = definition.isPercentage
        ? `${(assumptions[definition.key] * 100).toFixed(1)}%`
        : String(assumptions[definition.key]);
      doc.setFontSize(9);
      setTextColor(colors.orange);
      doc.text(assumptionValue, pageWidth - margin - 10, y + 15, { align: 'right' });
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.3);
      setTextColor(colors.medium);
      doc.text(descriptionLines, margin + 10, y + 30);
      const sourceY = y + 35 + descriptionLines.length * 9;
      doc.setFontSize(6.7);
      setTextColor(colors.grey);
      doc.text(sourceLines, margin + 10, sourceY);
      currentY += height + 8;
    });
  }

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(...colors.border);
    doc.line(margin, pageHeight - 50, pageWidth - margin, pageHeight - 50);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(6.5);
    setTextColor(colors.grey);
    doc.text(
      'Business-planning estimate; not a guarantee of savings, clinical outcomes, CMS ratings, reimbursement, or census. Methodology v7.0.',
      margin,
      footerY,
      { maxWidth: contentWidth - 70 },
    );
    doc.text(`Page ${page} of ${totalPages}`, pageWidth - margin, footerY, {
      align: 'right',
    });
  }

  const date = new Date().toISOString().slice(0, 10);
  const reportName = isPortfolio
    ? facilityInputs.chainName || 'Portfolio'
    : facilityInputs.facilityName || 'Facility';
  doc.save(`Paycor_LTC_ROI_${safeFilename(reportName)}_${date}.pdf`);
}
