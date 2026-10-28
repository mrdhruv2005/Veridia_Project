import Papa from 'papaparse';
import { CERTIFICATES, MATERIALS, PROCESSES, DATA_VERSION, dateSchema, datasetSchema, type Dataset, type Manufacturer } from '../schema.ts';

const requiredHeaders = ['manufacturer_id','name','country','city','state','state_name','full_address','contact_email','website','founded_year','employee_count','company_size','capacity_units_per_month','capacity_tier','processes','primary_process','process_count','materials','certifications','certification_count','certification_expiry','last_audit_date','min_order_qty','max_order_qty','order_range','lead_time_weeks','lead_time_days','export_experience_years','on_time_delivery_pct','delivery_rating','status'];
const numeric = (s: string | undefined) => s?.trim() && Number.isFinite(Number(s)) ? Number(s) : null;
const positiveInt = (n: number | null): n is number => n !== null && Number.isInteger(n) && n > 0;
function list<T extends string>(s: string, vocabulary: readonly T[], alias: Record<string, string> = {}): { values: T[]; invalid: boolean } {
  const parts = (s || '').split(';').map(v => v.trim()).filter(Boolean);
  const values = parts.map(v => vocabulary.find(item => item.toLowerCase() === (alias[v.toLowerCase()] || v.toLowerCase())));
  return { values: [...new Set(values.filter((v): v is T => v !== undefined))], invalid: values.some(v => v === undefined) || parts.length !== new Set(parts.map(v => v.toLowerCase())).size };
}
export function normalizeCsv(csv: string, hash: string): Dataset {
  const parsed = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: 'greedy', transformHeader: h => h.trim() });
  if (!parsed.meta.fields || requiredHeaders.some(h => !parsed.meta.fields!.includes(h)) || parsed.meta.fields.length !== requiredHeaders.length) throw new Error('CSV headers do not match the supported 31-column schema.');
  if (parsed.errors.length) throw new Error(`Malformed CSV: ${parsed.errors[0].message}`);
  const ids = new Map<string, number>();
  for (const row of parsed.data) ids.set(row.manufacturer_id.trim(), (ids.get(row.manufacturer_id.trim()) || 0) + 1);
  const records = parsed.data.map((raw, index): Manufacturer => {
    const issues: Manufacturer['issues'] = [];
    let quarantined = false;
    const issue = (code: string, message: string, quarantine = false) => { issues.push({ code, message }); quarantined ||= quarantine; };
    const id = raw.manufacturer_id.trim();
    if (!id || (ids.get(id) || 0) > 1) issue('identity_conflict', 'Manufacturer identity is missing or occurs on multiple source rows; all affected rows are quarantined.', true);
    const processes = list(raw.processes, PROCESSES);
    const materials = list(raw.materials, MATERIALS, { aluminum: 'aluminium' });
    const certificates = list(raw.certifications, CERTIFICATES);
    if (processes.invalid || materials.invalid || certificates.invalid || !processes.values.length || !materials.values.length) issue('invalid_capabilities', 'An unsupported, duplicate or missing capability label requires correction.', true);
    if (Number(raw.process_count) !== processes.values.length || Number(raw.certification_count) !== certificates.values.length) issue('list_count_mismatch', 'Reported list counts disagree with capability lists.', true);
    if (!processes.values.includes(raw.primary_process as typeof PROCESSES[number])) issue('primary_process_mismatch', 'Primary process is not in the process list.', true);
    const min = numeric(raw.min_order_qty), max = numeric(raw.max_order_qty);
    if (!positiveInt(min) || !positiveInt(max) || min > max || raw.order_range.trim() !== `${min}-${max}`) issue('invalid_order_range', 'Order limits are invalid or disagree with the displayed order range.', true);
    const days = numeric(raw.lead_time_days), weeks = numeric(raw.lead_time_weeks);
    let leadDays: number | null = null;
    if (!raw.lead_time_days.trim() && !raw.lead_time_weeks.trim()) issue('missing_lead_time', 'Production lead time is not recorded.');
    else if ((days !== null && !positiveInt(days)) || (weeks !== null && weeks <= 0) || (days !== null && weeks !== null && days !== weeks * 7) || (raw.lead_time_days.trim() && days === null) || (raw.lead_time_weeks.trim() && weeks === null)) issue('invalid_lead_time', 'Lead time fields are invalid or disagree; timing is unknown.');
    else { const derived = days ?? (weeks === null ? null : weeks * 7); if (positiveInt(derived) && derived <= 3650) leadDays = derived; else issue('invalid_lead_time', 'Lead time cannot be represented as valid calendar days.'); }
    let onTime = numeric(raw.on_time_delivery_pct);
    if (onTime === null || onTime < 0 || onTime > 100) { issue(onTime === null ? 'missing_delivery_history' : 'invalid_delivery_history', 'On-time delivery is unavailable; the raw value is retained and cannot improve rank.'); onTime = null; }
    const expiryResult = dateSchema.safeParse(raw.certification_expiry.trim());
    if (!expiryResult.success) issue('invalid_certificate_date', 'Certificate expiry is missing or invalid.');
    if (!dateSchema.safeParse(raw.last_audit_date.trim()).success) issue('invalid_audit_date', 'Last audit date is missing or invalid.');
    const capacity = numeric(raw.capacity_units_per_month), exportYears = numeric(raw.export_experience_years);
    if (capacity === null || !Number.isInteger(capacity) || capacity < 0) issue('invalid_capacity', 'Nominal monthly capacity is unavailable.');
    if (exportYears === null || exportYears < 0) issue('invalid_export_history', 'General export history is unavailable.');
    for (const key of ['name', 'country', 'city', 'state_name', 'status']) if (!raw[key]?.trim()) issue('missing_identity_field', `Missing company field: ${key}.`, true);
    return { id: id || `MISSING-ROW-${index + 2}`, name: raw.name.trim() || 'Unnamed supplier', sourceRow: index + 2,
      city: raw.city.trim() || 'Unknown', state: raw.state_name.trim() || 'Unknown', country: raw.country.trim() || 'Unknown', status: raw.status.trim().toLowerCase() || 'unknown',
      processes: processes.values, materials: materials.values, certificates: certificates.values,
      minQty: positiveInt(min) ? min : 0, maxQty: positiveInt(max) ? max : 0,
      leadDays, expiry: expiryResult.success ? expiryResult.data : null, onTime,
      capacity: capacity !== null && Number.isInteger(capacity) && capacity >= 0 ? capacity : null,
      exportYears: exportYears !== null && exportYears >= 0 ? exportYears : null, quarantined, issues, raw };
  });
  const counts: Record<string, number> = {};
  for (const row of records) for (const code of new Set(row.issues.map(v => v.code))) counts[code] = (counts[code] || 0) + 1;
  const quarantined = records.filter(v => v.quarantined).length;
  return datasetSchema.parse({ version: DATA_VERSION, hash, records, quality: { total: records.length, retained: records.length - quarantined, quarantined, counts } });
}
