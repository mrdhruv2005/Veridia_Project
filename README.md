# Veridia manufacturer matching

A local, explainable shortlist for buyers sourcing precision engineering from India. Enter a requirement, compare up to three manufacturers, review field-level evidence, and save a supplier-confirmation checklist. The application uses the supplied mock CSV and requires no API key, backend, AI account or paid service.

## Run on Windows from D:

Prerequisite: **Node.js 24 or newer**, with npm (verified with Node 24.15.0). Native TypeScript/config loading avoids an extra helper process. The project is in `D:\Project`. Keep the setup script active in each PowerShell window; it checks the drive before configuring project paths.

```powershell
cd D:\Project
. .\scripts\Use-DDrive.ps1
npm.cmd ci
npm.cmd run data:prepare
npm.cmd run dev
```

Open the local URL printed by Vite, normally <http://127.0.0.1:5173>. An offline-only npm setting can be overridden with `--offline=false` in a network-enabled terminal.

The setup script keeps `node_modules`, npm cache (`.cache/npm`), Playwright browsers (`.cache/ms-playwright`), build output (`dist`), test reports and temporary files (`.tmp`) on D:. It changes only the current PowerShell process; it does not change system settings. There are no junctions to dependencies on another drive.

Reviewers on another operating system can use Node 24 with `npm ci --cache ./.cache/npm`, `npm run data:prepare` and `npm run dev`. The cache override replaces this workspace's D-drive default; no Windows script is needed there. Set `PLAYWRIGHT_BROWSERS_PATH` to a project-local folder before installing browsers or running browser tests on that machine.

## Try the assignment examples

Set **Evaluation date** to **27 October 2026**, then select an example. Each example immediately runs matching. The examples interpret six weeks as **42 production calendar days**, explicitly excluding shipment. Change the deadline meaning to **Arrival at destination** when arrival is required; results then state that arrival feasibility remains unconfirmed.

| Requirement | Expected preliminary result |
| --- | --- |
| Buyer A: aluminium, CNC machining (either milling or turning), 1,000 units, ISO 9001, 42 production days | 33 candidates |
| Buyer B: stainless steel, sheet metal, 1,500 units, ISO 9001, 42 production days | VM1006 only |

VM1006 appears for both buyers. Its nominal monthly capacity is 1,500 units, while their combined batches total 2,500. This does not determine allocation within a six-week window: the file has no live booking, start-date or spare-capacity data. Confirm a production plan with the supplier. Searching never reserves capacity.

Select up to three **Compare** checkboxes and open **Compare suppliers**. Use **Evidence & checklist** to review reasons and record your own progress. An edit to any requirement immediately makes old results outdated and clears comparison and checklist progress. Each tab has separate in-memory state.

## Verify and build

```powershell
cd D:\Project
. .\scripts\Use-DDrive.ps1
.\node_modules\.bin\playwright.cmd install chromium
npm.cmd run check
npm.cmd run preview
```

`check` runs lint, unit tests, data preparation, TypeScript checking, production build and browser tests. Browser tests use the production build at `http://127.0.0.1:4173`. The first browser install requires internet; subsequent tests run locally. If the CSV changes, run `npm.cmd run data:prepare` before unit tests. See [verification evidence](docs/verification.md) for checks actually completed and any limitations.

