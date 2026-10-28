# Veridia manufacturer matching final implementation plan

Prepared on 27 October 2026; implementation status updated on 28 October. Submission deadline: 28 October 2026, end of day IST. The original target was a submission-ready repository by 6 pm on 28 October, leaving the evening for fixes and submission.

Build a focused web application that turns a buyer's manufacturing requirement into an explainable shortlist from the supplied CSV. The final required scope includes comparison of up to three suppliers and a contextual supplier-confirmation checklist. The submission needs a working tool, meaningful tests, a short product and engineering note of no more than about two pages, and a GitHub repository containing everything needed to run and assess it.

This plan records the agreed scope based on both supplied files, the user's confirmed additions and the zero-cost constraint. The application is implemented. The 28 October audit fixes cover saved-report integrity, accessible result feedback, concise reports and preservation of unchanged review progress. Current verification and remaining handoff work are recorded in `docs/verification.md` and `docs/submission-checklist.md`. The user has chosen to retain the D-drive installation setup.

## Zero-cost budget and delivery policy

The project budget is INR 0 for additional software, APIs, hosting, database services, domain names, testing services, design assets, and submission. Development uses the user's existing computer and internet connection. No new hardware, subscriptions, payment details, paid trials, metered services, or purchased credits are part of this plan.

Use free open-source development tools, local builds and tests, and browser-side matching. The delivered application requires no AI account, API key, hosted backend, cloud database, or paid license. Browser printing provides PDF output without an export service. Use system fonts and free licensed icons or CSS; retain applicable license notices.

| Item | Zero-cost choice | Project charge |
| --- | --- | --- |
| Development | Node.js, npm, Git, React, TypeScript, Vite, Tailwind CSS, Zod and Papa Parse on the existing computer | INR 0 |
| Matching and data storage | Browser Web Worker, bundled dataset, local report files | INR 0 |
| Testing | Vitest, Playwright and their local browser binaries | INR 0 |
| Source repository | GitHub Free | INR 0 |
| Public assignment demo | GitHub Pages from a public repository using its included github.io URL | INR 0 |
| Documentation and exports | Markdown, HTML, JSON, screenshots, browser Print / Save as PDF | INR 0 |
| AI, paid integrations and custom domain | Excluded from this submission | INR 0 |

GitHub documents Pages as available for public repositories on GitHub Free. A private repository does not qualify for Pages on that plan. The hosted version is an assignment demonstration using mock data, not an operating commercial service. If public sharing is unsuitable or Pages is unavailable, deliver the GitHub repository with reviewer access, local run instructions and screenshots; the assignment does not require a hosted URL. Do not upgrade or purchase hosting to unblock submission.

Local tests and builds are the required verification path. Any optional automated deployment must use standard GitHub-hosted runners, which GitHub lists as free for public repositories and Pages. Avoid larger runners, paid marketplace actions, unnecessary artifact/cache retention and higher storage limits. Prefer building locally and publishing the small static output from a Pages publishing branch. Do not enable any paid usage. If a free limit is reached, keep the local deliverable available instead of incurring a charge.

Official hosting and build references checked on 27 October 2026:

