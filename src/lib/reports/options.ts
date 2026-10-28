import type { DecisionRecord } from './record';

export type ReportOptions = { scope: 'shortlist' | 'all'; includeNear: boolean };
export const DEFAULT_REPORT_OPTIONS: ReportOptions = { scope: 'shortlist', includeNear: false };

export function reportCandidates(record: DecisionRecord, options: ReportOptions) {
  if (options.scope === 'all') return record.result.qualified;
  if (record.comparison.length) return record.comparison.map(id => record.result.qualified.find(c => c.supplier.id === id)!);
  return record.result.qualified.slice(0, 3);
}
