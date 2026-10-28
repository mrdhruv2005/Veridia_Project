# Veridia project audit

Reviewed on 28 October 2026 against `Product_Engineer_Assignment.docx`, the supplied CSV, the application source, tests, and product note.

Implementation follow-up: see [audit fixes](audit-fixes-2026-10-28.md) for the subsequent changes and their verification. The installation-portability recommendation was declined by the user; the D-drive setup is retained. The findings below record the state at the time of the audit.

The core matching tool implements the assignment's main requirements. No incorrect shortlist or ranking was found in the independent source-data checks. The current Chromium browser suite passed, including mobile layout, concurrent buyer isolation, stale-response handling, comparison, checklists, and reports. The remaining work is concentrated in saved-report edge cases, reviewer setup, accessibility, and repository handoff.

This is an audit, not a set of application fixes. Application source was not edited. Build outputs and browser verification artifacts were regenerated. Additional audit scripts and reproducible fixtures are under `.tmp/review-20261028/`.

## Checks and results

| Check | Current result | Evidence and scope |
| --- | --- | --- |
| ESLint | Passed | `npm run check`; no lint errors reported |
| Existing unit tests | 41 passed | Data preparation, matching, dates, ranking, reports, and worker boundaries |
| TypeScript | Passed | `tsc --noEmit` |
| Production build | Passed | Vite 8.3.5; generated static assets |
| Browser tests | 12 passed | User ran the suite in normal PowerShell; saved status and screenshots corroborate the result |
| Independent source-data comparison | 244 requests, zero mismatches | Separate filtering/ranking implementation reads the original CSV; includes both buyers on 27 and 28 October plus 240 varied requests |
| Export/import round trips | 90 cases passed | Every material/process choice combination, no certificates, 1,000 units, 730-day production limit; largest JSON 526,286 bytes with 104 matches, below 5 MB |
| Additional audit probes | 5 completed | Include the independent checks and explicit reproductions of the two report findings below; passing reproduction tests do not mean those defects are fixed |
| Desktop/mobile visual inspection | Six fresh screenshots reviewed | Start, shortlist, supplier evidence, checklist, comparison, and 390 x 844 mobile results |
| Printed report | 15 pages rendered and reviewed at overview level | Buyer B with comparison and checklist progress; no blank pages or text blocks outside page boundaries detected |
| Common secret signatures | None detected | Source/build scan for private keys and common GitHub, AWS, and OpenAI key signatures; not a guarantee against every possible secret |
| Dependency vulnerability audit | Not completed | Registry connection refused by the environment; no vulnerability-free claim can be made |

The task shell could not launch the browser runner (`spawn EPERM`), and interactive browser/native controls were unavailable. The user subsequently completed all 12 browser tests outside the task sandbox. `test-results/.last-run.json` records `passed`, and `test-results/browser-checks.json` records the fresh Chromium run at `2026-10-28T07:59:51.395Z`.

Current browser measurements: six jobs across two fresh workers took 915.5 ms including startup; 20 warm requests had median 124.8 ms and p95 144.5 ms. These include worker transfer but exclude UI rendering. They are local measurements, not a scale guarantee.

## Assignment coverage

