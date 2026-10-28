import { useEffect, useRef } from 'react';
import type { Candidate, Requirement } from '../lib/schema';
import { checklist, type ChecklistItem } from '../lib/matching/checklist';
import { units } from '../lib/format';

export function Checklist({ candidate, requirement, checked, onToggle, savedItems }: { candidate: Candidate; requirement: Requirement; checked: string[]; onToggle?: (id: string) => void; savedItems?: ChecklistItem[] }) {
  const items = savedItems || checklist(candidate, requirement);
  return <div className="checklist"><h3>Supplier-confirmation checklist</h3><p className="hint">Your check marks record review progress only. They do not verify evidence or change eligibility. No messages are sent.</p>{items.map(item => <label className="checklist-item" key={item.id}><input type="checkbox" checked={checked.includes(item.id)} onChange={() => onToggle?.(item.id)} disabled={!onToggle}/><span>{item.text}</span></label>)}</div>;
}
export function Evidence({ candidate }: { candidate: Candidate }) {
  return <><h3>Why this result?</h3><ul className="evidence-list">{candidate.checks.map(c => <li key={c.field}><span className={`status-dot ${c.status}`} aria-hidden="true">{c.status === 'pass' ? '✓' : c.status === 'fail' ? '×' : '?'}</span><div><strong>{c.field} <small>· {c.status}</small></strong><p>{c.text}</p></div></li>)}</ul><h3>What needs confirmation</h3><ul className="limitations">{candidate.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul></>;
}
export default function SupplierDetails({ candidate, requirement, checked, onToggle, onClose, savedItems }: { candidate: Candidate; requirement: Requirement; checked: string[]; onToggle: (id: string) => void; onClose: () => void; savedItems?: ChecklistItem[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = dialogRef.current!; const previous = document.activeElement as HTMLElement | null; dialog.showModal(); return () => { dialog.close(); previous?.focus(); }; }, []);
  const s = candidate.supplier;
  return <dialog ref={dialogRef} className="detail-dialog" onCancel={onClose} aria-labelledby="detail-title"><div className="dialog-head"><div><div className="section-kicker">Manufacturer evidence / {s.id}</div><h2 id="detail-title">{s.name}</h2><p>{s.city}, {s.state} · CSV row {s.sourceRow}</p></div><button className="icon-button" onClick={onClose} aria-label="Close supplier details">×</button></div><div className="dialog-body"><p className="callout">Rank order: shortest production time, then highest valid on-time delivery, then export experience, then manufacturer ID. This supplier: {s.leadDays ?? 'unknown'} days · {s.onTime === null ? 'unknown delivery history' : `${s.onTime}% on-time`} · {s.exportYears ?? 'unknown'} export years.</p><div className="metrics"><div><span>Nominal monthly capacity</span><strong>{units(s.capacity)} units</strong></div><div><span>Recorded certificate expiry</span><strong>{s.expiry || 'Unknown'}</strong></div></div><Evidence candidate={candidate}/><Checklist candidate={candidate} requirement={requirement} checked={checked} onToggle={onToggle} savedItems={savedItems}/><details className="source-record"><summary>Original source fields</summary><p className="hint">Mock contact information; no supplier contact is sent. Raw values are preserved, including invalid metrics.</p><dl>{Object.entries(s.raw).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value || 'Not recorded'}</dd></div>)}</dl></details></div></dialog>;
}
