import type { Candidate, Requirement } from '../schema';
export type ChecklistItem = { id: string; text: string };
export function checklist(candidate: Candidate, r: Requirement): ChecklistItem[] {
  const s = candidate.supplier;
  const items: ChecklistItem[] = [
    { id: 'compatibility', text: `Can ${s.name} process the specified grade of ${r.material} using ${r.processes.join(' + ')} to our drawing, finish and tolerances? Please confirm the process/material combination.` },
    { id: 'commercial', text: `Will you accept a batch of ${r.quantity.toLocaleString('en-IN')} units${r.monthlyVolume !== null ? `, with expected monthly volume of ${r.monthlyVolume.toLocaleString('en-IN')}` : ''}${r.repeatUntil ? ` through ${r.repeatUntil}` : ''}? Please confirm repeat cadence and provide a commercial quote.` },
    { id: 'slot', text: `Which production slot and realistic start date can you offer${r.monthlyVolume !== null || r.repeatUntil ? ', including capacity for repeat batches' : ''}? Listed nominal capacity (${s.capacity === null ? 'unknown' : `${s.capacity.toLocaleString('en-IN')} units/month`}) does not establish spare capacity.` },
  ];
  if (r.certificates.length) items.splice(1, 0, { id: 'certificates', text: `Please provide current ${r.certificates.join(', ')} documents covering this work. Recorded supplier-level expiry: ${s.expiry || 'unknown'}.${r.repeatUntil && s.expiry && s.expiry < r.repeatUntil ? ` How will renewal cover repeat orders through ${r.repeatUntil}?` : ''}` });
  if (s.leadDays === null) items.push({ id: 'lead-time', text: `Production lead time is missing. Can ${s.name} confirm the start date and days needed for ${r.quantity.toLocaleString('en-IN')} units?` });
  else items.push({ id: 'timing', text: `Can you confirm the recorded ${s.leadDays}-day production lead time and an achievable ready date? The estimate ${candidate.readyDate} assumes an immediate start on ${r.asOfDate}.` });
  if (s.onTime === null) items.push({ id: 'delivery-history', text: 'Please provide recent on-time delivery evidence; the supplied delivery-history metric is unavailable or invalid.' });
  if (r.deadlineMeaning === 'arrival') items.push({ id: 'arrival', text: `For arrival in ${r.destination || 'the requested destination'} within ${r.maxLeadDays} days of ${r.asOfDate}, what shipment method, freight/transit allowance, customs allowance and arrival estimate can you confirm?` });
  return items;
}
