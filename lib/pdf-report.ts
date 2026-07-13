import {
  AnalysisMode,
  FacilityROICalculatorInputs,
  FacilityROIResults,
  PortfolioROIResults,
  ScenarioAssumptions,
  ScenarioKey,
  StrategicOpportunitySummary,
} from './roi-types';
import { buildExecutiveNarrative } from './executive-narrative';
import { ASSUMPTION_DEFINITIONS } from './assumptions';

export interface DownloadRoiPdfOptions {
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
  }).format(Math.max(0, value || 0));

const safeFileName = (value: string) =>
  value
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || 'LTC_ROI_Assessment';

export async function downloadRoiPdf(options: DownloadRoiPdfOptions): Promise<string> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'letter', compress: true });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 46;
  const contentWidth = pageWidth - margin * 2;
  const orange: [number, number, number] = [245, 130, 32];
  const charcoal: [number, number, number] = [59, 68, 70];
  const grey: [number, number, number] = [90, 96, 99];
  const light: [number, number, number] = [245, 247, 249];
  let y = margin;

  const isPortfolio = options.mode === 'portfolio' && options.portfolioResults;
  const baseBenefit = isPortfolio
    ? options.portfolioResults!.totalPaycorInfluencedBenefit
    : options.facilityResults.totalPaycorInfluencedBenefit;
  const investment = isPortfolio
    ? options.portfolioResults!.totalSoftwareCost
    : options.facilityResults.softwareCost;
  const netBenefit = isPortfolio
    ? options.portfolioResults!.netAnnualBenefit
    : options.facilityResults.netAnnualBenefit;
  const roi = isPortfolio ? options.portfolioResults!.roiPercent : options.facilityResults.roiPercent;
  const ratio = isPortfolio
    ? options.portfolioResults!.benefitCostRatio
    : options.facilityResults.benefitCostRatio;
  const payback = isPortfolio
    ? options.portfolioResults!.paybackMonths
    : options.facilityResults.paybackMonths;
  const breakEven = isPortfolio
    ? options.portfolioResults!.breakEvenRealizationRate
    : options.facilityResults.breakEvenRealizationRate;
  const headcount = isPortfolio
    ? options.portfolioResults!.totalHeadcount
    : options.facilityInputs.headcount;
  const pepm = headcount > 0 ? investment / headcount / 12 : 0;

  const narrative = buildExecutiveNarrative({
    mode: options.mode,
    targetAudience: options.targetAudience,
    facility: options.facilityInputs,
    facilityResults: options.facilityResults,
    portfolioResults: options.portfolioResults,
    strategicOpportunity: options.strategicOpportunity,
    customerReady: options.customerReady,
  });

  const addPage = () => {
    doc.addPage();
    y = margin;
  };

  const ensure = (height: number) => {
    if (y + height > pageHeight - 52) addPage();
  };

  const line = (color: [number, number, number] = orange) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(1.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 12;
  };

  const text = (
    value: string,
    size = 10,
    color: [number, number, number] = charcoal,
    style: 'normal' | 'bold' = 'normal',
    gap = 5,
  ) => {
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(value, contentWidth);
    const height = lines.length * (size * 1.35);
    ensure(height + gap);
    doc.text(lines, margin, y);
    y += height + gap;
  };

  const section = (title: string) => {
    ensure(34);
    y += 8;
    text(title, 15, charcoal, 'bold', 8);
    line([220, 224, 228]);
  };

  const metricGrid = (items: Array<[string, string]>) => {
    const columns = 2;
    const gap = 10;
    const cardWidth = (contentWidth - gap) / columns;
    const cardHeight = 58;
    for (let index = 0; index < items.length; index += columns) {
      ensure(cardHeight + 10);
      items.slice(index, index + columns).forEach(([label, value], offset) => {
        const x = margin + offset * (cardWidth + gap);
        doc.setFillColor(...light);
        doc.setDrawColor(222, 226, 230);
        doc.roundedRect(x, y, cardWidth, cardHeight, 7, 7, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(...grey);
        doc.text(label.toUpperCase(), x + 10, y + 17, { maxWidth: cardWidth - 20 });
        doc.setFontSize(15);
        doc.setTextColor(...charcoal);
        doc.text(value, x + 10, y + 42, { maxWidth: cardWidth - 20 });
      });
      y += cardHeight + 10;
    }
  };

  const card = (title: string, body: string, value?: string) => {
    const bodyLines = doc.splitTextToSize(body, contentWidth - 28);
    const height = Math.max(78, 43 + bodyLines.length * 12);
    ensure(height + 10);
    doc.setDrawColor(220, 224, 228);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin, y, contentWidth, height, 7, 7, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...charcoal);
    doc.text(title, margin + 14, y + 20);
    if (value) {
      doc.setTextColor(...orange);
      doc.text(value, pageWidth - margin - 14, y + 20, { align: 'right' });
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...grey);
    doc.text(bodyLines, margin + 14, y + 40);
    y += height + 10;
  };

  // Cover and executive summary
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...orange);
  doc.text('LONG-TERM CARE & SKILLED NURSING OPERATIONAL ROI', margin, y);
  y += 22;
  doc.setFontSize(24);
  doc.setTextColor(...charcoal);
  const title = isPortfolio
    ? `${options.facilityInputs.chainName || 'Portfolio'} Business Case`
    : `${options.facilityInputs.facilityName} Business Case`;
  const titleLines = doc.splitTextToSize(title, contentWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 29 + 5;

  const location = [
    options.facilityInputs.facilityAddress,
    options.facilityInputs.city,
    options.facilityInputs.state,
    options.facilityInputs.zip,
  ].filter(Boolean).join(' · ');
  if (!isPortfolio && location) text(location, 9, grey, 'normal', 3);
  if (options.facilityInputs.chainName) text(`Chain / operator: ${options.facilityInputs.chainName}`, 9, grey, 'normal', 3);
  text(
    `Prepared for ${options.targetAudience || 'Executive Leadership'} by ${options.proposerName || 'Paycor Consultant'}${options.proposerTitle ? `, ${options.proposerTitle}` : ''}.`,
    10,
    grey,
    'normal',
    8,
  );
  line();

  if (!options.customerReady) {
    doc.setFillColor(255, 248, 230);
    doc.setDrawColor(239, 190, 70);
    doc.roundedRect(margin, y, contentWidth, 45, 6, 6, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(130, 90, 10);
    doc.text('PLANNING DRAFT — CONTAINS ESTIMATED OR INTERNAL-ONLY INPUTS', margin + 12, y + 18);
    doc.setFont('helvetica', 'normal');
    doc.text('Validate flagged values and approved Paycor pricing before external distribution.', margin + 12, y + 34);
    y += 58;
  }

  section('Executive Summary');
  narrative.paragraphs.forEach((paragraph) => text(paragraph, 10, charcoal, 'normal', 8));

  metricGrid([
    ['Annual Paycor-influenced benefit', money(baseBenefit)],
    ['Annual investment', money(investment)],
    ['Net annual benefit', money(netBenefit)],
    ['Net ROI', roi === null ? 'N/A' : `${roi.toFixed(0)}%`],
    ['Benefit-cost ratio', ratio === null ? 'N/A' : `${ratio.toFixed(2)}x`],
    ['Payback period', payback === null ? 'N/A' : `${payback.toFixed(1)} months`],
    ['Break-even realization', breakEven === null ? 'N/A' : `${(breakEven * 100).toFixed(0)}%`],
    ['Investment per employee', pepm > 0 ? `${money(pepm)} PEPM` : 'N/A'],
  ]);

  section('Base Value Reconciliation');
  const lineItems = isPortfolio
    ? options.portfolioResults!.facilities.flatMap((item) =>
        item.results.valueLineItems.filter((lineItem) => lineItem.includedInBaseROI),
      )
    : options.facilityResults.valueLineItems.filter((lineItem) => lineItem.includedInBaseROI);
  const aggregated = lineItems.reduce<Record<string, { benefit: number; burden: number; evidence: string; explanation: string }>>(
    (rows, item) => {
      const existing = rows[item.label] || { benefit: 0, burden: 0, evidence: item.evidenceClass, explanation: item.explanation };
      existing.benefit += item.annualBenefit;
      existing.burden += item.currentBurden;
      rows[item.label] = existing;
      return rows;
    },
    {},
  );
  Object.entries(aggregated).forEach(([label, item]) =>
    card(
      label,
      `${item.explanation} Evidence classification: ${item.evidence}. Current modeled burden: ${money(item.burden)}.`,
      money(item.benefit),
    ),
  );

  section('Strategic Downstream Opportunity');
  text(
    `${options.strategicOpportunity.disclosure} Modeled range: ${money(options.strategicOpportunity.valueLow)}–${money(options.strategicOpportunity.valueHigh)}.`,
    9,
    grey,
    'normal',
    8,
  );
  options.strategicOpportunity.modules.forEach((module) =>
    card(
      module.title,
      `${module.currentCondition} ${module.narrative} Method: ${module.methodology}`,
      module.valueIncludedInRange && module.valueHigh > 0
        ? `${money(module.valueLow)}–${money(module.valueHigh)}`
        : 'Qualitative',
    ),
  );

  section('Recommended Next Steps');
  [
    narrative.nextStep,
    'Validate headcount, wage, overtime, agency, PBJ labor, Medicare Part A revenue, and technology contracts with the appropriate data owners.',
    'Confirm which technology contracts can actually be retired and the effective renewal dates.',
    'Establish baseline measures and named owners for 90-day and 180-day post-implementation value reviews.',
  ].forEach((item, index) => text(`${index + 1}. ${item}`, 10, charcoal, 'normal', 7));

  if (options.includeAppendix) {
    section('Methodology Appendix');
    text('Input data provenance', 12, charcoal, 'bold', 6);
    const sourceEntries = Object.entries(options.facilityInputs.inputSources || {}).sort(([a], [b]) => a.localeCompare(b));
    sourceEntries.forEach(([field, record]) => {
      const context = [record.label, record.confidence ? `Confidence: ${record.confidence}` : '', record.method || '', record.note || '']
        .filter(Boolean)
        .join(' | ');
      card(formatField(field), context, record.source.toUpperCase());
    });

    text('Scenario assumptions', 12, charcoal, 'bold', 6);
    ASSUMPTION_DEFINITIONS.forEach((definition) => {
      const value = options.assumptions[definition.key];
      card(
        definition.label,
        `${definition.description} Source context: ${definition.sourceLabel}.`,
        definition.isPercentage ? `${(value * 100).toFixed(1)}%` : value.toFixed(2),
      );
    });
  }

  // Footers and draft watermark
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(225, 228, 232);
    doc.line(margin, pageHeight - 34, pageWidth - margin, pageHeight - 34);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...grey);
    doc.text('Planning estimate — not a guarantee of savings, clinical results, CMS ratings, reimbursement, or census.', margin, pageHeight - 20);
    doc.text(`${page} / ${pages}`, pageWidth - margin, pageHeight - 20, { align: 'right' });
    if (!options.customerReady) {
      doc.setTextColor(220, 220, 220);
      doc.setFontSize(44);
      doc.setFont('helvetica', 'bold');
      doc.text('DRAFT', pageWidth / 2, pageHeight / 2, { align: 'center', angle: 35 });
    }
  }

  const date = new Date().toISOString().slice(0, 10);
  const name = isPortfolio
    ? options.facilityInputs.chainName || 'LTC_Portfolio'
    : options.facilityInputs.facilityName;
  const fileName = `${safeFileName(name)}_ROI_Assessment_${date}${options.customerReady ? '' : '_DRAFT'}.pdf`;
  doc.save(fileName);
  return fileName;
}

function formatField(field: string) {
  return field
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (character) => character.toUpperCase());
}
