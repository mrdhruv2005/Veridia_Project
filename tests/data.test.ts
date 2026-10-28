import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import Papa from 'papaparse';
import { describe, expect, it } from 'vitest';
import { normalizeCsv } from '../src/lib/data/normalize';
import prepared from '../data/prepared.json';
const csv = readFileSync(new URL('../veridia_csv.csv', import.meta.url), 'utf8');
const hash = createHash('sha256').update(csv).digest('hex');
const data = normalizeCsv(csv, hash);
const rows = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true }).data;
const synthetic = (patch: Record<string, string>) => normalizeCsv(Papa.unparse([{ ...rows[0], ...patch }]), '0'.repeat(64));
describe('normalization and provenance', () => {
  it('reconciles every source row and reproducibly regenerates the prepared snapshot', () => {
    expect(data).toEqual(prepared); expect(data.quality.total).toBe(1000); expect(data.quality.retained).toBe(980); expect(data.quality.quarantined).toBe(20);
    expect(data.quality.counts).toEqual({ identity_conflict: 20, missing_lead_time: 10, invalid_delivery_history: 10 });
    expect(data.records[0].sourceRow).toBe(2); expect(data.records.at(-1)?.sourceRow).toBe(1001);
    expect(data.records[0].raw.full_address).toBe('Chennai, Tamil Nadu, India');
  });
  it('quarantines all occurrences of ten conflicting IDs and preserves distinct records', () => {
    const conflicts = data.records.filter(r => r.quarantined);
    expect(new Set(conflicts.map(r => r.id)).size).toBe(10);
    for (const id of new Set(conflicts.map(r => r.id))) {
      const pair = conflicts.filter(r => r.id === id);
      expect(pair).toHaveLength(2); expect(pair[0].name).not.toBe(pair[1].name);
    }
  });
  it('retains impossible raw metrics, normalizes to null and derives missing timing safely', () => {
    const invalid = data.records.filter(r => r.issues.some(i => i.code === 'invalid_delivery_history'));
    expect(invalid).toHaveLength(10);
    expect(invalid.every(r => Number(r.raw.on_time_delivery_pct) > 100 && r.onTime === null)).toBe(true);
    expect(synthetic({ lead_time_days: '', lead_time_weeks: '2' }).records[0].leadDays).toBe(14);
    expect(synthetic({ lead_time_days: '14', lead_time_weeks: '3' }).records[0].leadDays).toBeNull();
    expect(synthetic({ on_time_delivery_pct: '-1' }).records[0].onTime).toBeNull();
  });
  it('handles explicit aliases and semicolon lists, rejects unsupported or inconsistent fields', () => {
    expect(synthetic({ materials: ' aluminum ; copper ' }).records[0].materials).toEqual(['aluminium','copper']);
    expect(synthetic({ materials: 'impossible' }).records[0].quarantined).toBe(true);
    expect(synthetic({ process_count: '8' }).records[0].quarantined).toBe(true);
    expect(synthetic({ min_order_qty: '9000' }).records[0].quarantined).toBe(true);
    expect(synthetic({ certification_expiry: 'not-a-date' }).records[0].expiry).toBeNull();
    expect(synthetic({ capacity_units_per_month: 'oops' }).records[0].capacity).toBeNull();
  });
  it('fails explicitly on a malformed CSV or wrong schema', () => {
    expect(() => normalizeCsv('id,name\n1,test', hash)).toThrow('headers');
    expect(() => normalizeCsv(csv.split('\n')[0] + '\n"unterminated', hash)).toThrow('Malformed CSV');
  });
});