- [GitHub Pages availability](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [GitHub Pages usage limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
- [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
- [GitHub Pages publishing from a branch](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [Vite static deployment](https://vite.dev/guide/static-deploy.html)

Free service terms can change; the application and required submission remain usable locally without a service subscription. This budget covers project-related purchases, not existing computer, internet, electricity or unrelated account costs.

## What the assignment requires

- Accept a buyer requirement and recommend manufacturers from the supplied dataset.
- Handle simultaneous buyers and changes to requirements without mixing results or showing stale results as current.
- Explain why a manufacturer qualifies, why others do not, and what remains unknown.
- Make certificate validity depend on an explicit date and keep matching reproducible.
- Handle imperfect data and unexpected inputs deliberately.
- Let an unfamiliar reviewer get a result without assistance.
- Explain product choices, omissions, success measures, and one defensible trade-off in a short note.
- Keep secrets out of the repository. AI is optional and should serve a specific purpose if included.
- Include supplier comparison and the supplier-confirmation checklist as user-required deliverables.
- Complete development, testing and submission without additional project spending.

## Findings from the supplied CSV

The file contains 1,000 rows and 31 columns, covering capabilities, materials, certificates, order sizes, lead times, delivery history, capacity, and company information. All rows list India and active status. There are nine process labels, nine material labels, and five certificate labels.

| Finding | Verified extent | Planned treatment |
| --- | --- | --- |
| Conflicting manufacturer IDs | 10 IDs occur twice, with different names and capabilities | Quarantine all 20 affected rows from normal recommendations; preserve both records and explain the conflict. This leaves 980 unambiguous records before other checks. |
| Missing lead times | 10 rows have both lead time fields blank | Treat timing as unknown. Exclude from confirmed deadline matches; allow a separately labelled needs-confirmation result. |
| Impossible on-time delivery percentages | 10 rows exceed 100%; values range from 105.5 to 142.6 | Preserve the raw value, mark the normalized metric unavailable, and prevent it from boosting ranking. Do not clamp it to 100%. |
| Expired certificate dates | Two rows have dates before 27 October 2026 | Evaluate against the request's frozen reference date and the certificate policy below; never hardcode a list of expired suppliers. |
| Multiple certificates but one expiry field | The schema provides only one manufacturer-level expiry date | Explicitly assume that date applies to the listed certificates for this exercise; individual certificate verification remains unavailable. |

The checks found no disagreements between populated lead time days and weeks, list counts and their count fields, or numeric order limits and their displayed ranges. Date fields parse successfully. Future imports still need validation for these conditions.

The CSV does not provide prices, manufacturing tolerances, material grades, drawings, shipping/customs durations, live production bookings, or verified certificates. Separate process and material lists also do not establish which material can be processed on which production line. Results are preliminary capability matches based on the supplied data.

## Product scope

Use one main matching screen, a manufacturer detail panel, and a concise methodology/data-quality view.

The main screen contains:

1. A requirement form for material, process, batch quantity, required certificates, maximum production lead time, and evaluation date. Include destination as context. For recurring requirements, capture batch quantity separately from expected monthly volume and an optional repeat-order horizon. Explain that nominal capacity is not confirmed availability.
2. Two example buttons reproducing Buyer A and Buyer B from the assignment.
3. A visible summary of the submitted criteria. Edits mark previous results as outdated until the revised request completes.
4. Ranked result cards showing the matched capability, accepted order range, production lead time, certificate expiry, valid delivery history, and data limitations.
5. A detail panel showing the field-level reasons a candidate passed and why it occupies its position in the list.
6. A clear empty state and separately labelled near matches with the failed or unknown requirement. Never quietly loosen a certificate, material, quantity, or deadline requirement.
7. A human-readable saved report containing the submitted criteria, evaluated results, explanations, assumptions, and date, plus a downloadable JSON record containing the dataset and matching-policy versions for replay. Use a print-friendly HTML view and the browser's Print / Save as PDF feature. Add a bounded, schema-validated way to reopen a saved JSON record. Clearly distinguish viewing a saved result from recalculating it, and refuse silent replay against a different dataset or policy version. Imported records are user-provided files, not signed or independently verified evidence.
8. A comparison view for up to three shortlisted manufacturers, described below. This is required scope.
9. A contextual supplier-confirmation checklist, described below. This is required scope.

Structured input is the required path. A vague phrase such as "a few thousand aluminium parts" needs an explicit batch quantity and process selection before matching. "CNC machining" may be an explicit user-visible process group meaning either CNC milling or CNC turning; selecting both as required operations means both must be listed.

The time field will say "maximum production lead time", with a nearby explanation that shipment to Germany is not included. If a buyer needs an arrival deadline, the tool must surface the missing transit/customs information instead of claiming that a six-week production lead means delivery in six weeks. Interpret the dataset's generic lead time as production lead time for the exercise and document that assumption.

Make that distinction part of the input flow: ask whether the stated deadline concerns production readiness or arrival at destination. For an arrival deadline without transit information, report production capability matches separately and mark arrival feasibility unconfirmed. Do not quietly relabel the buyer's arrival deadline as a production deadline. A buyer-supplied transit allowance can be a later what-if feature, clearly labelled as an assumption.

For recurring orders, evaluate the first batch and show a separate repeat-order warning when the listed certificate expires within the entered horizon. If expected monthly volume exceeds listed nominal monthly capacity, flag the mismatch for confirmation. Do not infer spare capacity when it is below that figure or treat an entire multi-month quantity as one order. Include a test where the first batch qualifies but later repeat orders require certificate renewal.

## Required supplier comparison

Let the buyer add up to three qualifying manufacturers to a comparison tray and open a side-by-side table. Compare the following using the same evaluated result snapshot:

- Name, manufacturer ID and location.
- Matched process and material, with the source-data compatibility limitation visible.
- Minimum and maximum batch quantities.
- Production lead time and estimated production-ready date.
- Requested certificates, recorded expiry, and any repeat-order expiry warning.
- Valid on-time delivery percentage, with unavailable values labelled as unknown.
- Nominal monthly capacity and general export experience.
- Important data limitations and supplier-confirmation items.

Allow removing and replacing selections. Explain the three-supplier limit. Support comparison when there are only one or two candidates, including Buyer B's example. Do not use a fourth supplier silently or convert missing values to zero. Clear the comparison selection when requirements or the evaluation date change so an old qualification cannot appear current. Include the selected comparison in the printable report. On small screens use a labelled horizontally scrollable table or stacked equivalent.

Completion checks: select/remove/reselect suppliers, enforce the maximum of three, verify every displayed value against the result snapshot, handle unknown values, and ensure requirement edits invalidate the comparison.

## Required supplier-confirmation checklist

Generate concise questions from the buyer's requirement and each manufacturer's evidence using deterministic templates. Include:

- Confirm the specific material grade and ability to machine or fabricate it to the buyer's drawing and tolerances.
- Request the current certificate covering the relevant work; ask about renewal if it expires during a repeat-order horizon.
- Confirm acceptance of the requested batch size, repeat cadence and commercial quote.
- Confirm an available production slot, realistic start date and capacity for repeat batches; nominal monthly capacity is not spare capacity.
- Confirm shipment method, freight/customs allowance and arrival estimate for the destination when arrival matters.
- Request missing lead-time or delivery-history evidence where the corresponding value is unknown; do not present unknown delivery history as a claimed performance rate.

Make the checklist specific where supported: insert the requested quantity, process, destination and supplier name without inventing prices or availability. Show it in the supplier detail panel, allow local checkboxes for the buyer's own progress, and include it in the report/download. A checked item records the buyer's review only; it must not upgrade manufacturer eligibility or become verified source data. Clear check marks when requirements change and keep them scoped to the selected supplier and current browser session. Do not send emails or contact suppliers. The dataset's example-domain contact details are mock information.

Completion checks: relevant unknowns produce the appropriate questions, repeat-order renewal and destination questions appear when applicable, suppliers' check marks remain separate, and exports preserve the requirement and supplier context.

## Technical design

| Component | Choice | Reason |
| --- | --- | --- |
| Application | React, TypeScript and Vite | A static application with no paid backend or runtime service. |
| Styling | Tailwind CSS | Quick, consistent responsive layout and accessible form states. |
| Validation | Zod | Validate buyer input, worker messages, normalized records and imported reports. |
| CSV ingestion | Papa Parse | Correct handling of quoted commas and semicolon-delimited capability fields. |
| Matching | Pure TypeScript functions executed in a browser Web Worker | Deterministic behavior, responsive UI and isolation per browser session. |
| Tests | Vitest and a focused local Playwright suite | Verify business rules, worker isolation, comparison, checklist and real user flows. |
| Storage | Versioned local CSV and generated normalized JSON | The supplied 1,000-row snapshot does not require a database. |
| Delivery | GitHub Free repository and GitHub Pages assignment demo where public sharing is suitable | A free included domain and static hosting; local delivery remains the fallback. |

Data flow: raw CSV -> build-time validation and normalized snapshot -> browser Web Worker -> explained results -> comparison, confirmation checklist and saved report.

Generate the normalized dataset during a documented local preparation/build step. Preserve the original CSV. Attach original source row numbers and a hash of the dataset. Each browser loads the immutable prepared snapshot and creates its own worker. Buyer inputs and checklist state are processed locally, without analytics or third-party runtime calls. Each tab keeps state in memory; persistent review is via explicit report download/import rather than shared browser storage.

The supplied data is small and mock, and the assignment does not mandate a backend. Browser-side matching supports multiple buyers without shared mutable request state or a server bill. Static assets can be downloaded by site visitors, so this design assumes the manufacturer snapshot may be shared with reviewers. Keep a future private-data/transactional application outside this submission. Configure Vite's base URL for the Pages repository path and use one main screen with panels to avoid server routing requirements.

Suggested structure:

```text
src/App.tsx              main application and submitted requirement state
src/components/          form, results, detail panel, empty states
src/components/compare/  comparison tray and table
src/components/checklist/ contextual supplier questions and local check marks
src/lib/data/            parsing, normalization, quality checks
src/lib/matching/        input schema, eligibility, ranking, explanations
src/lib/reports/         printable report, JSON export/import and replay checks
src/workers/             matching worker and typed revision messages
data/                    original CSV and versioned prepared snapshot
scripts/                 reproducible data preparation
tests/                   unit and worker integration tests
e2e/                     focused browser scenarios
docs/product-note.md     required short note
docs/data-quality.md     findings and cleaning policy
README.md                setup, examples, testing, assumptions
```

## Matching and time policy

Evaluate hard requirements before ranking:

- Manufacturer has an unambiguous identity and active status.
- Requested material and selected process/group are present.
- All required certificates are listed.
- Batch quantity falls within the inclusive minimum and maximum order limits.
- A known, valid lead time fits the requested production deadline.
- Required certificates remain valid through estimated production completion.

Capture a calendar `as_of_date` once when the request is created and display it to the buyer. Default it to the current UTC date; preserve it across edits unless the buyer explicitly changes it. Perform date arithmetic in UTC calendar days. For a known supplier lead time, estimated production completion is `as_of_date + lead_time_days`, assuming work begins on that date. Treat a certificate as valid through its expiry date, inclusively. This deliberately conservative policy avoids recommending a certificate that expires during the estimated production period. It does not assert that the supplier can actually start immediately.

Preserve normalized requirements, `as_of_date`, dataset hash, and matching-policy version. These identify the inputs that produce the same candidates, ordering, and explanations. A replay uses its stored snapshot/version or explicitly reports that the version is unavailable; it must not silently substitute a changed dataset.

An evaluation date applies rules to the supplied snapshot; the file does not provide historical certificate issuance dates or historical company status. Label past-date evaluations as snapshot-based scenarios, not proof of past validity. Future-date scenarios likewise cannot establish future availability. An explicitly empty required-certificate list imposes no certificate eligibility filter; supplier certificate dates may still appear as context. Test this separately from a missing certificate selection.

Rank qualifying candidates by shortest production lead time, then highest valid on-time delivery percentage, then export experience, then manufacturer ID for stable ties. Unknown delivery metrics sort after known values when earlier criteria tie. Show these rules rather than inventing an unexplained match percentage. Alternative ranking preferences are deferred beyond this submission.

Monthly capacity is contextual evidence for recurring volume, not a measure of spare capacity. Do not compare a total quantity over several months against one month's capacity, deduct capacity when someone searches, or promise a production slot. General export experience does not prove Germany-specific experience.

## Concurrent buyers and changing requirements

Each browser tab maintains its own form, comparison, checklist and worker state. Each matching job sends the complete normalized requirement, frozen evaluation date, dataset version and revision number to that tab's worker. There is no shared buyer state on the static host. The worker must not mutate the manufacturer snapshot or carry a previous buyer requirement into a new job.

Request revisions have a monotonically increasing client sequence. Always ignore responses from older revisions, including worker errors or messages arriving after a reset. Editing a form immediately invalidates the displayed result summary and clears the old comparison and checklist check marks. Display meaningful dataset-load or worker errors with a retry action. Date capture occurs once in the client request snapshot, not independently inside later worker tasks.

Read-only matching does not reserve inventory or production slots. Both buyers may receive the same candidate. Real allocation would require a verified availability ledger and transactional reservations, which are outside this submission.

The actual examples are useful regression cases. At an evaluation date of 27 October 2026, treating six weeks as 42 production days, requiring certificate validity through estimated completion, and excluding conflicting IDs:

- Buyer A: aluminium, either CNC milling or turning, quantity 1,000, ISO 9001 -> 33 preliminary candidates.
- Buyer B: stainless steel, sheet metal, quantity 1,500, ISO 9001 -> one preliminary candidate, VM1006.
- VM1006 qualifies for both and lists capacity of 1,500 units per month. The two batches total 2,500 units, but the dataset cannot establish whether the supplier can accept both within the requested window. Do not infer a definitive allocation result from a monthly total alone.

These counts come from a preliminary audit, not an implemented application. Reproduce them in the application tests under the same assumptions. Real material/process compatibility and availability still require supplier confirmation.

## AI and scope control

The final submission uses no external AI API. AI is optional in the assignment, and deterministic structured input fully supports the requested tool without cost, keys, quotas or provider availability. Do not rely on free-trial credits or install a local model that adds hardware/setup requirements. Explicit alias normalization such as aluminum/aluminium is ordinary input handling and must not be marketed as AI.

Defer free-text AI entry, alternative ranking modes, what-if exploration, authentication, supplier messaging, quotes, payments, live booking, certificate-verification integrations and multi-service infrastructure. Supplier comparison and the confirmation checklist are required and must not be removed as optional polish. Use a simple reliable layout for them if the schedule tightens.

## Verification and success measures

Write meaningful checks around the behaviors the submission claims:

- Exact minimum/maximum order boundaries; invalid, zero, negative, and fractional quantities; unsupported values and missing requirements.
- Semicolon lists, quoted CSV values, explicit aliases, malformed rows, conflicting IDs, and missing/invalid metrics.
- Expiry before, on, and after the reference/completion date; calendar rollover; frozen-date replay.
- No exact matches and clearly labelled near matches; a failed hard condition cannot be compensated by ranking.
- Stable ordering under ties and identical replay inputs; changing quantity/material updates eligibility.
- Simultaneous A/B browser sessions remain independent; delayed old worker responses cannot overwrite the latest edit.
- Independent browser contexts and the example workflows; readable error, loading, keyboard, and small-screen states.
- Several interleaved jobs in worker integration tests remain isolated, including changes to one buyer while another session is matching. Measure browser matching time separately from correctness; do not present a small test as proof of unlimited scalability.
- Recurring first-batch versus later-batch certificate warnings; batch quantity versus monthly volume; arrival deadlines with unknown transit time.
- Human-readable saved reports retain the original explanations. Reopened JSON is validated, and replay rejects unavailable or mismatched versions rather than presenting new results as the original decision.
- Comparison shows accurate evidence for at most three suppliers, handles one-supplier results, and clears on requirement changes.
- Checklist questions reflect the selected supplier and requirement; check marks cannot change eligibility, leak to other suppliers or survive incompatible edits.
- The built application makes no external AI, analytics, backend or paid-service calls. Verify matching still works after static assets load and no further network access is available; do not claim offline installation or persistence across reloads without implementing it.
- Check static asset URLs under the repository path, local printing and the hosted demo if deployed.
- Clean checkout installation, data preparation, type checking, lint, tests, and production build.

Acceptance targets: every normal result satisfies every implemented hard rule; every result includes source-backed reasons; comparison and confirmation checklist work for both examples; no mixed or stale buyer state in concurrency tests; a reviewer can run an example within a few minutes of opening the README; no paid service or key is required. Measure matching response time on the local dataset and report the actual result. Do not claim real-world matching accuracy from a mock dataset without labelled outcomes.

For future product evaluation, track expert shortlist acceptance, supplier confirmation rate, time to a useful shortlist, and how often buyers revise requirements after seeing no matches. These are proposed measures, not existing measured results.

## Requirements coverage review

Rechecked against the assignment on 28 October 2026. Every explicit requirement has an implementation or a documented scope decision. Executed checks and their limits are recorded in `docs/verification.md`; public repository handoff remains pending in `docs/submission-checklist.md`.

| Assignment requirement or context | Implementation | Evidence or remaining handoff check |
| --- | --- | --- |
| Take a buyer requirement and point to suitable dataset manufacturers | Validated form, eligibility rules, explained ordered results | Both examples and independently checked custom cases pass. |
| German buyer, aluminium machining, repeat batches, quality and timing | Process/material/certificate criteria, batch and recurring-volume fields, destination and deadline meaning | Repeat-order and arrival-versus-production cases are demonstrated. |
| Several buyers use the tool simultaneously | Independent browser sessions and workers using an immutable dataset | Interleaved worker jobs and independent browser contexts stay isolated. |
| Buyers change requirements partway through | Submitted-criteria snapshot, immediate outdated state, revision sequence and obsolete-response guard | A deliberately delayed old response cannot replace a newer result. |
| Trustworthy answers for unexpected input | Boundary validation, explicit unknowns, safe no-match behavior, no automatic relaxation | Malformed, incomplete, unsupported, and extreme inputs receive meaningful responses. |
| A newcomer can get a result without help | Visible examples, straightforward form, understandable labels, documented setup | Clean-checkout run and a first-use walkthrough succeed. |
| A newcomer can later understand why a result was given | Field-level reasons, readable saved report, versioned decision record | Saved explanations remain readable; supported replay is reproducible. |
| Show useful tests or checks | Data, business-rule, worker, browser, and build verification | Repository contains commands and actual results, with limitations stated. |
| Deal with imperfect data | Reproducible normalization, quarantine and unknown-value policies, source references | Input rows reconcile to retained/quarantined records and the documented issue counts. |
| Use AI where it helps | Deliberately omit an external AI dependency to meet the zero-cost requirement | Core functionality requires no key or AI account. The note explains why AI is unnecessary here; it is not mandatory in the brief. |
| Short note: audience, design, omissions, success measures, defensible choice | Concise product note addressing all five points | Final note is reviewed for brevity and explicitly defends a trade-off, such as quarantining ambiguous IDs at the cost of fewer candidates. |
| Certificates depend on time; same request gives the same answer | Frozen date, explicit validity rule, snapshot and policy version, deterministic ordering | Expiry boundaries, unchanged replay, and version mismatch cases pass. |
| Work through simultaneous Buyer A and Buyer B | Preset examples, separate responses, documented shared candidate and capacity uncertainty | Demonstration explains the next step: shortlist and supplier confirmation, without claiming booked capacity. |
| Judgment, craft, clarity | Explicit trade-offs, focused scope, evidence-based results and readable documentation | Reviewer can connect each important choice to a user need and a verification result. |
| Any stack allowed | One TypeScript application with minimal infrastructure | README states the supported runtime and exact commands. |
| Keep secrets out of the repository | Application requires no runtime secrets; ignore environment files and never embed credentials in the static bundle | Check tracked files, output and repository history for accidentally committed credentials before sharing. |
| Submit GitHub link and put supporting material in the repository | Application, tests, note, data report and setup instructions in the repository | Check repository access for the evaluator and verify the supplied link. Hosted demo is optional. |
| User addition: compare suppliers | Required comparison for up to three candidates | Selection limits, accurate values, one-candidate results and edit invalidation pass. |
| User addition: supplier-confirmation checklist | Required contextual questions and report export | Supplier context is correct, local check marks remain separate, and no communication is sent. |
| User constraint: zero project spending | Local open-source tools, browser matching, GitHub Free and free static demo where suitable | No paid account, key, purchase, billable integration or paid deployment is required. |

For implementation, add `.gitignore` immediately and do not create real credential files. If configuration is needed, use non-secret documented build settings only. All static application code is public to site visitors, so never embed tokens. Validate at the form, worker and report-import boundaries and apply file-size and numeric bounds. Render supplied text as text rather than executable markup. Buyer requirements are not sent to any matching backend. These are focused checks supporting the stated functionality and the explicit secret-handling requirement.

## Work deferred beyond the submission

Requirement-change summaries, explicit what-if scenarios and buyer-supplied transit allowances are possible later enhancements. They are excluded from this deadline so the required comparison and confirmation checklist receive implementation and testing time.

Verified per-certificate histories, supplier-confirmed availability and bookings, actual quotes/freight estimates, authenticated organizations and expert-labelled matching evaluation require new data or infrastructure. They are future possibilities, not promises or approved spending. The zero-cost constraint continues to apply unless the user explicitly changes it.

## Delivery schedule

The original schedule below uses IST and starts on 27 October. It allocated approximately 20 hours to implementation, verification and packaging, plus a two-hour final buffer. The two confirmed additions have dedicated time. Current completion status is tracked in the verification notes and submission checklist.

| Time | Work | Completion gate |
| --- | --- | --- |
| 27 Oct, 10 am-1 pm | Scaffold Vite/React application, implement ingestion and quality report; validate static build and free deployment path | All rows accounted for; cleaning decisions reproducible; no paid service required. |
| 27 Oct, 2-6 pm | Implement input validation, eligibility, dates, ranking, and rule tests | Both buyer examples and important boundary cases return explainable results. |
| 27 Oct, 7-10 pm | Connect the worker and main interface, submitted-state handling and no-match states | Reviewer can run both examples end to end; obsolete responses are ignored. |
| 28 Oct, 8-10 am | Build required supplier comparison and contextual confirmation checklist | Both additions function for one to three candidates and invalidate correctly after edits. |
| 28 Oct, 10 am-1 pm | Complete detail view, readable report, export/import and responsive layout | Current results, comparisons and checklist remain tied to the submitted criteria. |
| 28 Oct, 1-4 pm | Run concurrency/browser checks and production-build verification; fix defects | Required flows and documented behavior pass. |
| 28 Oct, 4-6 pm | Finish README, two-page note, quality report, screenshots; verify repository and free Pages demo if suitable | Submission-ready repository by 6 pm with no purchases or paid dependencies. |
| 28 Oct, 6-8 pm | Clean-checkout review, final fixes, and submission buffer | Repository link and all required deliverables ready well before end of day. |

If time slips, simplify styling, animation and report formatting. Keep the core matcher, data handling, date policy, concurrency correctness, supplier comparison, confirmation checklist, explanations, tests and short note. Defer hosting if account access is unavailable; use the documented local submission rather than purchase an alternative.

## Submission contents

- Working static application including comparison and confirmation checklist, original dataset and a reproducible preparation command.
- README with supported Node version, install/run/build/test commands, assumptions, and both buyer examples.
- Short product note addressing audience, design decisions, omissions, success measures, and the deterministic eligibility choice.
- Data-quality report documenting the observed defects and treatment of each class.
- Meaningful automated tests, lockfile, documented local checks and a small optional CI workflow only under the zero-cost policy.
- A few screenshots or a short recorded walkthrough if useful; optional working hosted URL.
- GitHub repository link, and a github.io demo link if deployed. No runtime API keys, paid subscriptions, secrets or undocumented setup prerequisites.

Source files reviewed: `Product_Engineer_Assignment.docx` and `veridia_csv.csv` in the project folder.
