import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import prepared from '../data/prepared.json';
import { buyerA, buyerB, datasetSchema } from '../src/lib/schema';
import { match } from '../src/lib/matching/match';
import { makeRecord, parseRecord, serializeRecord, validateRecord } from '../src/lib/reports/record';
import { DEFAULT_REPORT_OPTIONS, reportCandidates } from '../src/lib/reports/options';
import { reportHtml } from '../src/lib/reports/export-html';
import { CompareTable } from '../src/components/Compare';

const data = datasetSchema.parse(prepared);
const result = match(data, buyerB('2026-10-27'));
const id = result.qualified[0].supplier.id;

describe('saved report integrity regressions', () => {
  it('rejects missing, empty, or duplicate saved questions before the report reaches the interface', () => {
    const record = makeRecord(result, [id], {});
    expect(() => parseRecord(JSON.stringify({ ...record, checklistItems: {} }))).toThrow('valid Veridia report');
    for (const items of [[], [{ id: 'q', text: '' }], [{ id: 'q', text: 'First' }, { id: 'q', text: 'Second' }]]) {
      expect(() => parseRecord(JSON.stringify({ ...record, checklistItems: { ...record.checklistItems, [id]: items } }))).toThrow('valid Veridia report');
    }
    const missingNear = structuredClone(record);
    delete missingNear.checklistItems[result.near[0].supplier.id];
    expect(() => parseRecord(JSON.stringify(missingNear))).toThrow();
  });

  it('rejects identity collisions between near and qualified suppliers', () => {
    const record = makeRecord(result, [], {});
    record.result.near[0].supplier.id = id;
    expect(() => parseRecord(JSON.stringify(record))).toThrow();
  });

  it('preserves historical questions through comparison, edits, HTML, and JSON reopening', () => {
    const record = makeRecord(result, [id], {});
    record.result.policyVersion = 'historical-policy';
    record.checklistItems[id][0].text = 'Please keep this historical confirmation question.';
    const imported = parseRecord(JSON.stringify(record));
    const edited = { ...imported, checked: { [id]: [imported.checklistItems[id][0].id] } };
    const reopened = parseRecord(serializeRecord(edited));
    expect(reopened).toEqual(edited);
    const comparison = renderToStaticMarkup(createElement(CompareTable, { candidates: reopened.result.qualified, requirement: reopened.result.requirement, savedItems: reopened.checklistItems }));
    expect(comparison).toContain('Please keep this historical confirmation question.');
    expect(reportHtml(reopened)).toContain('Please keep this historical confirmation question.');
    expect(reportHtml(reopened)).toContain('checked=""');
  });

  it('validates assembled exports rather than writing a file that cannot reopen', () => {
    const record = makeRecord(result, [id], {});
    record.checked[id] = ['not-in-the-saved-checklist'];
    expect(() => validateRecord(record)).toThrow('incomplete or inconsistent');
    expect(() => serializeRecord(record)).toThrow('incomplete or inconsistent');
    expect(() => reportHtml(record)).toThrow('incomplete or inconsistent');
  });
});

describe('concise report choices', () => {
  const all = match(data, buyerA('2026-10-27'));
  it('defaults to at most three suppliers while the JSON retains the full result', () => {
    const record = makeRecord(all, [], {});
    expect(reportCandidates(record, DEFAULT_REPORT_OPTIONS)).toEqual(all.qualified.slice(0, 3));
    expect((reportHtml(record).match(/class="report-supplier"/g) || [])).toHaveLength(3);
    expect(reportHtml(record)).not.toContain('class="report-appendix"');
    expect(reportHtml(record)).not.toContain('class="report-exclusions"');
    expect(parseRecord(serializeRecord(record)).result.qualified).toHaveLength(33);
  });

  it('uses the chosen suppliers with their original rank and makes the appendix optional', () => {
    const selected = all.qualified[5];
    const record = makeRecord(all, [selected.supplier.id], {});
    expect(reportCandidates(record, DEFAULT_REPORT_OPTIONS)).toEqual([selected]);
    expect(reportHtml(record)).toContain(`6. ${selected.supplier.name}`);
    const full = reportHtml(record, { scope: 'all', includeNear: true });
    expect((full.match(/class="report-supplier"/g) || [])).toHaveLength(33);
    expect(full).toContain('class="report-appendix"');
    expect(full).toContain('class="report-exclusions"');
    expect((full.match(/class="report-near"/g) || [])).toHaveLength(all.near.length);
  });
});
