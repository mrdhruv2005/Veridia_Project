import type { Requirement } from './schema';
export type Draft = Omit<Requirement, 'quantity' | 'maxLeadDays' | 'monthlyVolume' | 'repeatUntil'> & { quantity: string; maxLeadDays: string; monthlyVolume: string; repeatUntil: string };
export const toDraft = (r: Requirement): Draft => ({ ...r, quantity: String(r.quantity), maxLeadDays: String(r.maxLeadDays), monthlyVolume: r.monthlyVolume === null ? '' : String(r.monthlyVolume), repeatUntil: r.repeatUntil || '' });
export const fromDraft = (d: Draft): unknown => ({ ...d, quantity: Number(d.quantity), maxLeadDays: Number(d.maxLeadDays), monthlyVolume: d.monthlyVolume.trim() ? Number(d.monthlyVolume) : null, repeatUntil: d.repeatUntil || null });
