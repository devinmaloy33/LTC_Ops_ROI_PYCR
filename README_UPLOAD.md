# LTC ROI Methodology v2 — AI Studio Upload Instructions

Upload the included files to the matching paths in the existing AI Studio project.

## Replace existing files

- `app/page.tsx`
- `app/api/advisory/route.ts`
- `components/printable-report.tsx`
- `components/sheets-sync.tsx`
- `lib/calculations.ts`
- `next.config.ts`

## Add new files

- `components/assumptions-panel.tsx`
- `lib/assumptions.ts`
- `lib/roi-types.ts`

## Keep existing files

- `app/api/providers/route.ts`
- `lib/gemini.ts`
- `app/globals.css`
- `app/layout.tsx`
- `.env.example`

## Environment variables

- `GEMINI_API_KEY` — required for the AI advisory
- `GEMINI_MODEL` — optional; defaults to `gemini-2.5-flash`

## What this version changes

1. Replaces the original gross-benefit percentage with conventional net ROI:
   `(Paycor-influenced annual benefit - annual investment) / annual investment`.
2. Adds a benefit-cost ratio and payback period.
3. Stops double counting retired technology spend.
4. Values only the overtime premium and the agency premium above internal hourly labor.
5. Separates CMS Five-Star ratings from the SNF VBP program.
6. Removes the invented fixed PBJ penalty and requires a prospect-entered compliance exposure.
7. Adds conservative, expected and opportunity assumption presets with real-time overrides.
8. Adds Paycor attribution factors and direct / influenced / correlated evidence classes.
9. Keeps strategic census, CMS and SNF VBP upside outside base ROI.
10. Adds single-facility and portfolio calculations.
11. Updates the customer-facing report and AI prompt with methodology disclosures.
12. Re-enables TypeScript build checking by removing `ignoreBuildErrors`.

## Important review note

The scenario percentages are planning assumptions, not universal research findings or Paycor guarantees. The included CMS sources support regulatory context and separation of CMS programs. Prospect actuals and validated Paycor customer evidence should replace scenario defaults whenever available.
