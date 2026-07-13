#!/usr/bin/env node

/**
 * LTC ROI v7 cumulative business-case update
 *
 * Applies the agreed turnover transparency, operational translation,
 * status-quo, workflow, audience-role, Paycor branding, narrative, and
 * PDF layout improvements to the July 2026 synced repository.
 *
 * Run from the repository root after uploading this ZIP:
 *   node apply-v7-full-update.mjs
 */

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const packageRoot = path.dirname(new URL(import.meta.url).pathname);

function absolute(relativePath) {
  return path.join(root, relativePath);
}

function read(relativePath) {
  const file = absolute(relativePath);
  if (!fs.existsSync(file)) throw new Error(`Required project file not found: ${relativePath}`);
  return fs.readFileSync(file, 'utf8');
}

function write(relativePath, content) {
  const file = absolute(relativePath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

function copyPayload(relativePath) {
  const source = path.join(packageRoot, 'payload', relativePath);
  if (!fs.existsSync(source)) throw new Error(`Package payload missing: payload/${relativePath}`);
  const destination = absolute(relativePath);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
  console.log(`✓ Replaced ${relativePath}`);
}

function replaceRequired(content, search, replacement, label) {
  if (content.includes(replacement)) {
    console.log(`✓ ${label} already applied`);
    return content;
  }
  if (!content.includes(search)) {
    throw new Error(
      `Could not apply "${label}". The expected marker was not found. ` +
        'Confirm the project is synced to the reviewed July 12–13, 2026 repository version.',
    );
  }
  console.log(`✓ ${label}`);
  return content.replace(search, replacement);
}

function insertAfter(content, marker, addition, label) {
  if (content.includes(addition.trim())) {
    console.log(`✓ ${label} already applied`);
    return content;
  }
  const index = content.indexOf(marker);
  if (index === -1) throw new Error(`Could not apply "${label}"; marker not found.`);
  console.log(`✓ ${label}`);
  return content.slice(0, index + marker.length) + addition + content.slice(index + marker.length);
}

function patchAppPage() {
  const file = 'app/page.tsx';
  let content = read(file);

  content = content.replace(
    "import React, { useCallback, useMemo, useState } from 'react';",
    "import React, { useCallback, useEffect, useMemo, useState } from 'react';",
  );

  content = insertAfter(
    content,
    "import StrategicOpportunityCard from '@/components/strategic-opportunity-card';",
    `\nimport TurnoverInsightsCard from '@/components/turnover-insights-card';\nimport OperationalTranslationCard from '@/components/operational-translation-card';\nimport FirstUseGuide from '@/components/first-use-guide';\nimport StatusQuoCard from '@/components/status-quo-card';`,
    'Add v7 workflow and insight component imports',
  );

  if (!content.includes('const TARGET_AUDIENCE_OPTIONS = [')) {
    content = replaceRequired(
      content,
      `} from '@/lib/roi-types';\n\nconst DEFAULT_TECH_COSTS: TechCostMap = {`,
      `} from '@/lib/roi-types';\n\nconst TARGET_AUDIENCE_OPTIONS = [\n  'CEO / Owner',\n  'CFO / Finance',\n  'CHRO / HR',\n  'COO / Administrator',\n  'CIO / IT',\n  'CNO / Clinical Leadership',\n  'Executive Leadership Team',\n  'Other',\n] as const;\n\ntype TargetAudienceRole = (typeof TARGET_AUDIENCE_OPTIONS)[number];\n\nconst DEFAULT_TECH_COSTS: TechCostMap = {`,
      'Add audience role options',
    );
  }

  if (!content.includes("'turnoverCostMethod'")) {
    content = replaceRequired(
      content,
      `  'adminLoadedHourlyRate', 'turnoverRate', 'rnTurnover', 'adminTurnover',`,
      `  'adminLoadedHourlyRate', 'turnoverRate', 'rnTurnover', 'adminTurnover',\n  'turnoverCostMethod', 'fixedTurnoverCost', 'turnoverPopulation', 'nursingWorkforceShare',`,
      'Track turnover-method inputs and provenance',
    );
  }

  if (!content.includes("turnoverCostMethod: 'compensation-percentage'")) {
    content = replaceRequired(
      content,
      `  adminTurnover: 'No',`,
      `  adminTurnover: 'No',\n  turnoverCostMethod: 'compensation-percentage',\n  fixedTurnoverCost: 0,\n  turnoverPopulation: 'nursing',\n  nursingWorkforceShare: 0.65,`,
      'Add default turnover model controls',
    );
  }

  if (!content.includes('showFirstUseGuide')) {
    content = replaceRequired(
      content,
      `  const [showTechBreakdown, setShowTechBreakdown] = useState(false);`,
      `  const [showTechBreakdown, setShowTechBreakdown] = useState(false);\n  const [showFirstUseGuide, setShowFirstUseGuide] = useState(false);`,
      'Add first-use walkthrough state',
    );
  }

  if (content.includes("  const [targetAudience, setTargetAudience] = useState('Executive Leadership Team');")) {
    content = replaceRequired(
      content,
      `  const [targetAudience, setTargetAudience] = useState('Executive Leadership Team');`,
      `  const [targetAudienceRole, setTargetAudienceRole] =\n    useState<TargetAudienceRole>('Executive Leadership Team');\n  const [customTargetAudience, setCustomTargetAudience] = useState('');\n  const targetAudience =\n    targetAudienceRole === 'Other'\n      ? customTargetAudience.trim() || 'Other'\n      : targetAudienceRole;`,
      'Replace free-text audience state with role-based targeting',
    );
  }

  if (!content.includes("localStorage.getItem('ltc-roi-walkthrough-seen')")) {
    const stateMarker = `  const [aiStrategyError, setAiStrategyError] = useState('');`;
    content = insertAfter(
      content,
      stateMarker,
      `\n\n  useEffect(() => {\n    try {\n      if (!window.localStorage.getItem('ltc-roi-walkthrough-seen')) {\n        setShowFirstUseGuide(true);\n      }\n    } catch {\n      // Local storage may be unavailable in restricted previews.\n    }\n  }, []);\n\n  const closeFirstUseGuide = () => {\n    setShowFirstUseGuide(false);\n    try {\n      window.localStorage.setItem('ltc-roi-walkthrough-seen', 'true');\n    } catch {\n      // The walkthrough remains dismissible even without storage access.\n    }\n  };`,
      'Add first-launch walkthrough behavior',
    );
  }

  if (!content.includes('src="/paycor-logo.png"')) {
    const originalButton = `          <button\n            type="button"\n            onClick={() => setShowReport(true)}\n            className="inline-flex items-center justify-center gap-2 bg-paycor-orange hover:bg-paycor-red-orange text-white font-extrabold px-4 py-3 rounded-xl text-xs shadow-sm"\n          >\n            <FileDown className="w-4 h-4" /> Customer Report\n          </button>`;
    const brandedButton = `          <div className="flex flex-col items-start lg:items-end gap-3">\n            <img\n              src="/paycor-logo.png"\n              alt="Paycor — Empowering Leaders"\n              className="h-16 md:h-[72px] w-auto object-contain"\n            />\n            <button\n              type="button"\n              onClick={() => setShowReport(true)}\n              className="inline-flex items-center justify-center gap-2 bg-paycor-orange hover:bg-paycor-red-orange text-white font-extrabold px-4 py-3 rounded-xl text-xs shadow-sm"\n            >\n              <FileDown className="w-4 h-4" /> Customer Report\n            </button>\n          </div>`;
    content = replaceRequired(content, originalButton, brandedButton, 'Add Paycor logo to the application header');
  }

  if (!content.includes("turnoverPopulation: metrics.turnoverRate")) {
    content = replaceRequired(
      content,
      `        turnoverRate: metrics.turnoverRate ?? current.turnoverRate,`,
      `        turnoverRate: metrics.turnoverRate ?? current.turnoverRate,\n        turnoverPopulation: metrics.turnoverRate !== undefined && metrics.turnoverRate !== null\n          ? 'nursing'\n          : current.turnoverPopulation,`,
      'Default CMS turnover to the nursing workforce population',
    );
  }

  content = content.replace('label="General Turnover"', 'label="Turnover Rate Used in Model"');
  content = content.replace('label="RN Turnover"', 'label="CMS RN Turnover (Context)"');
  content = content.replace('label="Current Direct Opportunity"', 'label="Current Modeled Operating Burden"');
  content = content.replace('title="Board-Ready Financial Case"', 'title="Executive Business Case Preview"');

  if (!content.includes('<TurnoverInsightsCard')) {
    const workforceMarker = `              <NumberInput label="Agency Hourly Rate" value={facility.agencyHourlyRate} source={facility.inputSources?.agencyHourlyRate} prefix="$" decimals={2} onChange={(value) => updateFacility('agencyHourlyRate', value)} />\n            </div>`;
    const workforceAddition = `\n            <TurnoverInsightsCard\n              inputs={facility}\n              results={facilityResults}\n              assumptions={assumptions}\n              onInputChange={updateFacility}\n              onAssumptionsChange={setAssumptions}\n            />\n            <OperationalTranslationCard inputs={facility} results={facilityResults} />`;
    content = insertAfter(
      content,
      workforceMarker,
      workforceAddition,
      'Add adjustable turnover model and normalized operational metrics',
    );
  }

  if (!content.includes('How to use this tool')) {
    const readinessBlock = `            {!customerReady && (\n              <button type="button" onClick={() => setShowEstimateAssistant(true)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-paycor-medium-grey">\n                Review unconfirmed values\n              </button>\n            )}`;
    const readinessActions = `            <div className="flex flex-wrap items-center gap-2">\n              <button\n                type="button"\n                onClick={() => setShowFirstUseGuide(true)}\n                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-paycor-medium-grey"\n              >\n                How to use this tool\n              </button>\n              {!customerReady && (\n                <button type="button" onClick={() => setShowEstimateAssistant(true)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-paycor-medium-grey">\n                  Review unconfirmed values\n                </button>\n              )}\n            </div>`;
    content = replaceRequired(content, readinessBlock, readinessActions, 'Add walkthrough access to Data Readiness');
  }

  if (!content.includes('<StatusQuoCard')) {
    const executiveSectionEnd = `              <ExecutiveMetric label="Strategic Opportunity — Separate" value={strategicOpportunity.valueHigh > 0 ? \`${'${money(strategicOpportunity.valueLow)}–${money(strategicOpportunity.valueHigh)}'}\` : 'Not yet monetized'} />\n            </div>\n          </section>`;
    const replacement = `${executiveSectionEnd}\n\n          <StatusQuoCard\n            currentBurden={summary.directOpportunity}\n            paycorInfluencedBenefit={summary.baseBenefit}\n          />`;
    content = replaceRequired(content, executiveSectionEnd, replacement, 'Add Status Quo Run Rate and cost-of-delay context');
  }

  if (content.includes('<TextInput label="Target Audience" value={targetAudience} onChange={setTargetAudience} />')) {
    content = replaceRequired(
      content,
      `              <TextInput label="Target Audience" value={targetAudience} onChange={setTargetAudience} />`,
      `              <label>\n                <span className="flex items-center justify-between gap-2 mb-1.5">\n                  <span className="text-[11px] font-bold text-paycor-medium-grey">Target Audience Role</span>\n                </span>\n                <select\n                  value={targetAudienceRole}\n                  onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>\n                    setTargetAudienceRole(event.target.value as TargetAudienceRole)\n                  }\n                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-paycor-orange"\n                >\n                  {TARGET_AUDIENCE_OPTIONS.map((option) => (\n                    <option key={option} value={option}>{option}</option>\n                  ))}\n                </select>\n              </label>\n              {targetAudienceRole === 'Other' && (\n                <TextInput\n                  label="Other Target Audience"\n                  value={customTargetAudience}\n                  onChange={setCustomTargetAudience}\n                  className="md:col-span-3"\n                />\n              )}`,
      'Add role dropdown and Other audience field',
    );
  }

  if (!content.includes('<FirstUseGuide')) {
    content = replaceRequired(
      content,
      `      <EstimateAssistant\n        open={showEstimateAssistant}`,
      `      <FirstUseGuide open={showFirstUseGuide} onClose={closeFirstUseGuide} />\n\n      <EstimateAssistant\n        open={showEstimateAssistant}`,
      'Mount first-use walkthrough',
    );
  }

  write(file, content);
}

function patchAssumptions() {
  const file = 'lib/assumptions.ts';
  let content = read(file);
  content = content.replace(
    "label: 'Turnover cost as annual compensation multiple',",
    "label: 'Replacement cost as percentage of annual compensation',",
  );
  content = content.replace(
    "'Estimates recruiting, onboarding, vacancy, training and early-productivity burden per replacement. Validate against the prospect’s finance or HR data whenever available.',",
    "'Estimates the replacement cost per turnover event when the percentage-of-compensation method is selected. The calculator also supports a fixed prospect-confirmed cost per turnover.',",
  );
  write(file, content);
  console.log('✓ Updated turnover assumption terminology');
}

function verify() {
  const page = read('app/page.tsx');
  const required = [
    '<TurnoverInsightsCard',
    '<OperationalTranslationCard',
    '<StatusQuoCard',
    '<FirstUseGuide',
    'Target Audience Role',
    'src="/paycor-logo.png"',
  ];
  required.forEach((marker) => {
    if (!page.includes(marker)) throw new Error(`Verification failed: app/page.tsx missing ${marker}`);
  });
  const calculations = read('lib/calculations.ts');
  if (!calculations.includes('turnoverEligibleHeadcount')) {
    throw new Error('Verification failed: new turnover calculation engine was not installed.');
  }
  const pdf = read('lib/pdf-report.ts');
  if (!pdf.includes('drawValueDriverCard') || !pdf.includes('PLANNING DRAFT')) {
    throw new Error('Verification failed: rebuilt PDF renderer was not installed.');
  }
}

try {
  const logo = path.join(packageRoot, 'public', 'paycor-logo.png');
  if (!fs.existsSync(logo)) throw new Error('Package logo missing: public/paycor-logo.png');
  fs.mkdirSync(absolute('public'), { recursive: true });
  fs.copyFileSync(logo, absolute('public/paycor-logo.png'));
  console.log('✓ Installed public/paycor-logo.png');

  [
    'lib/roi-types.ts',
    'lib/calculations.ts',
    'lib/executive-narrative.ts',
    'lib/pdf-report.ts',
    'components/printable-report.tsx',
    'components/turnover-insights-card.tsx',
    'components/operational-translation-card.tsx',
    'components/first-use-guide.tsx',
    'components/status-quo-card.tsx',
  ].forEach(copyPayload);

  patchAssumptions();
  patchAppPage();
  verify();

  console.log('\nLTC ROI v7 cumulative update applied successfully.');
  console.log('Next: run the project TypeScript/build check and complete the validation steps in README_UPLOAD.md.');
} catch (error) {
  console.error('\nUpdate failed.');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
