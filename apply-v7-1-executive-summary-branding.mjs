import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function write(rel, content) {
  fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
  fs.writeFileSync(path.join(root, rel), content, 'utf8');
}

function replaceOnce(content, search, replacement, label) {
  const first = content.indexOf(search);
  if (first === -1) throw new Error(`Could not find expected block: ${label}`);
  if (content.indexOf(search, first + search.length) !== -1) {
    throw new Error(`Expected one match but found multiple: ${label}`);
  }
  return content.slice(0, first) + replacement + content.slice(first + search.length);
}

function patchFile(rel, mutator) {
  const before = read(rel);
  const after = mutator(before);
  if (after === before) throw new Error(`No changes produced for ${rel}`);
  write(rel, after);
  console.log(`Updated ${rel}`);
}

// Remove the previously corrupted binary.
const oldLogo = path.join(root, 'public/paycor-logo.png');
if (fs.existsSync(oldLogo)) {
  fs.rmSync(oldLogo);
  console.log('Removed corrupted public/paycor-logo.png');
}

const newLogo = path.join(root, 'public/paycor-empowering-leaders.jpg');
if (!fs.existsSync(newLogo)) {
  throw new Error('Missing public/paycor-empowering-leaders.jpg from the update package.');
}

// Also keep the payload directory in sync for absolute consistency
fs.mkdirSync(path.join(root, 'payload/public'), { recursive: true });
fs.copyFileSync(newLogo, path.join(root, 'payload/public/paycor-empowering-leaders.jpg'));
const oldPayloadLogo = path.join(root, 'payload/public/paycor-logo.png');
if (fs.existsSync(oldPayloadLogo)) {
  fs.rmSync(oldPayloadLogo);
}

patchFile('app/page.tsx', (source) => {
  let next = source;
  next = replaceOnce(
    next,
    `  FileDown,\n  Layers3,`,
    `  FileDown,\n  HelpCircle,\n  Layers3,`,
    'HelpCircle icon import',
  );

  next = replaceOnce(
    next,
`          <div className="flex flex-col items-start lg:items-end gap-3">
            <img
              src="/paycor-logo.png"
              alt="Paycor — Empowering Leaders"
              className="h-16 md:h-[72px] w-auto object-contain"
            />
            <button
              type="button"
              onClick={() => setShowReport(true)}
              className="inline-flex items-center justify-center gap-2 bg-paycor-orange hover:bg-paycor-red-orange text-white font-extrabold px-4 py-3 rounded-xl text-xs shadow-sm"
            >
              <FileDown className="w-4 h-4" /> Customer Report
            </button>
          </div>`,
`          <div className="flex flex-col items-start lg:items-end gap-3">
            <img
              src="/paycor-empowering-leaders.jpg"
              alt="Paycor — Empowering Leaders"
              className="w-[165px] h-auto object-contain"
            />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowFirstUseGuide(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-paycor-medium-grey hover:bg-slate-50"
              >
                <HelpCircle className="h-4 w-4" /> How it works
              </button>
              <button
                type="button"
                onClick={() => setShowReport(true)}
                className="inline-flex items-center justify-center gap-2 bg-paycor-orange hover:bg-paycor-red-orange text-white font-extrabold px-4 py-3 rounded-xl text-xs shadow-sm"
              >
                <FileDown className="w-4 h-4" /> Customer Report
              </button>
            </div>
          </div>`,
    'header logo and utility actions',
  );

  next = replaceOnce(
    next,
`            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowFirstUseGuide(true)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-paycor-medium-grey"
              >
                How to use this tool
              </button>
              {!customerReady && (
                <button type="button" onClick={() => setShowEstimateAssistant(true)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-paycor-medium-grey">
                  Review unconfirmed values
                </button>
              )}
            </div>`,
`            {!customerReady && (
              <button type="button" onClick={() => setShowEstimateAssistant(true)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-paycor-medium-grey">
                Review unconfirmed values
              </button>
            )}`,
    'remove walkthrough from Data Readiness',
  );

  return next;
});

patchFile('components/printable-report.tsx', (source) => {
  let next = source;
  next = replaceOnce(
    next,
`              <img
                src="/paycor-logo.png"
                alt="Paycor — Empowering Leaders"
                className="h-14 w-auto object-contain"
              />`,
`              <img
                src="/paycor-empowering-leaders.jpg"
                alt="Paycor — Empowering Leaders"
                className="w-[140px] h-auto object-contain"
              />`,
    'printable report logo image link and dimensions',
  );
  return next;
});

patchFile('lib/pdf-report.ts', (source) => {
  let next = source;
  next = replaceOnce(
    next,
    "  const logo = await loadPublicImageAsDataUrl('/paycor-logo.png');",
    "  const logo = await loadPublicImageAsDataUrl('/paycor-empowering-leaders.jpg');",
    'pdf logo loading url',
  );
  next = replaceOnce(
    next,
    "    if (logo) doc.addImage(logo, 'PNG', margin, 14, 62, 30);",
    "    if (logo) doc.addImage(logo, 'JPEG', margin, 14, 62, 30);",
    'pdf report header logo format',
  );
  next = replaceOnce(
    next,
    "  if (logo) doc.addImage(logo, 'PNG', margin, 18, 116, 56);",
    "  if (logo) doc.addImage(logo, 'JPEG', margin, 18, 116, 56);",
    'pdf report cover logo format',
  );
  return next;
});

// Sync changes to the payload files as well to preserve state
if (fs.existsSync('payload/components/printable-report.tsx')) {
  try {
    fs.copyFileSync('components/printable-report.tsx', 'payload/components/printable-report.tsx');
    console.log('✓ Synced payload/components/printable-report.tsx');
  } catch (err) {
    console.warn('Warning syncing payload components:', err.message);
  }
}

console.log('Branding and executive summary layout adjustments completed successfully.');
