import { test, expect, type Page } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve, sep, extname } from 'node:path';
import { buyerA, buyerB, POLICY_VERSION } from '../src/lib/schema';
import quality from '../data/quality.json' with { type: 'json' };

async function example(page: Page, buyer: 'A' | 'B' = 'A') {
  await page.goto('/'); await page.getByLabel('Evaluation date').fill('2026-10-27');
  await page.getByRole('button', { name: `Buyer ${buyer}` }).click();
  await expect(page.getByRole('heading', { name: buyer === 'A' ? '33 preliminary matches' : '1 preliminary match', exact: true })).toBeVisible();
}
const cards = (page: Page) => page.getByTestId('supplier-card');
test('examples, evidence, one-supplier comparison and independent checklist progress', async ({ page }) => {
  await example(page, 'A');
  await cards(page).nth(0).getByRole('button', { name: 'Evidence & checklist' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Supplier-confirmation checklist' })).toBeVisible();
  const firstQuestion = dialog.locator('.checklist-item input').first(); await firstQuestion.check();
  await page.getByRole('button', { name: 'Close supplier details' }).click();
  await cards(page).nth(1).getByRole('button', { name: 'Evidence & checklist' }).click();
  await expect(dialog.locator('.checklist-item input').first()).not.toBeChecked();
  await page.keyboard.press('Escape');
  await cards(page).nth(0).getByRole('button', { name: 'Evidence & checklist' }).click();
  await expect(dialog.locator('.checklist-item input').first()).toBeChecked();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Buyer B' }).click();
  await expect(cards(page)).toHaveCount(1); await expect(cards(page).first()).toContainText('VM1006');
  await cards(page).first().getByRole('checkbox').check(); await page.getByRole('button', { name: 'Compare suppliers' }).click();
  await expect(page.getByRole('table')).toContainText('VM1006');
  await expect(page.getByRole('table')).toContainText('1,500 units/month');
});
test('comparison limit, replacement, exact snapshot values and edit invalidation', async ({ page }) => {
  await example(page);
  for (let i = 0; i < 3; i++) await cards(page).nth(i).getByRole('checkbox').check();
  await expect(cards(page).nth(3).getByRole('checkbox')).toBeDisabled();
  await page.getByRole('button', { name: 'Compare suppliers' }).click();
  const firstName = await cards(page).nth(0).getByRole('heading').textContent();
  await expect(page.getByRole('table')).toContainText(firstName!);
  await expect(page.getByRole('table')).toContainText('2026-10-27');
  await page.getByRole('button', { name: `Remove ${firstName} from comparison` }).click();
  await cards(page).nth(3).getByRole('checkbox').check();
  await expect(page.getByText('3 of 3 selected')).toBeVisible();
  await page.getByLabel('Batch quantity', { exact: false }).fill('1200');
  await expect(page.getByText('Results are outdated.', { exact: false })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Selected supplier comparison', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Download JSON' })).toBeDisabled();
  await page.getByRole('button', { name: 'Find manufacturers' }).click();
  await expect(page.getByText('Results are outdated.', { exact: false })).toHaveCount(0);
  await expect(page.getByLabel('Evaluation date')).toHaveValue('2026-10-27');
});
test('unknown comparison evidence remains Unknown, never zero', async ({ page }) => {
  // Import a bounded, explicitly unverified record to exercise an unknown metric in the comparison UI.
  await example(page, 'B');
  await cards(page).first().getByRole('checkbox').check();
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download JSON' }).click()]);
  const record = JSON.parse(await readFile((await download.path())!, 'utf8'));
  record.result.qualified[0].supplier.onTime = null;
  await page.locator('input[type=file]').setInputFiles({ name: 'unknown.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(record)) });
  await expect(page.getByText('Viewing a saved, user-provided record.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Compare suppliers' }).click();
  await expect(page.getByRole('row').filter({ has: page.getByRole('rowheader', { name: 'On-time delivery', exact: true }) })).toContainText('Unknown');
});
test('arrival uncertainty, recurring renewal, validation and empty state', async ({ page }) => {
  await example(page, 'B');
  await page.getByLabel('The deadline means').selectOption('arrival');
  await page.getByText('Recurring orders', { exact: false }).click();
  await page.getByLabel('Expected monthly volume').fill('2500');
  await page.getByLabel('Repeat-order horizon').fill('2030-01-01');
  await page.getByRole('button', { name: 'Find manufacturers' }).click();
  await expect(page.getByText('Production capability matches only.', { exact: false })).toBeVisible();
  await cards(page).first().getByRole('button', { name: 'Evidence & checklist' }).click();
  await expect(page.getByRole('dialog')).toContainText('Repeat-order renewal:');
  await expect(page.getByRole('dialog')).toContainText('freight/transit allowance');
  await expect(page.getByRole('dialog')).toContainText('exceeds listed nominal capacity');
  await page.keyboard.press('Escape');
  await page.getByLabel('Batch quantity').fill('1.5'); await page.getByRole('button', { name: 'Find manufacturers' }).click();
  await expect(page.getByText('Use a whole number from 1 to 1,000,000,000.')).toBeVisible();
  await page.getByLabel('Batch quantity').fill('1500'); await page.getByLabel('Requested arrival window').fill('1');
  await page.getByRole('button', { name: 'Find manufacturers' }).click();
  await expect(page.getByRole('heading', { name: 'No manufacturer meets every requirement.' })).toBeVisible();
  await page.getByText('Near matches & exclusions', { exact: false }).click();
  await expect(page.locator('.near-card').first()).toBeVisible();
});
test('saved JSON and HTML retain context; replay, mismatch and malformed files are explicit', async ({ page }) => {
  await example(page, 'B');
  await cards(page).first().getByRole('checkbox').check();
  await cards(page).first().getByRole('button', { name: 'Evidence & checklist' }).click();
  await page.getByRole('dialog').locator('.checklist-item input').first().check(); await page.keyboard.press('Escape');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download JSON' }).click()]);
  const buffer = await readFile((await download.path())!); const record = JSON.parse(buffer.toString());
  expect(record.comparison).toEqual(['VM1006']); expect(record.checked.VM1006).toEqual(['compatibility']);
  await page.getByRole('button', { name: 'Print report', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Selected comparison' })).toBeVisible();
  await page.emulateMedia({ media: 'print' });
  await expect(page.getByRole('button', { name: 'Back to matching', exact: false })).toBeHidden();
  await mkdir('.tmp', { recursive: true });
  await page.pdf({ path: '.tmp/report-print-check.pdf', format: 'A4', printBackground: true });
  await page.emulateMedia({ media: 'screen' }); await page.getByRole('button', { name: 'Back to matching', exact: false }).click();
  const [html] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Save readable HTML' }).click()]);
  expect(await readFile((await html.path())!, 'utf8')).toContain('VM1006');
  await page.locator('input[type=file]').setInputFiles({ name: 'record.json', mimeType: 'application/json', buffer });
  await expect(page.getByText('Viewing a saved, user-provided record.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Recalculate & verify replay' }).click();
  await expect(page.getByText('Replay verified:', { exact: false })).toBeVisible();
  record.result.policyVersion = 'unavailable';
  await page.locator('input[type=file]').setInputFiles({ name: 'old.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(record)) });
  await expect(page.getByText('Replay unavailable:', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Recalculate & verify replay' })).toHaveCount(0);
  await page.locator('input[type=file]').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{}') });
  await expect(page.getByText('This file is not a valid Veridia report.', { exact: false })).toBeVisible();
});
test('two independent browser contexts stay isolated', async ({ browser }) => {
  const contextA = await browser.newContext(), contextB = await browser.newContext();
  try {
    const pageA = await contextA.newPage(), pageB = await contextB.newPage();
    await Promise.all([example(pageA, 'A'), example(pageB, 'B')]);
    await cards(pageA).first().getByRole('checkbox').check();
    await expect(cards(pageB).first().getByRole('checkbox')).not.toBeChecked();
    await pageA.getByLabel('Batch quantity').fill('5000');
    await expect(pageB.getByRole('heading', { name: '1 preliminary match', exact: true })).toBeVisible();
    await expect(pageB.getByLabel('Batch quantity')).toHaveValue('1500');
  } finally { await contextA.close(); await contextB.close(); }
});
test('delayed old worker results and errors cannot overwrite newer requests or edits', async ({ page }) => {
  await page.addInitScript(() => {
    const NativeWorker = window.Worker; let seen = 0;
    window.Worker = new Proxy(NativeWorker, {
      construct(Target, args: [string | URL, WorkerOptions?]) {
        const real = new Target(...args);
        return new Proxy(real, {
          get(target, key) { const value = Reflect.get(target, key, target); return typeof value === 'function' ? value.bind(target) : value; },
          set(target, key, handler) {
            if (key === 'onmessage') { target.onmessage = event => { seen += 1; if (seen === 1) { setTimeout(() => { handler.call(target, event); handler.call(target, { data: { type: 'error', revision: event.data.revision, message: 'obsolete test error' } }); }, 800); } else handler.call(target, event); }; return true; }
            return Reflect.set(target, key, handler, target);
          },
        });
      },
    });
  });
  await page.goto('/'); await page.getByLabel('Evaluation date').fill('2026-10-27');
  await page.getByRole('button', { name: 'Buyer A' }).click();
  await page.getByRole('button', { name: 'Buyer B' }).click();
  await expect(page.getByRole('heading', { name: '1 preliminary match', exact: true })).toBeVisible();
  // Wait beyond the deliberately delayed response; this is a race assertion, not a loading workaround.
  await page.waitForTimeout(950);
  await expect(page.getByRole('heading', { name: '1 preliminary match', exact: true })).toBeVisible();
  await expect(page.getByText('obsolete test error')).toHaveCount(0);
});
test('real worker jobs interleave safely and return reproducible results', async ({ page }) => {
  await example(page);
  const workerUrl = page.workers()[0].url();
  const requests = [buyerA('2026-10-27'), buyerB('2026-10-27'), { ...buyerA('2026-10-27'), maxLeadDays: 1 }];
  const output = await page.evaluate(async ({ url, requests, hash, policy }) => {
    const workers = [new Worker(url, { type: 'module' }), new Worker(url, { type: 'module' })];
    const start = performance.now();
    const results: { worker: number; revision: number; count: number; type: string }[] = [];
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Worker integration timeout')), 10000);
      workers.forEach((worker, workerIndex) => {
        worker.onerror = reject;
        worker.onmessage = event => { results.push({ worker: workerIndex, revision: event.data.revision, count: event.data.result?.totals.qualified, type: event.data.type }); if (results.length === 6) { clearTimeout(timer); resolve(); } };
      });
      requests.forEach((requirement, revision) => workers.forEach(worker => worker.postMessage({ requirement, revision, datasetHash: hash, policyVersion: policy })));
    });
    workers.forEach(w => w.terminate()); return { results, durationMs: performance.now() - start };
  }, { url: workerUrl, requests, hash: quality.hash, policy: POLICY_VERSION });
  for (const item of output.results) { expect(item.type).toBe('result'); expect(item.count).toBe([33,1,0][item.revision]); }
  console.log(`Six jobs / two fresh workers, including startup: ${output.durationMs.toFixed(1)} ms`);
  const warm = await page.evaluate(async ({ url, requests, hash, policy }) => {
    const w = new Worker(url, { type: 'module' });
    const one = (revision: number) => new Promise<number>((resolve, reject) => {
      const start = performance.now(); const timer = setTimeout(() => reject(new Error('Warm worker timeout')), 10000);
      w.onerror = reject; w.onmessage = event => { clearTimeout(timer); if (event.data.type !== 'result') reject(new Error('Worker did not return a result')); else resolve(performance.now() - start); };
      w.postMessage({ requirement: requests[revision % 2], revision, datasetHash: hash, policyVersion: policy });
    });
    try { await one(0); const durations: number[] = []; for (let i = 1; i <= 20; i++) durations.push(await one(i)); return durations.sort((a,b) => a-b); } finally { w.terminate(); }
  }, { url: workerUrl, requests, hash: quality.hash, policy: POLICY_VERSION });
  await writeFile('docs/browser-benchmark.json', JSON.stringify({ freshSixJobsTwoWorkersMs: Number(output.durationMs.toFixed(2)), warmSamples: warm.length, warmP50Ms: Number(warm[9].toFixed(2)), warmP95Ms: Number(warm[18].toFixed(2)), scope: 'Browser worker request/response including transfer; excludes UI rendering. Fresh batch includes startup; warm timings exclude startup.' }, null, 2));
});
test('matching works offline after assets load and uses no external runtime calls', async ({ page, context }) => {
  const external: string[] = []; page.on('request', request => { if (!request.url().startsWith('http://127.0.0.1:4173/') && !request.url().startsWith('blob:')) external.push(request.url()); });
  await example(page, 'A'); await context.setOffline(true);
  await page.getByRole('button', { name: 'Buyer B' }).click();
  await expect(page.getByRole('heading', { name: '1 preliminary match', exact: true })).toBeVisible();
  expect(external).toEqual([]);
});
test('worker-load failure has a readable retry path', async ({ page }) => {
  await page.route('**/*worker*.js', route => route.abort());
  await page.goto('/'); await page.getByRole('button', { name: 'Buyer A' }).click();
  await expect(page.getByText('The matching worker could not load', { exact: false })).toBeVisible();
  await page.unroute('**/*worker*.js'); await page.getByRole('button', { name: 'Retry matching' }).click();
  await expect(cards(page).first()).toBeVisible();
});
test('keyboard access, responsive layout and submission screenshots', async ({ page }) => {
  await page.goto('/'); await page.keyboard.press('Tab'); await expect(page.getByRole('link', { name: 'Skip to results' })).toBeFocused();
  await page.getByRole('heading', { level: 1 }).click();
  await mkdir('docs/screenshots', { recursive: true });
  await page.screenshot({ path: 'docs/screenshots/01-start.png', fullPage: true });
  await example(page, 'A'); await page.evaluate(() => window.scrollTo(0, 0)); await page.screenshot({ path: 'docs/screenshots/02-shortlist.png' });
  await cards(page).first().getByRole('button', { name: 'Evidence & checklist' }).click();
  await expect(page.getByRole('dialog')).toBeVisible(); await page.screenshot({ path: 'docs/screenshots/03-evidence.png' });
  await page.getByRole('dialog').locator('.checklist').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'docs/screenshots/05-checklist.png' });
  await page.keyboard.press('Escape'); await expect(cards(page).first().getByRole('button', { name: 'Evidence & checklist' })).toBeFocused();
  for (let i = 0; i < 3; i++) await cards(page).nth(i).getByRole('checkbox').check();
  await expect(page.getByRole('button', { name: 'Compare suppliers' })).toBeInViewport();
  await page.getByRole('button', { name: 'Compare suppliers' }).click();
  await page.screenshot({ path: 'docs/screenshots/06-comparison.png' });
  await page.getByRole('button', { name: 'Clear selection' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Find manufacturers' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await cards(page).first().getByRole('checkbox').check(); await page.getByRole('button', { name: 'Compare suppliers' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.locator('#results').evaluate(el => el.scrollIntoView({ block: 'start' }));
  await page.screenshot({ path: 'docs/screenshots/04-mobile.png' });
  await writeFile('test-results/browser-checks.json', JSON.stringify({ browser: 'Chromium', mobileViewport: '390x844', checkedAt: new Date().toISOString() }, null, 2));
});

test('static assets and matching work under a repository subpath', async ({ page }) => {
  const distRoot = resolve('dist');
  const server = createServer(async (req, res) => {
    try {
      const pathname = new URL(req.url || '/', 'http://localhost').pathname;
      if (!pathname.startsWith('/veridia-review/')) { res.writeHead(404); res.end(); return; }
      const path = resolve(distRoot, decodeURIComponent(pathname.slice('/veridia-review/'.length)) || 'index.html');
      if (!path.startsWith(distRoot + sep)) { res.writeHead(400); res.end(); return; }
      const types: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
      const content = await readFile(path); res.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream' }); res.end(content);
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address(); if (!address || typeof address === 'string') throw new Error('Missing test-server port');
    await page.goto(`http://127.0.0.1:${address.port}/veridia-review/`);
    await page.getByLabel('Evaluation date').fill('2026-10-27'); await page.getByRole('button', { name: 'Buyer B' }).click();
    await expect(page.getByRole('heading', { name: '1 preliminary match', exact: true })).toBeVisible();
    await expect(cards(page).first()).toContainText('VM1006');
  } finally { server.closeAllConnections(); await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
});
