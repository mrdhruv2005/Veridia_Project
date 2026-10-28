# Local verification

## 28 October audit fixes

The saved-record validation, preserved report wording, unchanged-replay progress, accessible result feedback, and concise report options are implemented. The D-drive installation setup is retained at the user's request. See [audit fixes](audit-fixes-2026-10-28.md) for the changes and regression coverage.

The assignment short note is available as [a two-page PDF](product-note.pdf) and [matching Markdown](product-note.md). It was checked against the original brief for audience, design choices, omissions, success measures and a defended trade-off, including the certificate timing and simultaneous-buyer cases. Both PDF pages were rendered and visually checked.

For the updated source, ESLint, TypeScript, all **47 unit tests** on Vitest **4.1.12**, and the production build passed. The final report adjustment also passed all 12 affected report/worker unit tests and a production rebuild.

The user ran all **19 Chromium browser tests successfully** in normal PowerShell, followed by three passing focused report checks after print refinements. Browser execution uses that terminal because this task shell returns `spawn EPERM`. Six regenerated desktop/mobile screenshots were visually inspected. The last concise-print check remains pending.

The user applied compatible dependency fixes in normal PowerShell and ran a network-enabled `npm audit`: **0 vulnerabilities**. Vitest and seven supporting packages are locked to **4.1.12**; the minimum Vitest manifest range is `^4.1.12`. The final source/build scan found no common private-key or GitHub, AWS or OpenAI secret signatures.

Git is initialized on `main`, but no project commit or push has occurred. The new public repository URL is still needed. The task cannot write Git metadata or reach GitHub through its proxy; `scripts/Publish-Repository.ps1` is ready for normal PowerShell with author `mrdhruv2005` and the existing email. Publication and public-access verification remain pending.

## Historical checks from 27 October

Executed checks from 27 October 2026. Additional project spending: **₹0**. Full sanitized command output is retained in `docs/check-output.txt`.

## Current execution status

- D-drive workspace verified as `D:\Project` before attempted installation.
- Node 24.15.0 and npm 11.12.1 detected; Node/npm executables are on D:.
- All project caches and temporary paths configured under D: by `scripts/Use-DDrive.ps1`.
- Dependencies and Playwright Chromium installed by the user in normal PowerShell, under D:. The lockfile records exact versions.
- Data preparation: passed; all 1,000 rows reconciled, 980 retained and 20 quarantined. The independent PowerShell source audit also reproduced 33 Buyer A matches and VM1006 alone for Buyer B.
- Unit tests: **41 passed** across data, matching, report and worker-boundary suites.
- TypeScript: passed. ESLint: passed with zero errors or warnings.
- Production build: passed with Vite 8.3.5. Relative asset paths support a repository subpath.
- Browser suite: **12 tests passed** on the production build, using Playwright 1.64.1 and its Chromium browser. Includes comparison, checklists, replay, independent sessions, obsolete responses, real workers, offline matching, keyboard/mobile behavior and the `/veridia-review/` repository subpath.
- Clean-copy verification: **passed**. `scripts/Verify-CleanCopy.ps1` created `D:\Project\.tmp\clean-review-20261027-103314`; `npm ci` installed 217 packages, then the complete `npm run check` passed. The browser result records `status: passed` and no failed tests. All 37 checked application/configuration/script/test/dataset files matched the original project by SHA-256 at that point.
- Visual review: six desktop/mobile screenshots inspected, including persistent comparison controls, supplier evidence, contextual questions and three-supplier comparison.
- Print verification: the generated 15-page A4 report was rendered with Poppler and visually reviewed. A final report-only page-break/background correction was followed by six passing report/worker unit tests, a successful production build and a passing focused browser report scenario (10.5 seconds). The corrected pages retain the comparison and buyer check marks without clipping or the orphaned section heading.
- Secret scan: no common private-key, OpenAI, GitHub or AWS secret-token patterns found in source or built output. No runtime credentials are required.
- GitHub repository and optional Pages deployment: pending user-provided repository details and sharing decision.

The clean installer emitted an upstream support notice for the pinned ESLint 9 development tool; installation and lint completed successfully. Browser execution used normal PowerShell because the restricted task shell prevents child-process launch (`spawn EPERM`). The agent inspected saved logs and screenshots and ran preparation, type checking, lint, unit tests and builds directly. The final print correction changed only the report section class and print CSS after the clean-copy pass.

## Reproduce

```powershell
. .\scripts\Use-DDrive.ps1
npm.cmd run data:prepare
npm.cmd run check
```

The suite covers data reconciliation, input and eligibility boundaries, dates, deterministic ranking, both buyer examples, recurring orders, contextual questions, report schema/escaping/replay, worker validation, independent browser contexts, stale-response rejection, comparison selection/replacement, local checklist scope, print layout, mobile width, retry errors and offline matching after assets load.

## Limits

Pure matching benchmark: 100 alternating Buyer A/B runs after 10 warmups, Node 24.15.0 on Intel Core i5-6200U. Median **20.12 ms**, p95 **40.60 ms**, maximum **64.27 ms**. This excludes data preparation, worker startup/transfer and rendering; see `docs/benchmark.json`. Browser timing is tracked separately.

The final browser run processed six interleaved jobs across two fresh workers in **745.20 ms**, including startup. Across 20 warm browser-worker requests, median response time was **119.70 ms** and p95 **182.80 ms**, including transfer but excluding UI rendering. See `docs/browser-benchmark.json`. These are local measurements affected by machine load, not throughput or unlimited-scale evidence.

Chromium browser checks are local functional checks; they do not establish compatibility with every browser or screen reader. No live supplier information or certificate authenticity is verified. Concurrency checks demonstrate isolation for the exercised sessions, not unlimited scale. Public hosting and repository access can be verified only after a repository is supplied and publishing is authorized.
