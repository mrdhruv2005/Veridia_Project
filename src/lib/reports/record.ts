import { z } from 'zod';
import { POLICY_VERSION, evaluationSchema, type Evaluation } from '../schema';
import { checklist } from '../matching/checklist';

export const MAX_REPORT_BYTES = 5 * 1024 * 1024;
const recordSchema = z.object({
  format: z.literal('veridia-report-v1'), savedAt: z.string().datetime(), result: evaluationSchema,
  comparison: z.array(z.string().max(300)).max(3),
  checked: z.record(z.string().max(300), z.array(z.string().max(100)).max(20)),
  checklistItems: z.record(z.string().max(300), z.array(z.object({ id: z.string().trim().min(1).max(100), text: z.string().trim().min(1).max(2000) }).strict()).min(1).max(20)),
  assumptions: z.array(z.string().max(1000)).max(20),
}).strict().superRefine((v, ctx) => {
  const candidates = [...v.result.qualified, ...v.result.near];
  const ids = new Set(candidates.map(c => c.supplier.id));
  if (ids.size !== candidates.length || v.result.near.some(c => c.eligibility === 'qualifies')) ctx.addIssue({ code: 'custom', message: 'Supplier identities must be distinct across qualified and near results.' });
  if (new Set(v.comparison).size !== v.comparison.length || v.comparison.some(id => !v.result.qualified.some(c => c.supplier.id === id))) ctx.addIssue({ code: 'custom', message: 'Comparison must contain at most three distinct qualified suppliers.' });
  if (Object.keys(v.checked).some(id => !ids.has(id)) || Object.keys(v.checklistItems).some(id => !ids.has(id))) ctx.addIssue({ code: 'custom', message: 'Checklist supplier context is invalid.' });
  if (candidates.some(c => !Object.hasOwn(v.checklistItems, c.supplier.id))) ctx.addIssue({ code: 'custom', message: 'Every displayed supplier needs its saved checklist.' });
  for (const items of Object.values(v.checklistItems)) if (new Set(items.map(item => item.id)).size !== items.length) ctx.addIssue({ code: 'custom', message: 'Checklist question identifiers must be distinct.' });
  if (v.result.qualified.some(c => c.eligibility !== 'qualifies') || new Set(v.result.qualified.map(c => c.supplier.id)).size !== v.result.qualified.length || v.result.totals.qualified !== v.result.qualified.length) ctx.addIssue({ code: 'custom', message: 'Inconsistent qualified result list.' });
  for (const [id, checked] of Object.entries(v.checked)) if (new Set(checked).size !== checked.length || checked.some(key => !v.checklistItems[id]?.some(i => i.id === key))) ctx.addIssue({ code: 'custom', message: 'Checked items must be distinct and exist in their supplier checklist.' });
});
export type DecisionRecord = z.infer<typeof recordSchema>;
export function validateRecord(value: unknown): DecisionRecord {
  const parsed = recordSchema.safeParse(value);
  if (!parsed.success) throw new Error('The report has incomplete or inconsistent saved data. Reopen an unmodified JSON download or run matching again.');
  return parsed.data;
}
export function serializeRecord(record: DecisionRecord): string {
  const json = JSON.stringify(validateRecord(record), null, 2);
  if (new TextEncoder().encode(json).byteLength > MAX_REPORT_BYTES) throw new Error('Report exceeds the 5 MB limit. Narrow the requirement before exporting.');
  return json;
}
export const ASSUMPTIONS = [
  'These are preliminary capability matches from mock data; process/material pairing, grades and tolerances are unverified.',
  'Lead time means production calendar days, assuming immediate start on the evaluation date; shipment and customs are not included.',
  'One manufacturer-level expiry applies to all listed certificates for this exercise; expiry is inclusive and must cover estimated completion.',
  'Nominal capacity is not spare capacity. Matching does not reserve production slots or allocate orders.',
  'Past and future evaluations are snapshot-based scenarios; historical certificate issuance and future availability are unknown.',
  'Buyer check marks record local review progress only; they do not verify evidence or change eligibility.',
];
export function makeRecord(result: Evaluation, comparison: string[], checked: Record<string, string[]>): DecisionRecord {
  const checklistItems = Object.fromEntries([...result.qualified, ...result.near].map(c => [c.supplier.id, checklist(c, result.requirement)]));
  return recordSchema.parse({ format: 'veridia-report-v1', savedAt: new Date().toISOString(), result, comparison, checked, checklistItems, assumptions: ASSUMPTIONS });
}
export function parseRecord(text: string): DecisionRecord {
  if (new TextEncoder().encode(text).byteLength > MAX_REPORT_BYTES) throw new Error('Report exceeds the 5 MB limit.');
  try { return recordSchema.parse(JSON.parse(text)); }
  catch { throw new Error('This file is not a valid Veridia report. Use an unmodified JSON download (up to 5 MB).'); }
}
export function canReplay(record: DecisionRecord, hash: string, datasetVersion: string): boolean {
  return record.result.datasetHash === hash && record.result.policyVersion === POLICY_VERSION && record.result.datasetVersion === datasetVersion;
}
export function downloadFile(content: string, filename: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