| Assignment concern | Assessment |
| --- | --- |
| Accept buyer requirements and suggest manufacturers | Implemented. Material, process, quantity, certificates, time window, destination, evaluation date, and optional recurring-order context are supported. |
| Multiple buyers and changing requirements | Implemented. Per-tab state and workers isolate buyers; revision checks discard obsolete responses; edits clear comparison/checklist context and mark results outdated. Browser tests passed. |
| Unexpected inputs | Numeric/date bounds and schema validation are tested. Invalid files show errors. Saved-report structural validation has the edge case described below. |
| Imperfect dataset | All 1,000 rows reconcile. Twenty rows sharing ten conflicting IDs are quarantined; ten missing lead times remain unknown; ten impossible delivery percentages are not used as valid ranking values. Raw evidence is retained. |
| Time-sensitive certificates and repeatable answers | Implemented. UTC calendar dates and a frozen evaluation date are used; certificate expiry must cover estimated production completion, inclusively. Dataset hash and policy versions are recorded. |
| Two example buyers | Buyer A returns 33 preliminary matches; Buyer B returns only VM1006, Betwa Crest Precision Components. Verified for both 27 and 28 October 2026. |
| What happens when both buyers match VM1006 | Explained correctly as a supplier-confirmation problem. Combined batch quantity is 2,500 against nominal monthly capacity of 1,500; the dataset cannot prove actual availability or allocate six-week production slots. The app does not reserve capacity. |
| Arrival in Germany | The app distinguishes arrival from production readiness and explicitly leaves arrival unconfirmed because transit/customs data is absent. This is a defensible limitation. |
| Understand why a result was returned | Field-level checks, raw CSV provenance, ranking explanation, exclusions, method/data panel, and saved decision records are present. |
| Short note | Present in `docs/product-note.md`, approximately 777 words. Covers audience, design, omissions, success measures, and a defended quarantine decision. |
| AI | Optional in the brief. The documented choice to use deterministic matching is appropriate for the supplied fields. |
| Tests/checks | Present and substantial; fresh results recorded above. |
| Keep secrets out of repository | No runtime secrets required; ignore rules protect environment files; signature scan found no common key patterns. |
| GitHub repository link | Still missing from this workspace's handoff. There is no `.git` directory and the submission message still contains a placeholder. |

The comparison and contextual checklist additions are also implemented. Authentication, messaging, pricing, live reservations, freight estimation, and an AI service are not required additions under this brief.

## Findings to address

### 1. Make the setup usable outside this particular D drive

Priority: medium; affects reviewer onboarding.

`.npmrc:1` hardcodes `cache=D:/Project/.cache/npm`. `scripts/Use-DDrive.ps1:3` throws when the project is not on D:. The main Windows README instructions assume the same location. The existing alternate instructions describe a cache override for other operating systems, but the normal Windows path still excludes reviewers whose computer has no D: drive.

This was confirmed by source inspection and `npm config get cache`, which returns `D:\Project\.cache\npm`. Installation was not attempted on another machine.

Recommended change: keep the personal D-drive setup as an optional convenience, and provide a portable default using the cloned repository directory and a relative cache path. Verify a clean clone from a different path before handoff.

### 2. Reject or repair missing checklist context on report import

Priority: medium; reproduced at the schema and state-transition level.

Relevant code: `src/lib/reports/record.ts:16`, `src/components/SupplierDetails.tsx:7`, and `src/App.tsx:61`.

Reproduction:

1. Start with a valid downloaded Buyer B record.
2. Replace its `checklistItems` with `{}`, leaving `checked` empty.
3. `parseRecord` accepts the file.
4. The details component falls back to generating the current checklist because no saved items exist.
5. Checking one of those questions and exporting uses the original empty `checklistItems` together with the new checked ID.
6. The resulting JSON is rejected when reopened because that checked ID has no saved checklist item.

The parser/export state sequence was reproduced in an executable audit test. The fixture is `.tmp/review-20261028/missing-checklists-import.json`. This does not affect ordinary unmodified exports created by the current app; it affects an unexpected imported record that the app currently accepts.

Recommended change: require a complete, consistent saved checklist for every displayed supplier, or normalize and store missing items under an explicit compatibility policy. Validate the assembled record before download and show an actionable error instead of emitting an invalid record. Add a browser regression covering import, check, export, and reopen.

### 3. Preserve saved confirmation questions in comparisons

Priority: low; reproduced by rendering the comparison component.

`src/components/Compare.tsx` always calls the current `checklist(candidate, requirement)` function for the Supplier confirmation row. In contrast, supplier details and the report's checklist sections can use saved `record.checklistItems`.

An accepted record with different saved question text, including an unavailable historical policy version, therefore shows its saved questions in one section and freshly generated questions in its comparison. The audit test confirms that the comparison omits the supplied historical question.

