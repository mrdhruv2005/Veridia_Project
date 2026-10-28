import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import quality from '../data/quality.json';
import { buyerA, buyerB, DATA_VERSION, POLICY_VERSION, requirementSchema, utcToday, workerResponseSchema, type Candidate, type Evaluation, type Requirement } from './lib/schema';
import { isCurrentRevision } from './lib/matching/worker-job';
import { canReplay, downloadFile, makeRecord, MAX_REPORT_BYTES, parseRecord, serializeRecord, validateRecord, type DecisionRecord } from './lib/reports/record';
import { DEFAULT_REPORT_OPTIONS, type ReportOptions } from './lib/reports/options';
import RequirementForm from './components/RequirementForm';
import { fromDraft, toDraft, type Draft } from './lib/draft';
import { CompareTable } from './components/Compare';
import { units } from './lib/format';
import SupplierDetails from './components/SupplierDetails';
import Report from './components/Report';

type ReviewSnapshot = { result: Evaluation; comparison: string[]; checked: Record<string, string[]>; saved: DecisionRecord | null };

export default function App() {
  const [draft, setDraft] = useState(() => toDraft(buyerA(utcToday())));
  const [result, setResult] = useState<Evaluation | null>(null);
  const [stale, setStale] = useState(false), [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({}), [error, setError] = useState('');
  const [comparison, setComparison] = useState<string[]>([]), [compareOpen, setCompareOpen] = useState(false);
  const [checked, setChecked] = useState<Record<string, string[]>>({});
  const [detail, setDetail] = useState<Candidate | null>(null), [visibleCount, setVisibleCount] = useState(10);
  const [saved, setSaved] = useState<DecisionRecord | null>(null), [report, setReport] = useState<DecisionRecord | null>(null);
  const [reportOptions, setReportOptions] = useState<ReportOptions>(DEFAULT_REPORT_OPTIONS);
  const [announcement, setAnnouncement] = useState('');
  const [notice, setNotice] = useState(''), [methodOpen, setMethodOpen] = useState(false);
  const worker = useRef<Worker | null>(null), revision = useRef(0), pending = useRef<number | null>(null), expectedReplay = useRef<Evaluation | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLElement>(null), pendingReview = useRef<ReviewSnapshot | null>(null);
  const focusRevision = useRef<number | null>(null), requestFocus = useRef<Element | null>(null);
  useEffect(() => () => { worker.current?.terminate(); }, []);
  useEffect(() => { if (compareOpen) document.querySelector('.compare-section')?.scrollIntoView({ behavior: 'instant', block: 'start' }); }, [compareOpen]);
  useEffect(() => {
    if (!result || stale || focusRevision.current !== revision.current) return;
    focusRevision.current = null;
    if (document.activeElement === requestFocus.current || document.activeElement === document.body) {
      resultsRef.current?.focus({ preventScroll: true });
      resultsRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' });
    }
  }, [result, stale]);
  const invalidate = () => {
    revision.current += 1; pending.current = null; expectedReplay.current = null;
    pendingReview.current = null; focusRevision.current = null; setAnnouncement('');
    setBusy(false); setStale(result !== null); setComparison([]); setCompareOpen(false); setChecked({}); setDetail(null); setSaved(null); setReport(null); setNotice(''); setError(''); setErrors({});
  };
  const changeDraft = (value: Draft) => { invalidate(); setDraft(value); };
  const run = (input: unknown, replay?: Evaluation) => {
    const parsed = requirementSchema.safeParse(input);
    const review = parsed.success && result && !stale && JSON.stringify(parsed.data) === JSON.stringify(result.requirement) ? { result, comparison, checked, saved } : null;
    invalidate();
    if (!parsed.success) { setErrors(Object.fromEntries(parsed.error.issues.map(i => [String(i.path[0]), i.message]))); setError('Review the highlighted requirement fields before matching.'); return; }
    pendingReview.current = review; requestFocus.current = document.activeElement;
    setDraft(toDraft(parsed.data)); setBusy(true); pending.current = revision.current; expectedReplay.current = replay || null;
    if (!worker.current) {
      try {
        const currentWorker = new Worker(new URL('./workers/matching.worker.ts', import.meta.url), { type: 'module' });
        currentWorker.onmessage = (event: MessageEvent<unknown>) => {
          if (worker.current !== currentWorker) return;
          const message = workerResponseSchema.safeParse(event.data);
          if (!message.success) { if (pending.current === revision.current) { setError('An invalid worker response was received. Retry matching.'); setBusy(false); pending.current = null; } return; }
          if (!isCurrentRevision(revision.current, message.data) || pending.current !== revision.current) return;
          setBusy(false); pending.current = null;
          if (message.data.type === 'error') { setError(message.data.message); return; }
          const next = message.data.result;
          setResult(next); setStale(false); setVisibleCount(10);
          const previous = pendingReview.current;
          const unchanged = previous !== null && JSON.stringify(previous.result) === JSON.stringify(next);
          if (unchanged) { setComparison(previous.comparison); setChecked(previous.checked); setSaved(previous.saved); }
          if (expectedReplay.current) setNotice(JSON.stringify(expectedReplay.current) === JSON.stringify(next) ? 'Replay verified: the same snapshot and policy produced identical results and explanations. Comparison and checklist progress were preserved. Saved checklist wording remains user-provided.' : 'Recalculated with the current matching engine. The imported results differ; the displayed results are the new calculation. Comparison and checklist progress were cleared.');
          else if (unchanged) setNotice('The results are unchanged. Comparison and checklist progress were preserved.');
          setAnnouncement(`Matching complete. ${next.totals.qualified} preliminary ${next.totals.qualified === 1 ? 'match' : 'matches'}. ${next.requirement.deadlineMeaning === 'arrival' ? 'Arrival feasibility remains unconfirmed.' : ''}`);
          focusRevision.current = revision.current; pendingReview.current = null;
          expectedReplay.current = null;
        };
        currentWorker.onerror = () => { if (worker.current !== currentWorker) return; currentWorker.terminate(); worker.current = null; if (pending.current === revision.current) { setBusy(false); pending.current = null; setError('The matching worker could not load or stopped unexpectedly. Retry matching; if needed, reload the page.'); } };
        worker.current = currentWorker;
      } catch { setBusy(false); pending.current = null; setError('This browser could not start the matching worker. Try a modern browser and reload.'); return; }
    }
    worker.current.postMessage({ revision: revision.current, datasetHash: quality.hash, policyVersion: POLICY_VERSION, requirement: parsed.data });
  };
  const preset = (buyer: 'A' | 'B') => run((buyer === 'A' ? buyerA : buyerB)(draft.asOfDate || utcToday()));
  const toggleComparison = (id: string) => { if (stale) return; setComparison(previous => previous.includes(id) ? previous.filter(v => v !== id) : previous.length < 3 ? [...previous, id] : previous); };
  const toggleCheck = (supplier: string, item: string) => setChecked(previous => ({ ...previous, [supplier]: (previous[supplier] || []).includes(item) ? previous[supplier].filter(v => v !== item) : [...(previous[supplier] || []), item] }));
  const currentRecord = () => validateRecord(saved ? { ...saved, savedAt: new Date().toISOString(), comparison, checked } : makeRecord(result!, comparison, checked));
  const exportJson = () => {
    if (!result || stale) return;
    try { downloadFile(serializeRecord(currentRecord()), `veridia-${result.requirement.asOfDate}.json`, 'application/json'); }
    catch (e) { setError(e instanceof Error ? e.message : 'The report could not be saved. Run matching again and retry.'); }
  };
  const exportHtml = async () => {
    if (!result || stale) return;
    try {
      const snapshot = report || currentRecord(), options = { ...reportOptions };
      const { reportHtml } = await import('./lib/reports/export-html');
      downloadFile(reportHtml(snapshot, options), `veridia-${snapshot.result.requirement.asOfDate}.html`, 'text/html');
    } catch (e) { setError(e instanceof Error ? `The HTML report could not be saved. ${e.message}` : 'The HTML exporter could not load. Use Print report, or reload and retry.'); }
  };
  const openReport = () => { try { setReport(currentRecord()); } catch (e) { setError(e instanceof Error ? e.message : 'The report could not be opened. Run matching again.'); } };
  const importJson = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    invalidate(); const importingRevision = revision.current; requestFocus.current = document.activeElement;
    try {
      if (file.size > MAX_REPORT_BYTES) throw new Error('Report exceeds the 5 MB limit.');
      const record = parseRecord(await file.text());
      if (revision.current !== importingRevision) return;
      setResult(record.result); setDraft(toDraft(record.result.requirement)); setComparison(record.comparison); setChecked(record.checked); setSaved(record); setStale(false); setVisibleCount(10);
      focusRevision.current = importingRevision;
      setNotice('Viewing a saved, user-provided record. It has not been recalculated or independently verified.');
    } catch (e) { if (revision.current === importingRevision) setError(e instanceof Error ? e.message : 'Could not read this report.'); }
  };
  const selected = comparison.map(id => result?.qualified.find(c => c.supplier.id === id)).filter((c): c is Candidate => !!c);
  if (report) return <><div className="report-toolbar"><div className="report-controls"><button onClick={() => setReport(null)}>← Back to matching</button><button className="primary" onClick={() => window.print()}>Print / Save as PDF</button><button onClick={exportHtml}>Download HTML</button></div><div className="report-options"><label>Suppliers in report<select value={reportOptions.scope} onChange={e => setReportOptions(previous => ({ ...previous, scope: e.target.value as ReportOptions['scope'] }))}><option value="shortlist">Selected suppliers, or the top three</option><option value="all">All matching suppliers</option></select></label><label className="check-label"><input type="checkbox" checked={reportOptions.includeNear} onChange={e => setReportOptions(previous => ({ ...previous, includeNear: e.target.checked }))}/>Include near-match appendix</label></div>{error && <p className="error-box" role="alert">{error}</p>}</div><Report record={report} options={reportOptions}/></>;
  return <><a className="skip-link" href="#results">Skip to results</a><header className="site-header"><a href="#" className="brand" aria-label="Veridia home"><span className="brand-mark" aria-hidden="true">V</span>veridia<span className="brand-divider"/><span className="brand-product">Manufacturer matching</span></a><div className="header-actions"><button className="text-button" onClick={() => setMethodOpen(!methodOpen)} aria-expanded={methodOpen}>Method & data</button><button className="secondary" onClick={() => importRef.current?.click()}>Open saved report</button><input ref={importRef} type="file" accept=".json,application/json" onChange={importJson} hidden aria-label="Import saved JSON report"/></div></header>
    <main><section className="intro"><div><div className="section-kicker">Precision engineering · India</div><h1>A clearer path to<br/><em>the right manufacturer.</em></h1><p>Turn your requirements into an explainable shortlist.<br className="desktop-break"/> Compare the evidence. Know what to confirm next.</p></div><div className="dataset-stats"><div><strong>{quality.retained}</strong><span>unambiguous records</span></div><div><strong>{quality.quarantined}</strong><span>rows quarantined</span></div><small>1,000 mock manufacturers · versioned snapshot</small></div></section>
      {methodOpen && <section className="method-panel"><h2>How the shortlist is made</h2><p>Hard rules check identity, active status, material, every selected process, batch range, requested certificates, production timing and certificate validity through completion. There is no hidden match score. Rank follows production days, valid on-time delivery, general export experience and ID.</p><p>Certificate expiry is inclusive. One supplier-level expiry is assumed to cover all listed certificates. Completion assumes an immediate start on the frozen evaluation date, using UTC calendar days. Past and future dates are snapshot-based scenarios, not verified historical or future availability.</p><p>{quality.total} source rows; {quality.quarantined} conflicting-ID rows quarantined; {quality.counts.missing_lead_time || 0} missing lead times; {quality.counts.invalid_delivery_history || 0} invalid delivery percentages. Invalid metrics remain unknown; they are never changed to zero or 100%. General export experience does not establish destination-specific experience.</p><p>Matching is local to each tab and does not book capacity. Both example buyers can match VM1006, whose 1,500-unit nominal monthly capacity does not prove it can accept both orders. The 2,500-unit combined requirement needs supplier confirmation.</p><p>₹0 additional project cost · no API keys, analytics, paid service or external matching backend.</p><p className="version">Dataset {DATA_VERSION} · policy {POLICY_VERSION}<br/>SHA-256 {quality.hash}</p></section>}
      <div className="workspace"><RequirementForm draft={draft} onChange={changeDraft} onSubmit={() => run(fromDraft(draft))} onPreset={preset} busy={busy} errors={errors}/>
        <section ref={resultsRef} id="results" className="results-panel" aria-label="Manufacturer results" aria-busy={busy} tabIndex={-1}><div className="results-heading"><div><div className="section-kicker">02 / Your shortlist</div><h2>{result ? `${result.totals.qualified} preliminary ${result.totals.qualified === 1 ? 'match' : 'matches'}` : 'Good decisions start with evidence.'}</h2></div>{result && !stale && <span className="snapshot-tag">{saved ? 'Saved record' : 'Snapshot'} · {result.requirement.asOfDate}</span>}</div>
          <div aria-live="polite" aria-atomic="true"><p className="sr-only" data-testid="matching-announcement">{announcement}</p>{busy && <p className="callout">Evaluating the submitted requirement…</p>}{stale && <p className="warning" role="status">Results are outdated. Run matching again to confirm the current requirement. Comparison and checklist controls are unavailable until matching finishes.</p>}{notice && <p className="callout">{notice}</p>}</div>
          {error && <div className="error-box" role="alert"><p>{error}</p><button onClick={() => run(fromDraft(draft))}>Retry matching</button></div>}
          {saved && <div className="saved-actions">{canReplay(saved, quality.hash, DATA_VERSION) ? <button onClick={() => run(saved.result.requirement, saved.result)}>Recalculate & verify replay</button> : <p className="warning">Replay unavailable: this record uses a different dataset or policy. You may view it, but its original version cannot be silently replaced.</p>}</div>}
          {!result && !busy && <div className="welcome"><div className="welcome-symbol" aria-hidden="true">↗</div><h3>Your requirement, checked field by field.</h3><p>Select Buyer A or Buyer B to see an example, or enter your own requirement and find manufacturers.</p><ol><li><strong>Match capability</strong><span>Material, process, quantity and certificates.</span></li><li><strong>Compare up to three</strong><span>See timing and evidence side by side.</span></li><li><strong>Confirm with the supplier</strong><span>A specific checklist for what the data cannot tell you.</span></li></ol></div>}
          {result && <div className={stale ? 'outdated-results' : ''}><SubmittedSummary requirement={result.requirement}/><p className="ranking-note">Ordered by production time → on-time delivery → export experience → ID. Every listed match passes all implemented hard rules.</p>
            {result.requirement.deadlineMeaning === 'arrival' && <p className="warning">Production capability matches only. Arrival in {result.requirement.destination || 'your destination'} is unconfirmed because transit and customs times are missing.</p>}
            {result.requirement.asOfDate !== utcToday() && <p className="hint">Snapshot-based date scenario. The source cannot establish historical certificate issuance or future production availability.</p>}
            <div className="report-actions"><button disabled={stale} onClick={exportJson}>Download JSON</button><button disabled={stale} onClick={exportHtml}>Save readable HTML</button><button disabled={stale} onClick={openReport}>Print report</button></div>
            {result.qualified.length === 0 && <div className="empty-state"><h3>No manufacturer meets every requirement.</h3><p>No condition has been relaxed. Review the near matches below to see what failed or remains unknown, then explicitly revise your requirement if appropriate.</p></div>}
            <div className="supplier-list">{result.qualified.slice(0, visibleCount).map((candidate, index) => <SupplierCard key={candidate.supplier.id} candidate={candidate} index={index} selected={comparison.includes(candidate.supplier.id)} locked={stale || (comparison.length === 3 && !comparison.includes(candidate.supplier.id))} stale={stale} onCompare={() => toggleComparison(candidate.supplier.id)} onDetails={() => setDetail(candidate)}/>)}</div>
            {visibleCount < result.qualified.length && <button className="load-more" onClick={() => setVisibleCount(v => v + 10)}>Show more manufacturers ({result.qualified.length - visibleCount} remaining)</button>}
            {!!result.qualified.length && <p className="hint">Choose at most three suppliers for comparison. Remove one to choose a replacement.</p>}
            <details className="near-matches"><summary>Near matches & exclusions <span>{result.totals.needsConfirmation} need confirmation · {result.totals.excluded} excluded</span></summary><p className="hint">These records are not qualified. Up to 12 closest records are shown, ordered by fewest failed rules, fewest unknowns, then standard ranking. Conflicting identities are excluded from this list.</p>{result.near.map(c => <article className="near-card" key={c.supplier.id}><div><h3>{c.supplier.name}</h3><span>{c.supplier.id} · {c.eligibility === 'needs-confirmation' ? 'Needs confirmation' : 'Excluded'}</span></div><ul>{c.checks.filter(k => k.status !== 'pass').map(k => <li key={k.field}>{k.text}</li>)}</ul><button disabled={stale} onClick={() => setDetail(c)}>Review evidence & questions</button></article>)}<h3>Across all source records</h3><p className="hint">Failed or unknown checks; counts overlap across rules. {result.totals.quarantined} quarantined rows are included.</p><div className="reason-counts">{Object.entries(result.exclusionReasons).map(([reason, count]) => <div key={reason}><span>{reason}</span><strong>{count}</strong></div>)}</div></details>
          </div>}
        </section></div>
      {result && !!selected.length && !stale && <section className="compare-section" aria-label="Selected supplier comparison"><div className="compare-tray"><div><strong>{selected.length} of 3 selected</strong><p>{selected.map(c => c.supplier.id).join(' · ')}</p></div><div className="tray-buttons"><button className="primary" onClick={() => setCompareOpen(!compareOpen)} aria-expanded={compareOpen}>{compareOpen ? 'Hide comparison' : 'Compare suppliers'}</button><button onClick={() => { setComparison([]); setCompareOpen(false); }}>Clear selection</button></div></div>{compareOpen && <CompareTable candidates={selected} requirement={result.requirement} onRemove={toggleComparison} savedItems={saved?.checklistItems}/>}</section>}
    </main><footer><span>veridia <span className="muted">/ Manufacturer matching</span></span><p>Preliminary capability evidence. Confirm availability, certificate documents and shipment with the supplier.</p><small>Mock dataset · local processing · no supplier messages sent</small></footer>
    {detail && result && !stale && <SupplierDetails candidate={detail} requirement={result.requirement} checked={checked[detail.supplier.id] || []} onToggle={id => toggleCheck(detail.supplier.id, id)} onClose={() => setDetail(null)} savedItems={saved?.checklistItems[detail.supplier.id]}/>}
  </>;
}
function SubmittedSummary({ requirement: r }: { requirement: Requirement }) {
  return <div className="submitted-summary" aria-label="Submitted criteria"><span>{r.material}</span><span>{r.processes.join(' + ')}</span><span>{units(r.quantity)} units/batch</span><span>{r.certificates.join(' + ') || 'No certificates required'}</span><span>{r.maxLeadDays} days · {r.deadlineMeaning === 'arrival' ? 'arrival requested' : 'production'}</span><span>{r.destination || 'No destination'}</span><span>Evaluated {r.asOfDate}</span>{r.monthlyVolume !== null && <span>{units(r.monthlyVolume)}/month</span>}{r.repeatUntil && <span>Repeat through {r.repeatUntil}</span>}</div>;
}
function SupplierCard({ candidate: c, index, selected, locked, stale, onCompare, onDetails }: { candidate: Candidate; index: number; selected: boolean; locked: boolean; stale: boolean; onCompare: () => void; onDetails: () => void }) {
  const s = c.supplier;
  return <article className={`supplier-card ${selected ? 'selected' : ''}`} data-testid="supplier-card"><div className="supplier-heading"><span className="rank">{String(index + 1).padStart(2, '0')}</span><div><h3>{s.name}</h3><p>{s.city}, {s.state} <span>· {s.id}</span></p></div><span className="qualified-label">Preliminary match</span></div><div className="capability-tags"><span>{s.processes.join(' · ')}</span></div><div className="card-metrics"><div><span>Production lead</span><strong>{s.leadDays ?? 'Unknown'}{s.leadDays !== null && <small> days</small>}</strong></div><div><span>On-time delivery</span><strong>{s.onTime === null ? 'Unknown' : `${s.onTime}%`}</strong></div><div><span>Batch range</span><strong>{units(s.minQty)}–{units(s.maxQty)}</strong></div></div><div className="supplier-meta"><span>Est. ready <strong>{c.readyDate || 'Unknown'}</strong></span><span>Certificate expiry <strong>{s.expiry || 'Unknown'}</strong></span></div>{c.warnings.some(w => w.startsWith('Repeat-order renewal:') || w.startsWith('Monthly volume')) && <p className="hint card-warning">Repeat-order requirements need confirmation. See evidence.</p>}<div className="card-actions"><button className="text-button" onClick={onDetails} disabled={stale}>Evidence & checklist <span aria-hidden="true">↗</span></button><label className="check-label"><input type="checkbox" checked={selected} onChange={onCompare} disabled={locked} aria-label={`Compare ${s.name}`}/>Compare</label></div></article>;
}
