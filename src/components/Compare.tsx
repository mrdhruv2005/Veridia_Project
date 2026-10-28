import type { Candidate, Requirement } from '../lib/schema';
import { checklist, type ChecklistItem } from '../lib/matching/checklist';
import { units } from '../lib/format';
export function CompareTable({ candidates, requirement, onRemove, savedItems, showConfirmation = true }: { candidates: Candidate[]; requirement: Requirement; onRemove?: (id: string) => void; savedItems?: Record<string, ChecklistItem[]>; showConfirmation?: boolean }) {
  const rows: [string, (c: Candidate) => string][] = [
    ['Location', c => `${c.supplier.city}, ${c.supplier.state}, ${c.supplier.country}`],
    ['Requested capability', () => `${requirement.material} · ${requirement.processes.join(' + ')}`],
    ['Recorded processes', c => c.supplier.processes.join(', ')],
    ['Recorded materials', c => c.supplier.materials.join(', ')],
    ['Batch range', c => `${units(c.supplier.minQty)}–${units(c.supplier.maxQty)} units`],
    ['Production lead time', c => c.supplier.leadDays === null ? 'Unknown' : `${c.supplier.leadDays} days`],
    ['Estimated production ready', c => c.readyDate || 'Unknown'],
    ['Required certificates', () => requirement.certificates.join(', ') || 'None required'],
    ['Recorded expiry', c => c.supplier.expiry || 'Unknown'],
    ['On-time delivery', c => c.supplier.onTime === null ? 'Unknown' : `${c.supplier.onTime}%`],
    ['Nominal monthly capacity', c => c.supplier.capacity === null ? 'Unknown' : `${units(c.supplier.capacity)} units/month`],
    ['General export experience', c => c.supplier.exportYears === null ? 'Unknown' : `${c.supplier.exportYears} years`],
    ['Limitations & repeat-order warnings', c => c.warnings.join(' ')],
  ];
  if (showConfirmation) rows.push(['Supplier confirmation', c => (savedItems ? savedItems[c.supplier.id] : checklist(c, requirement)).map(i => i.text).join('\n\n')]);
  return <><p className="hint">Same submitted requirement and evaluation date. Material/process pairing is unverified. Ready dates assume an immediate start; capacity is not reserved.</p><div className="table-scroll" role="region" aria-label="Supplier comparison table; scroll horizontally on small screens" tabIndex={0}><table className="comparison-table"><caption>Supplier comparison · {requirement.asOfDate}</caption><thead><tr><th scope="col">Evidence</th>{candidates.map(c => <th scope="col" key={c.supplier.id}><span>{c.supplier.name}</span><small>{c.supplier.id} · row {c.supplier.sourceRow}</small>{onRemove && <button className="text-button" onClick={() => onRemove(c.supplier.id)} aria-label={`Remove ${c.supplier.name} from comparison`}>Remove</button>}</th>)}</tr></thead><tbody>{rows.map(([label, value]) => <tr key={label}><th scope="row">{label}</th>{candidates.map(c => <td key={c.supplier.id}>{value(c)}</td>)}</tr>)}</tbody></table></div></>;
}
