import { describe, expect, it } from 'vitest';
import prepared from '../data/prepared.json';
import { buyerA, buyerB, datasetSchema, POLICY_VERSION } from '../src/lib/schema';
import { match } from '../src/lib/matching/match';
import { runWorkerJob, isCurrentRevision } from '../src/lib/matching/worker-job';
import { canReplay, makeRecord, parseRecord, MAX_REPORT_BYTES } from '../src/lib/reports/record';
import { reportHtml } from '../src/lib/reports/export-html';
const data = datasetSchema.parse(prepared);
const a = buyerA('2026-10-27'), b = buyerB('2026-10-27');
describe('worker boundary and request isolation', () => {
  it('keeps interleaved requests isolated and rejects obsolete results and errors', () => {
    const before = JSON.stringify(data);
    const requests = [a, b, { ...a, quantity: 1 }, b, { ...a, maxLeadDays: 1 }, a];
    const responses = requests.map((requirement, revision) => runWorkerJob(data, { requirement, revision, datasetHash: data.hash, policyVersion: POLICY_VERSION }));
    expect(responses.map(r => r.type === 'result' ? r.result.totals.qualified : -1)).toEqual(requests.map(r => match(data, r).totals.qualified));
    expect(responses[0]).toMatchObject({ revision: 0, type: 'result' });
    expect(isCurrentRevision(5, responses[0])).toBe(false); expect(isCurrentRevision(5, responses[5])).toBe(true);
    expect(isCurrentRevision(5, { revision: 3 })).toBe(false); expect(JSON.stringify(data)).toBe(before);
  });
  it('rejects malformed input and different dataset or policy versions', () => {
    const job = { requirement: a, revision: 5, datasetHash: data.hash, policyVersion: POLICY_VERSION };
    expect(runWorkerJob(data, { ...job, requirement: { ...a, quantity: -1 } }).type).toBe('error');
    expect(runWorkerJob(data, { ...job, datasetHash: '0'.repeat(64) }).type).toBe('error');
    expect(runWorkerJob(data, { ...job, policyVersion: 'unknown' }).type).toBe('error');
    expect(runWorkerJob(data, null)).toMatchObject({ type: 'error', revision: -1 });
  });
});
describe('saved records and safe human-readable reports', () => {
  const result = match(data, b), id = result.qualified[0].supplier.id;
  it('round-trips criteria, explanations, comparison and supplier-specific progress', () => {
    const record = makeRecord(result, [id], { [id]: ['compatibility'] });
    expect(parseRecord(JSON.stringify(record))).toEqual(record);
    expect(record.checklistItems[id][0].text).toContain('stainless steel');
    expect(record.checklistItems[id][0].text).toContain(result.qualified[0].supplier.name);
    expect(canReplay(record, data.hash, data.version)).toBe(true);
    expect(match(data, record.result.requirement)).toEqual(record.result);
    expect(makeRecord(result, [], {}).result).toEqual(record.result);
  });
  it('refuses silent replay against unavailable versions', () => {
    const record = makeRecord(result, [], {});
    expect(canReplay(record, '0'.repeat(64), data.version)).toBe(false);
    expect(canReplay({ ...record, result: { ...record.result, policyVersion: 'v0' } }, data.hash, data.version)).toBe(false);
    expect(canReplay(record, data.hash, 'another-version')).toBe(false);
  });
  it('bounds imports and rejects malformed, inconsistent or unexpected content', () => {
    expect(() => parseRecord('x'.repeat(MAX_REPORT_BYTES + 1))).toThrow('5 MB');
    expect(() => parseRecord('{')).toThrow('valid Veridia report');
    const record = makeRecord(result, [], {});
    expect(() => parseRecord(JSON.stringify({ ...record, injected: 'unexpected' }))).toThrow();
    expect(() => parseRecord(JSON.stringify({ ...record, comparison: [id,id] }))).toThrow();
    expect(() => parseRecord(JSON.stringify({ ...record, checked: { 'not-a-supplier': ['compatibility'] } }))).toThrow();
    expect(() => parseRecord(JSON.stringify({ ...record, checked: { [id]: ['not-an-item'] } }))).toThrow();
    const reservedId = structuredClone(record);
    reservedId.result.qualified[0].supplier.id = 'constructor';
    expect(() => parseRecord(JSON.stringify(reservedId))).toThrow();
  });
  it('escapes supplied text in HTML and preserves decision context', () => {
    const injected = structuredClone(result); injected.requirement.destination = '<script>alert(1)</script>';
    const html = reportHtml(makeRecord(injected, [id], { [id]: ['compatibility'] }));
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;'); expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain(data.hash); expect(html).toContain('2026-10-27'); expect(html).toContain('Selected comparison');
    expect(html).toContain('Supplier-confirmation checklist'); expect(html).toContain('checked=""');
  });
});