Recommended change: pass saved checklist items into comparison rendering and use them consistently for imported records. Keep recalculation an explicit action. Current unmodified exports happen to have the same template text, so the usual export/replay test does not catch this.

### 4. Improve small-text contrast and result feedback

Priority: medium for contrast; lower priority for interaction polish.

The screenshots show a coherent, uncluttered interface. The sampled CSS foreground/background pairs below fall short of the WCAG AA 4.5:1 threshold for ordinary small text:

| Element in `src/styles.css` | Foreground / background | Calculated ratio |
| --- | --- | --- |
| Supplier metadata labels | `#72816b` / white | 4.14:1 |
| Supplier ID beside location | `#7a8577` / white | 3.85:1 |
| Footer small text | `#798572` / white | 3.88:1 |
| Rank badge | `#6c7e5f` / `#eff3e9` | 3.90:1 |

These are calculations from the declared CSS colors, not a complete automated accessibility audit. Much secondary text is only 9-11 px. Darken it and increase the size of important labels where practical.

`src/App.tsx:82` announces loading/outdated notices, but ordinary successful matching does not announce the result count in that live region. Successful matching also does not move to the results; only opening comparison has an automatic scroll. Because the form stacks above results on mobile, a buyer using a preset near the top can miss the updated results below the long form.

Recommended change: announce the completed result count, provide a deliberate focus/scroll path to the results after an explicit submission, and move focus to the first invalid field when validation fails. Verify with a screen reader and small-screen keyboard navigation. Do not move focus while the buyer is still editing.

### 5. Complete the required GitHub handoff

Priority: required before submission.

This folder has no Git repository metadata. `docs/submission-message.md` still says `[insert verified repository URL]`. The assignment explicitly asks for a GitHub repository link, so the local working app alone is not the complete submission.

The remaining handoff is to initialize/commit the intended project files, publish to the chosen repository, verify reviewer access, and replace the placeholder. No publication was attempted during this review.

## Optional refinements

- Offer a concise printable report with the selected suppliers and an optional exclusions appendix. The current Buyer B report runs to 15 pages even with only one qualified supplier, because it includes checklists for all 12 near matches. The print output is usable, but lengthy.
- Preserve comparison and checked progress when an explicit replay verifies an identical request/result, or clearly explain that recalculation resets them. `run()` currently invokes `invalidate()` even when the requirement has not changed.
- Update `IMPLEMENTATION_PLAN.md` before handoff: it still says application implementation has not started. If distributing a ZIP as well as the repository, regenerate it after the final changes; the existing ZIP predates the latest ignore-file update and this review.
- Keep fresh audit/regression evidence alongside the existing historical verification report so reviewers can distinguish the 27 October checks from this 28 October review.

## Verification limits and reproduction

Chromium desktop and a 390 x 844 emulated viewport were exercised. Firefox, Safari/WebKit, real mobile devices, screen-reader behavior, 200% zoom, and additional narrow widths were not verified. The local concurrency checks exercise independent sessions and stale responses; there is no shared reservation service to load-test. Supplier facts are mock, unverified source data.

`npm audit --json --offline=false --fetch-retries=0 --fetch-timeout=15000` could not reach the registry because the environment refused the network connection. A fresh dependency advisory check remains to be run in a network-enabled environment. The clean-copy installation evidence in `docs/verification.md` is from 27 October; a new clean install was not performed in this audit.

Reproduce the ordinary checks in normal PowerShell:

```powershell
cd D:\Project
. .\scripts\Use-DDrive.ps1
npm.cmd run check
```

Reproduce the temporary audit checks while the local audit files remain available:

```powershell
.\node_modules\.bin\vitest.cmd run --configLoader native --config .tmp\review-20261028\vitest.config.ts
```

The source-data audit results, export sizes, reproduction fixture, test log, dependency-audit response, and print inspection are retained under `.tmp/review-20261028/`. The normal test log is `.tmp/audit-check-20261028.log`. Temporary audit files are ignored by Git; the permanent review is this document.
