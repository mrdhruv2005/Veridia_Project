import { useEffect, useRef, type FormEvent } from 'react';
import { CERTIFICATES, MATERIALS, PROCESS_CHOICES } from '../lib/schema';
import type { Draft } from '../lib/draft';
type Props = { draft: Draft; onChange: (value: Draft) => void; onSubmit: () => void; onPreset: (buyer: 'A' | 'B') => void; busy: boolean; errors: Record<string, string> };
export default function RequirementForm({ draft, onChange, onSubmit, onPreset, busy, errors }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!Object.keys(errors).length) return;
    const invalid = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    const control = invalid?.matches('fieldset') ? invalid.querySelector<HTMLElement>('input,select') : invalid;
    const details = control?.closest('details');
    if (details) details.open = true;
    control?.focus({ preventScroll: true });
    control?.scrollIntoView({ behavior: 'instant', block: 'center' });
  }, [errors]);
  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => onChange({ ...draft, [key]: value });
  const submit = (e: FormEvent) => { e.preventDefault(); onSubmit(); };
  return <aside className="requirement-panel" aria-label="Buyer requirement">
    <div className="section-kicker">01 / Your requirement</div>
    <h2>What are you making?</h2>
    <p className="muted">Start with an example, then make it yours.</p>
    <div className="examples"><button type="button" onClick={() => onPreset('A')}>Buyer A <span>Aluminium CNC</span></button><button type="button" onClick={() => onPreset('B')}>Buyer B <span>Stainless sheet metal</span></button></div>
    <p className="hint">Examples use 42 production days. Choose arrival below if the deadline includes shipping.</p>
    <form ref={formRef} onSubmit={submit} noValidate>
      <label htmlFor="material">Material</label>
      <select id="material" value={draft.material} aria-invalid={!!errors.material} onChange={e => update('material', e.target.value as Draft['material'])}>{MATERIALS.map(v => <option key={v}>{v}</option>)}</select>
      <fieldset aria-invalid={!!errors.processes} aria-describedby={errors.processes ? 'process-help processes-error' : 'process-help'}><legend>Required process</legend><p id="process-help" className="hint">CNC machining = either milling or turning. Every other selected operation must be listed.</p><div className="choice-grid">{PROCESS_CHOICES.map(p => <label key={p} className="check-label"><input type="checkbox" checked={draft.processes.includes(p)} aria-describedby={errors.processes ? 'processes-error' : undefined} onChange={e => update('processes', e.target.checked ? [...draft.processes, p] : draft.processes.filter(v => v !== p))}/>{p}</label>)}</div>{errors.processes && <p id="processes-error" className="field-error" role="alert">{errors.processes}</p>}</fieldset>
      <label htmlFor="quantity">Batch quantity <span>units per order</span></label>
      <input id="quantity" type="number" min="1" max="1000000000" step="1" value={draft.quantity} onChange={e => update('quantity', e.target.value)} aria-invalid={!!errors.quantity} aria-describedby={errors.quantity ? 'quantity-error' : undefined}/>
      {errors.quantity && <p id="quantity-error" className="field-error" role="alert">Use a whole number from 1 to 1,000,000,000.</p>}
      <fieldset><legend>Required certificates</legend><p className="hint">Clear all to impose no certificate requirement.</p><div className="choice-grid">{CERTIFICATES.map(c => <label key={c} className="check-label"><input type="checkbox" checked={draft.certificates.includes(c)} onChange={e => update('certificates', e.target.checked ? [...draft.certificates, c] : draft.certificates.filter(v => v !== c))}/>{c}</label>)}</div></fieldset>
      <label htmlFor="deadline">The deadline means</label><select id="deadline" value={draft.deadlineMeaning} onChange={e => update('deadlineMeaning', e.target.value as Draft['deadlineMeaning'])}><option value="production">Production ready</option><option value="arrival">Arrival at destination</option></select>
      <label htmlFor="lead">{draft.deadlineMeaning === 'production' ? 'Maximum production lead time' : 'Requested arrival window'} <span>calendar days</span></label>
      <input id="lead" type="number" min="1" max="730" step="1" value={draft.maxLeadDays} onChange={e => update('maxLeadDays', e.target.value)} aria-invalid={!!errors.maxLeadDays} aria-describedby={errors.maxLeadDays ? 'lead-help lead-error' : 'lead-help'}/>
      <p className="hint" id="lead-help">{draft.deadlineMeaning === 'production' ? 'Production time excludes shipping and customs.' : 'Transit and customs are unknown. Results can screen production capability, but cannot confirm arrival.'}</p>
      {errors.maxLeadDays && <p id="lead-error" className="field-error" role="alert">Use a whole number from 1 to 730 days.</p>}
      <div className="form-pair"><div><label htmlFor="destination">Destination</label><input id="destination" maxLength={120} value={draft.destination} onChange={e => update('destination', e.target.value)}/></div><div><label htmlFor="date">Evaluation date</label><input id="date" type="date" min="2000-01-01" max="2100-12-31" value={draft.asOfDate} onChange={e => update('asOfDate', e.target.value)} aria-invalid={!!errors.asOfDate} aria-describedby={errors.asOfDate ? 'date-error' : undefined}/></div></div>
      {errors.asOfDate && <p id="date-error" className="field-error" role="alert">Use a real evaluation date from 2000 through 2100.</p>}
      <details className="recurring"><summary>Recurring orders <span>optional</span></summary><label htmlFor="monthly">Expected monthly volume <span>units/month</span></label><input id="monthly" type="number" min="1" step="1" max="1000000000" value={draft.monthlyVolume} onChange={e => update('monthlyVolume', e.target.value)} aria-invalid={!!errors.monthlyVolume} aria-describedby={errors.monthlyVolume ? 'monthly-error' : undefined}/>{errors.monthlyVolume && <p id="monthly-error" className="field-error" role="alert">Use a positive whole monthly volume up to 1,000,000,000.</p>}<label htmlFor="repeat">Repeat-order horizon</label><input id="repeat" type="date" min={draft.asOfDate} max="2100-12-31" value={draft.repeatUntil} onChange={e => update('repeatUntil', e.target.value)} aria-invalid={!!errors.repeatUntil} aria-describedby={errors.repeatUntil ? 'repeat-error' : undefined}/>{errors.repeatUntil && <p id="repeat-error" className="field-error" role="alert">{errors.repeatUntil}</p>}<p className="hint">The first batch is evaluated separately. Listed capacity is not available capacity.</p></details>
      <button className="primary submit" type="submit" disabled={busy}>{busy ? 'Finding manufacturers…' : 'Find manufacturers'} <span aria-hidden="true">→</span></button>
      <p className="hint privacy">Requirements stay in this browser tab.</p>
    </form>
  </aside>;
}
