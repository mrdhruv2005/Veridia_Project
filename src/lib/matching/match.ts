import { POLICY_VERSION, requirementSchema, type Candidate, type Dataset, type Evaluation, type Manufacturer, type Requirement } from '../schema.ts';

export function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
const lexical = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
export function compareCandidates(a: Candidate, b: Candidate): number {
  return (a.supplier.leadDays ?? Infinity) - (b.supplier.leadDays ?? Infinity)
    || (b.supplier.onTime ?? -1) - (a.supplier.onTime ?? -1)
    || (b.supplier.exportYears ?? -1) - (a.supplier.exportYears ?? -1)
    || lexical(a.supplier.id, b.supplier.id) || a.supplier.sourceRow - b.supplier.sourceRow;
}
export function evaluateSupplier(supplier: Manufacturer, r: Requirement): Candidate {
  const checks: Candidate['checks'] = [];
  const warnings: string[] = [];
  const check = (field: string, status: Candidate['checks'][number]['status'], text: string) => checks.push({ field, status, text });
  check('Identity', supplier.quarantined ? 'fail' : 'pass', supplier.quarantined ? `Source row ${supplier.sourceRow} is quarantined: ${supplier.issues.map(i => i.message).join(' ')}` : `Unambiguous ID ${supplier.id}; source CSV row ${supplier.sourceRow}.`);
  check('Status', supplier.status === 'active' ? 'pass' : 'fail', `Recorded company status: ${supplier.status}.`);
  check('Material', supplier.materials.includes(r.material) ? 'pass' : 'fail', `${r.material} ${supplier.materials.includes(r.material) ? 'is' : 'is not'} listed.`);
  const processPass = r.processes.every(p => p === 'CNC machining' ? supplier.processes.some(v => v === 'CNC milling' || v === 'CNC turning') : supplier.processes.includes(p));
  check('Process', processPass ? 'pass' : 'fail', `Requested ${r.processes.join(' + ')}; recorded ${supplier.processes.join(', ')}. CNC machining means either milling or turning; separate operations are all required.`);
  check('Batch quantity', r.quantity >= supplier.minQty && r.quantity <= supplier.maxQty ? 'pass' : 'fail', `${r.quantity.toLocaleString('en-IN')} units requested; inclusive order range ${supplier.minQty.toLocaleString('en-IN')}–${supplier.maxQty.toLocaleString('en-IN')}.`);
  const missingCertificates = r.certificates.filter(c => !supplier.certificates.includes(c));
  check('Certificates', missingCertificates.length ? 'fail' : 'pass', r.certificates.length ? (missingCertificates.length ? `Missing required certificates: ${missingCertificates.join(', ')}.` : `All requested certificates listed: ${r.certificates.join(', ')}.`) : 'No certificates required; expiry does not filter eligibility.');
  const readyDate = supplier.leadDays === null ? null : addDays(r.asOfDate, supplier.leadDays);
  check('Production timing', supplier.leadDays === null ? 'unknown' : supplier.leadDays <= r.maxLeadDays ? 'pass' : 'fail', supplier.leadDays === null ? 'Production lead time is unknown; deadline fit cannot be confirmed.' : `${supplier.leadDays} production days against a ${r.maxLeadDays}-day ${r.deadlineMeaning === 'arrival' ? 'arrival window (production screen only)' : 'production limit'}; estimated ready ${readyDate}, assuming immediate start.`);
  if (r.certificates.length) {
    if (supplier.expiry === null) check('Certificate validity', 'unknown', 'Certificate expiry is unavailable.');
    else if (supplier.expiry < r.asOfDate) check('Certificate validity', 'fail', `Recorded certificate expiry ${supplier.expiry} is before evaluation ${r.asOfDate}.`);
    else if (!readyDate) check('Certificate validity', 'unknown', `Expiry ${supplier.expiry}; unknown lead time prevents checking validity through completion.`);
    else check('Certificate validity', supplier.expiry >= readyDate ? 'pass' : 'fail', `Recorded expiry ${supplier.expiry} ${supplier.expiry >= readyDate ? 'covers' : 'does not cover'} estimated completion ${readyDate} (expiry day inclusive).`);
  }
  warnings.push('Separate process and material lists do not prove compatibility on the same production line; confirm grade, drawing and tolerances.');
  if (r.certificates.length) warnings.push('One supplier-level expiry is assumed to apply to all listed certificates; individual documents are unverified.');
  if (r.deadlineMeaning === 'arrival') warnings.push(`Arrival in ${r.destination || 'the destination'} is unconfirmed. Freight, transit and customs duration are missing; production fit is only a preliminary screen.`);
  if (r.repeatUntil && r.certificates.length && supplier.expiry && supplier.expiry < r.repeatUntil) warnings.push(`Repeat-order renewal: certificate expires ${supplier.expiry}, before the horizon ${r.repeatUntil}. Only the first batch is evaluated; confirm renewal for later orders.`);
  if (r.monthlyVolume !== null) warnings.push(supplier.capacity !== null && r.monthlyVolume > supplier.capacity ? `Monthly volume ${r.monthlyVolume.toLocaleString('en-IN')} exceeds listed nominal capacity ${supplier.capacity.toLocaleString('en-IN')}; confirm capacity for repeat orders.` : `Requested monthly volume ${r.monthlyVolume.toLocaleString('en-IN')}; nominal capacity is not confirmed spare capacity.`);
  if (supplier.onTime === null) warnings.push('On-time delivery history is unknown; no performance percentage contributes to ranking.');
  warnings.push(...supplier.issues.filter(i => i.code !== 'identity_conflict').map(i => i.message));
  return { supplier, checks, warnings, readyDate, eligibility: checks.some(c => c.status === 'fail') ? 'excluded' : checks.some(c => c.status === 'unknown') ? 'needs-confirmation' : 'qualifies' };
}
export function match(dataset: Dataset, input: unknown): Evaluation {
  const requirement = requirementSchema.parse(input);
  const all = dataset.records.map(s => evaluateSupplier(s, requirement));
  const qualified = all.filter(c => c.eligibility === 'qualifies').sort(compareCandidates);
  const near = all.filter(c => !c.supplier.quarantined && c.eligibility !== 'qualifies').sort((a, b) => {
    const failures = (c: Candidate) => c.checks.filter(k => k.status === 'fail').length;
    return failures(a) - failures(b) || a.checks.filter(k => k.status === 'unknown').length - b.checks.filter(k => k.status === 'unknown').length || compareCandidates(a, b);
  }).slice(0, 12);
  const exclusionReasons: Record<string, number> = {};
  for (const c of all) for (const check of c.checks.filter(k => k.status !== 'pass')) exclusionReasons[check.field] = (exclusionReasons[check.field] || 0) + 1;
  return { requirement, datasetHash: dataset.hash, datasetVersion: dataset.version, policyVersion: POLICY_VERSION, qualified, near,
    totals: { evaluated: all.length, qualified: qualified.length, needsConfirmation: all.filter(c => c.eligibility === 'needs-confirmation').length, excluded: all.filter(c => c.eligibility === 'excluded').length, quarantined: dataset.quality.quarantined }, exclusionReasons };
}
