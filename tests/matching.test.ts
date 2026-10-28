import { describe, expect, it } from 'vitest';
import prepared from '../data/prepared.json';
import { buyerA, buyerB, datasetSchema, requirementSchema, type Candidate, type Manufacturer, type Requirement } from '../src/lib/schema';
import { addDays, compareCandidates, evaluateSupplier, match } from '../src/lib/matching/match';
import { checklist } from '../src/lib/matching/checklist';
const data = datasetSchema.parse(prepared);
const r = buyerA('2026-10-27');
const fixture = (patch: Partial<Manufacturer> = {}): Manufacturer => ({ ...data.records[0], id: 'TEST001', name: 'Test manufacturer', quarantined: false, issues: [], status: 'active', processes: ['CNC milling', 'CNC turning'], materials: ['aluminium'], certificates: ['ISO 9001'], minQty: 100, maxQty: 5000, leadDays: 42, expiry: '2026-12-08', onTime: 95, capacity: 1500, exportYears: 5, ...patch });
const evaluate = (patch: Partial<Manufacturer> = {}, request: Requirement = r) => evaluateSupplier(fixture(patch), request);

describe('assignment regression and independent hard-rule checks', () => {
  it('reproduces 33 Buyer A candidates and only VM1006 for Buyer B', () => {
    const a = match(data, r), b = match(data, buyerB(r.asOfDate));
    expect(a.qualified).toHaveLength(33); expect(b.qualified.map(c => c.supplier.id)).toEqual(['VM1006']);
    expect(a.qualified.some(c => c.supplier.id === 'VM1006')).toBe(true);
    expect(b.qualified[0].supplier.capacity).toBe(1500);
  });
  it('every recommended supplier independently satisfies all source conditions', () => {
    for (const requirement of [r, buyerB(r.asOfDate), { ...r, quantity: 2500, certificates: [] }]) {
      const result = match(data, requirement);
      for (const c of result.qualified) {
        const s = c.supplier;
        expect(s.quarantined).toBe(false); expect(s.status).toBe('active');
        expect(s.materials).toContain(requirement.material);
        expect(requirement.processes.every(p => p === 'CNC machining' ? s.processes.some(v => ['CNC milling', 'CNC turning'].includes(v)) : s.processes.includes(p))).toBe(true);
        expect(requirement.quantity >= s.minQty && requirement.quantity <= s.maxQty).toBe(true);
        expect(s.leadDays !== null && s.leadDays <= requirement.maxLeadDays).toBe(true);
        expect(requirement.certificates.every(cert => s.certificates.includes(cert))).toBe(true);
        if (requirement.certificates.length) expect(s.expiry! >= addDays(requirement.asOfDate, s.leadDays!)).toBe(true);
      }
    }
  });
  it('is deterministic, conserves row totals and never mutates the snapshot', () => {
    const before = JSON.stringify(data);
    expect(match(data, r)).toEqual(match(data, r));
    const totals = match(data, r).totals;
    expect(totals.qualified + totals.needsConfirmation + totals.excluded).toBe(totals.evaluated);
    expect(JSON.stringify(data)).toBe(before);
  });
});
describe('input boundaries', () => {
  it.each([0, -1, 1.5, NaN, Infinity, 1_000_000_001])('rejects invalid quantity %s', quantity => expect(requirementSchema.safeParse({ ...r, quantity }).success).toBe(false));
  it.each([1, 1_000_000_000])('accepts input bounds %s', quantity => expect(requirementSchema.safeParse({ ...r, quantity }).success).toBe(true));
  it.each(['2026-02-30', '2026-1-2', '', '1999-12-31', '2101-01-01'])('rejects invalid date %s', asOfDate => expect(requirementSchema.safeParse({ ...r, asOfDate }).success).toBe(false));
  it('accepts aluminum alias, rejects unsupported capability and missing selection', () => {
    expect(requirementSchema.parse({ ...r, material: 'aluminum' }).material).toBe('aluminium');
    expect(requirementSchema.safeParse({ ...r, material: 'unobtanium' }).success).toBe(false);
    expect(requirementSchema.safeParse({ ...r, processes: [] }).success).toBe(false);
    expect(requirementSchema.safeParse({ ...r, certificates: undefined }).success).toBe(false);
    expect(requirementSchema.safeParse({ ...r, certificates: [] }).success).toBe(true);
    expect(requirementSchema.safeParse({ ...r, repeatUntil: '2026-10-26' }).success).toBe(false);
    expect(requirementSchema.safeParse({ ...r, monthlyVolume: 1.5 }).success).toBe(false);
  });
});
describe('eligibility and dates', () => {
  it.each([100, 5000])('includes exact quantity boundary %s', quantity => expect(evaluate({}, { ...r, quantity }).eligibility).toBe('qualifies'));
  it.each([99, 5001])('excludes outside range %s', quantity => expect(evaluate({}, { ...r, quantity }).eligibility).toBe('excluded'));
  it('requires all selected operations but either operation for the CNC group', () => {
    expect(evaluate({ processes: ['CNC turning'] }).eligibility).toBe('qualifies');
    expect(evaluate({ processes: ['CNC turning'] }, { ...r, processes: ['CNC milling', 'CNC turning'] }).eligibility).toBe('excluded');
  });
  it('checks expiry inclusively at completion, not just on evaluation day', () => {
    expect(evaluate({ expiry: '2026-10-26' }).eligibility).toBe('excluded');
    expect(evaluate({ expiry: '2026-10-27' }).eligibility).toBe('excluded');
    expect(evaluate({ expiry: '2026-12-07' }).eligibility).toBe('excluded');
    expect(evaluate({ expiry: '2026-12-08' }).eligibility).toBe('qualifies');
    expect(evaluate({ expiry: '2026-12-09' }).eligibility).toBe('qualifies');
  });
  it('uses UTC days over month, year and leap-day boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2028-02-28', 2)).toBe('2028-03-01');
  });
  it('does not filter certificate dates when none are requested', () => expect(evaluate({ certificates: [], expiry: null }, { ...r, certificates: [] }).eligibility).toBe('qualifies'));
  it('keeps unknown timing separate and does not reward other good data', () => {
    expect(evaluate({ leadDays: null, onTime: 100 }).eligibility).toBe('needs-confirmation');
    expect(evaluate({ leadDays: 43, onTime: 100 }).eligibility).toBe('excluded');
    expect(evaluate({ expiry: null }).eligibility).toBe('needs-confirmation');
    expect(evaluate({ materials: ['copper'], onTime: 100 }).eligibility).toBe('excluded');
    expect(evaluate({ quarantined: true }).eligibility).toBe('excluded');
    expect(evaluate({ status: 'inactive' }).eligibility).toBe('excluded');
  });
  it('never silently relaxes an impossible deadline and labels near-match failures', () => {
    const result = match(data, { ...r, maxLeadDays: 1 });
    expect(result.qualified).toHaveLength(0); expect(result.near.length).toBeGreaterThan(0);
    expect(result.near.every(c => c.checks.some(k => k.status !== 'pass'))).toBe(true);
    expect(result.near.some(c => c.supplier.quarantined)).toBe(false);
  });
});
describe('ranking, recurring orders and contextual questions', () => {
  const candidate = (patch: Partial<Manufacturer>): Candidate => evaluate(patch);
  it('uses timing, valid delivery, export and ID tie breaks in that order', () => {
    const candidates = [candidate({ id: 'C', onTime: null }), candidate({ id: 'B', onTime: 90, exportYears: 7 }), candidate({ id: 'A', onTime: 90, exportYears: 7 }), candidate({ id: 'D', onTime: 95 }), candidate({ id: 'E', leadDays: 14, onTime: 10 })];
    expect(candidates.sort(compareCandidates).map(c => c.supplier.id)).toEqual(['E','D','A','B','C']);
  });
  it('qualifies the first batch but warns about renewal and nominal monthly capacity', () => {
    const request = { ...r, monthlyVolume: 2500, repeatUntil: '2027-10-27' };
    const result = evaluate({}, request);
    expect(result.eligibility).toBe('qualifies');
    expect(result.warnings.some(w => w.includes('Repeat-order renewal'))).toBe(true);
    expect(result.warnings.some(w => w.includes('exceeds listed nominal capacity'))).toBe(true);
    const questions = checklist(result, request).map(i => i.text).join(' ');
    expect(questions).toContain('renewal'); expect(questions).toContain('2,500'); expect(questions).toContain('1,000');
    expect(questions).toContain('Test manufacturer');
  });
  it('makes arrival uncertainty and missing evidence explicit', () => {
    const request: Requirement = { ...r, deadlineMeaning: 'arrival' };
    const result = evaluate({ leadDays: null, onTime: null }, request);
    const items = checklist(result, request);
    expect(items.map(i => i.id)).toContain('lead-time'); expect(items.map(i => i.id)).toContain('delivery-history');
    expect(items.find(i => i.id === 'arrival')?.text).toContain('Germany');
    expect(result.warnings.join(' ')).toContain('Arrival in Germany is unconfirmed');
    expect(checklist(evaluate(), r).map(i => i.id)).not.toContain('arrival');
  });
});