Individual commands: `npm run data:prepare`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e`.

For an independent install from the lockfile, run `.\scripts\Verify-CleanCopy.ps1` in normal PowerShell. It creates a new folder under `.tmp` on D:, runs `npm ci` and all checks, and retains logs. It does not remove existing work or publish anything.

## Matching policy

1. Quarantine ambiguous IDs and invalid capability/order records. Require active status, the material, all selected operations, an inclusive batch range and every requested certificate. The visible **CNC machining** group means either milling or turning; choosing both specific operations requires both.
2. Require a known production lead time within the requested window. Missing lead time goes to **needs confirmation**, never the confirmed shortlist. An arrival window is only a necessary production screen; transit and customs are unknown.
3. Add lead time in UTC calendar days to the frozen evaluation date. Require requested certificates to cover that completion date, including the expiry day. One supplier-level expiry is assumed to apply to all listed certificates. Clearing every certificate checkbox explicitly removes certificate filtering.
4. Rank by shortest production time, highest valid on-time delivery, most general export experience, then manufacturer ID. Unknown metrics follow known metrics when earlier criteria tie. There is no opaque percentage score.
5. Recurring orders evaluate the first batch separately. Renewal before a repeat horizon and monthly volume above nominal capacity generate warnings; neither implies actual available capacity.

The default date is captured once from the current UTC date and is preserved across edits and examples. The CSV contains no historical issuance/status history. Past and future evaluations are labelled snapshot-based scenarios. Material/process lists do not prove that the combination can run on the same line; grades, drawings and tolerances need confirmation. Contact fields are mock example-domain addresses; no messages are sent.

## Reports and replay

**Download JSON** saves the complete normalized requirement, evaluated supplier evidence, explanations, comparison, checklist questions and progress, dataset SHA-256 and policy version. **Save readable HTML** creates a standalone report; open it later and use the browser's **Print / Save as PDF**. **Print report** previews the report and lets you choose the included suppliers and the near-match appendix. By default, readable reports include your selected suppliers, or the top three when none are selected, and omit the appendix. Choose **All matching suppliers** for a full report. The JSON always retains all results, regardless of these print choices.

**Open saved report** accepts bounded (5 MB), schema-validated JSON with complete, distinct supplier checklists. Incomplete or inconsistent files are rejected before display. Saved question wording is preserved in details, comparison and exports. It displays the stored result with an explicit unverified-record label. **Recalculate & verify replay** is a separate action and is available only when the installed dataset hash, dataset version and policy version match. An identical recalculation preserves comparison, saved questions and checklist progress; changed results clear that progress and show an explanation. Edits to the requirement still clear review progress immediately. The application never silently substitutes a newer policy or dataset for an unavailable old version. Imported records are user-provided, unsigned files; schema validation does not authenticate their claims.

Requirements and checklist progress stay in memory. Export explicitly to retain work; reloading the page clears unsaved state. Matching works without network access after the page and worker load. There is no service worker or promise of offline installation/reloading. The HTML exporter is loaded on demand, so open it once before disconnecting if using it offline.

## Repository guide

| Path | Purpose |
| --- | --- |
| `veridia_csv.csv` | Unmodified supplied source; SHA-256 identifies the dataset |
| `Product_Engineer_Assignment.docx`, `IMPLEMENTATION_PLAN.md` | Original brief and finalized scope |
| `data/prepared.json`, `data/quality.json` | Reproducibly generated normalization and issue counts |
| `src/lib/data/` | CSV parsing, validation, provenance and quarantine |
| `src/lib/matching/` | Pure eligibility/ranking, checklist templates, worker boundary |
| `src/workers/` | Per-tab browser matching worker |
| `src/lib/reports/` | Bounded JSON records and standalone HTML report |
| `tests/`, `e2e/` | Business-rule, data, report, worker and real-browser checks |
| [Product note (PDF)](docs/product-note.pdf) / [Markdown](docs/product-note.md) | Two-page note: audience, design choices, omissions, a defended trade-off and success measures |
| [Data-quality report](docs/data-quality.md) | Observed defects, treatment and data limitations |
| [Submission checklist](docs/submission-checklist.md) | Final review and pending repository handoff |

## Free delivery

Additional project budget: **₹0**. All required execution and tests are local and open source. No paid integrations, metered APIs, custom domain or paid runners are used. Preserve dependency licenses in installed/distributed packages; see [third-party notices](THIRD_PARTY_NOTICES.md).

The user has approved a public GitHub repository; publishing is pending the new repository URL and a successful push. A hosted demo is optional. GitHub Pages from a public GitHub Free repository is the planned zero-cost route; do not upgrade or purchase hosting. The assignment requires a repository link, not a hosted URL.

Vite uses relative asset URLs by default, so the static build works under a repository subpath. To build an explicit Pages path:

```powershell
$env:VITE_BASE_PATH = '/YOUR_REPOSITORY_NAME/'
npm.cmd run build
Remove-Item Env:VITE_BASE_PATH
```

Publish only the locally built `dist` contents to the Pages publishing branch after repository/sharing approval. There is no automatic CI deployment or paid-service configuration. Use local run instructions and screenshots if hosting is unavailable. Final submission deadline: **28 October 2026, end of day IST**.
