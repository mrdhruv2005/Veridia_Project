import { test, expect, type Page } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';

const cards = (page: Page) => page.getByTestId('supplier-card');
async function example(page: Page, buyer = 'B') {
  await page.goto('/');
  await page.getByLabel('Evaluation date').fill('2026-10-27');
  await page.getByRole('button', { name: `Buyer ${buyer}` }).click();
  await expect(page.getByRole('heading', { name: buyer === 'B' ? '1 preliminary match' : '33 preliminary matches', exact: true })).toBeVisible();
}
async function downloadRecord(page: Page) {
  const [file] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download JSON' }).click()]);
  return JSON.parse(await readFile((await file.path())!, 'utf8'));
}
async function importRecord(page: Page, record: unknown) {
  await page.locator('input[type=file]').setInputFiles({ name: 'review.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(record)) });
}

test('incomplete checklists are rejected and valid imported edits reopen safely', async ({ page }) => {
  await example(page);
  const record = await downloadRecord(page);
  await importRecord(page, { ...record, checklistItems: {} });
  await expect(page.getByRole('alert')).toContainText('not a valid Veridia report');
  await importRecord(page, record);
  await cards(page).first().getByRole('button', { name: 'Evidence & checklist' }).click();
  await page.getByRole('dialog').locator('.checklist-item input').first().check();
  await page.keyboard.press('Escape');
  const edited = await downloadRecord(page);
  await importRecord(page, edited);
  await cards(page).first().getByRole('button', { name: 'Evidence & checklist' }).click();
  await expect(page.getByRole('dialog').locator('.checklist-item input').first()).toBeChecked();
});

test('saved wording and review progress survive identical replay and matching', async ({ page }) => {
  await example(page);
  const record = await downloadRecord(page);
  record.comparison = ['VM1006'];
  record.checked.VM1006 = ['compatibility'];
  record.checklistItems.VM1006[0].text = 'Historical question: confirm the exact drawing revision.';
  await importRecord(page, record);
  await page.getByRole('button', { name: 'Compare suppliers' }).click();
  await expect(page.getByRole('table')).toContainText('Historical question: confirm the exact drawing revision.');
  await page.getByRole('button', { name: 'Recalculate & verify replay' }).click();
  await expect(page.getByText('Replay verified:', { exact: false })).toBeVisible();
  await expect(cards(page).first().getByRole('checkbox')).toBeChecked();
  await cards(page).first().getByRole('button', { name: 'Evidence & checklist' }).click();
  await expect(page.getByRole('dialog').getByRole('checkbox', { name: 'Historical question: confirm the exact drawing revision.' })).toBeChecked();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Find manufacturers' }).click();
  await expect(page.getByText('The results are unchanged.', { exact: false })).toBeVisible();
  const repeated = await downloadRecord(page);
  expect(repeated.checked.VM1006).toEqual(['compatibility']);
  expect(repeated.comparison).toEqual(['VM1006']);
  expect(repeated.checklistItems.VM1006[0].text).toContain('Historical question');
});

test('a replay mismatch clears progress instead of attaching it to changed evidence', async ({ page }) => {
  await example(page);
  const record = await downloadRecord(page);
  record.comparison = ['VM1006'];
  record.checked.VM1006 = ['compatibility'];
  record.result.qualified[0].supplier.onTime = null;
  await importRecord(page, record);
  await page.getByRole('button', { name: 'Recalculate & verify replay' }).click();
  await expect(page.getByText('The imported results differ;', { exact: false })).toBeVisible();
  const recalculated = await downloadRecord(page);
  expect(recalculated.comparison).toEqual([]);
  expect(recalculated.checked).toEqual({});
  expect(recalculated.result.qualified[0].supplier.onTime).toBe(92.3);
});

test('report options control preview and downloaded HTML while JSON stays complete', async ({ page }) => {
  await example(page, 'A');
  await cards(page).nth(5).getByRole('checkbox').check();
  const selectedName = await cards(page).nth(5).getByRole('heading').innerText();
  await page.getByRole('button', { name: 'Print report', exact: true }).click();
  await expect(page.locator('.report-supplier')).toHaveCount(1);
  await expect(page.locator('.report-supplier h2')).toHaveText(`6. ${selectedName}`);
  await expect(page.locator('.report-appendix')).toHaveCount(0);
  await page.getByLabel('Suppliers in report').selectOption('all');
  await page.getByLabel('Include near-match appendix').check();
  await expect(page.locator('.report-supplier')).toHaveCount(33);
  await expect(page.locator('.report-near')).toHaveCount(12);
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download HTML' }).click()]);
  const html = await readFile((await download.path())!, 'utf8');
  expect((html.match(/class="report-supplier"/g) || [])).toHaveLength(33);
  expect(html).toContain('class="report-appendix"');
  await page.getByRole('button', { name: 'Back to matching', exact: false }).click();
  expect((await downloadRecord(page)).result.qualified).toHaveLength(33);
});

test('mobile results receive focus, errors identify the first invalid control, and narrow layouts fit', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await example(page);
  await expect(page.locator('#results')).toBeFocused();
  await expect(page.getByRole('heading', { name: '1 preliminary match', exact: true })).toBeInViewport();
  await expect(page.getByTestId('matching-announcement')).toContainText('Matching complete. 1 preliminary match.');
  for (const width of [320, 390, 640, 768, 1024]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow at width ${width}`).toBe(true);
  }
  await page.getByLabel('Batch quantity').fill('0');
  await page.getByRole('button', { name: 'Find manufacturers' }).click();
  await expect(page.getByLabel('Batch quantity')).toBeFocused();
  await expect(page.getByLabel('Batch quantity')).toHaveAttribute('aria-describedby', 'quantity-error');
  await page.getByLabel('sheet metal', { exact: true }).uncheck();
  await page.getByRole('button', { name: 'Find manufacturers' }).click();
  await expect(page.getByLabel('CNC machining', { exact: true })).toBeFocused();
  await page.getByLabel('sheet metal', { exact: true }).check();
  await page.getByLabel('Batch quantity').fill('1500');
  await page.getByText('Recurring orders', { exact: false }).click();
  await page.getByLabel('Expected monthly volume').fill('0');
  await page.getByText('Recurring orders', { exact: false }).click();
  await page.getByRole('button', { name: 'Find manufacturers' }).click();
  await expect(page.getByLabel('Expected monthly volume')).toBeFocused();
  await expect(page.locator('details.recurring')).toHaveAttribute('open', '');
});

test('matching completion does not steal focus after the buyer starts editing', async ({ page }) => {
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    window.Worker = new Proxy(NativeWorker, {
      construct(Target, args: [string | URL, WorkerOptions?]) {
        const worker = new Target(...args);
        return new Proxy(worker, {
          get(target, key) { const value = Reflect.get(target, key, target); return typeof value === 'function' ? value.bind(target) : value; },
          set(target, key, handler) {
            if (key === 'onmessage') { target.onmessage = event => setTimeout(() => handler.call(target, event), 700); return true; }
            return Reflect.set(target, key, handler, target);
          },
        });
      },
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Buyer B' }).click();
  await page.getByLabel('Batch quantity').fill('1600');
  await page.waitForTimeout(1100); // Wait beyond the deliberately delayed obsolete response.
  await expect(page.getByLabel('Batch quantity')).toBeFocused();
  await expect(page.getByTestId('matching-announcement')).toHaveText('');
  await expect(cards(page)).toHaveCount(0);
});

test('small evidence text meets contrast targets and short print output hides controls', async ({ page }) => {
  await example(page);
  const contrast = await page.evaluate(() => {
    const luminance = (color: string) => {
      const rgb = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
      return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
    };
    return ['.supplier-meta', '.supplier-heading p span', 'footer small', '.rank'].map(selector => {
      const element = document.querySelector(selector)!;
      let background: Element | null = element;
      while (background && getComputedStyle(background).backgroundColor === 'rgba(0, 0, 0, 0)') background = background.parentElement;
      const fg = luminance(getComputedStyle(element).color), bg = luminance(background ? getComputedStyle(background).backgroundColor : 'rgb(255,255,255)');
      return { selector, ratio: (Math.max(fg, bg) + .05) / (Math.min(fg, bg) + .05) };
    });
  });
  for (const sample of contrast) expect(sample.ratio, sample.selector).toBeGreaterThanOrEqual(4.5);
  await cards(page).first().getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Print report', exact: true }).click();
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.report-toolbar')).toBeHidden();
  await expect(page.locator('.report-appendix')).toHaveCount(0);
  await mkdir('.tmp', { recursive: true });
  await page.pdf({ path: '.tmp/report-short-check.pdf', format: 'A4', printBackground: true });
});
