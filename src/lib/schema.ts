import { z } from 'zod';

export const POLICY_VERSION = 'veridia-1.0.0';
export const DATA_VERSION = 'veridia-csv-1';
export const MATERIALS = ['aluminium', 'stainless steel', 'mild steel', 'brass', 'copper', 'cast iron', 'titanium', 'ABS', 'nylon'] as const;
export const PROCESSES = ['CNC milling', 'CNC turning', 'sheet metal', 'casting', 'EDM', 'forging', 'grinding', 'injection moulding', 'welding'] as const;
export const PROCESS_CHOICES = ['CNC machining', ...PROCESSES] as const;
export const CERTIFICATES = ['ISO 9001', 'ISO 14001', 'ISO 13485', 'IATF 16949', 'AS9100'] as const;
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => {
  const d = new Date(`${v}T00:00:00.000Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === v;
}, 'Use a real calendar date.');
const cleanText = z.string().trim().min(1).max(300);
export const requirementSchema = z.object({
  material: z.preprocess(v => typeof v === 'string' && v.toLowerCase().trim() === 'aluminum' ? 'aluminium' : v, z.enum(MATERIALS)),
  processes: z.array(z.enum(PROCESS_CHOICES)).min(1, 'Choose at least one process.').max(10).refine(v => new Set(v).size === v.length, 'Duplicate processes.'),
  quantity: z.number().int().min(1).max(1_000_000_000),
  certificates: z.array(z.enum(CERTIFICATES)).max(5).refine(v => new Set(v).size === v.length, 'Duplicate certificates.'),
  maxLeadDays: z.number().int().min(1).max(730),
  deadlineMeaning: z.enum(['production', 'arrival']),
  destination: z.string().trim().max(120),
  asOfDate: dateSchema.refine(v => v >= '2000-01-01' && v <= '2100-12-31', 'Use a date from 2000 through 2100.'),
  monthlyVolume: z.number().int().min(1).max(1_000_000_000).nullable(),
  repeatUntil: dateSchema.nullable(),
}).strict().superRefine((v, ctx) => {
  if (v.repeatUntil && (v.repeatUntil < v.asOfDate || v.repeatUntil > '2100-12-31')) ctx.addIssue({ code: 'custom', path: ['repeatUntil'], message: 'Repeat horizon must be on or after the evaluation date and no later than 2100.' });
});
export type Requirement = z.infer<typeof requirementSchema>;
export const issueSchema = z.object({ code: cleanText, message: cleanText }).strict();
export const manufacturerSchema = z.object({
  id: z.string().regex(/^[A-Z][A-Z0-9_-]{0,99}$/, 'Use a supported manufacturer identifier.'), name: cleanText, sourceRow: z.number().int().min(2),
  city: cleanText, state: cleanText, country: cleanText, status: cleanText,
  processes: z.array(z.enum(PROCESSES)).max(9), materials: z.array(z.enum(MATERIALS)).max(9), certificates: z.array(z.enum(CERTIFICATES)).max(5),
  minQty: z.number().int().nonnegative(), maxQty: z.number().int().nonnegative(),
  leadDays: z.number().int().min(1).max(3650).nullable(), expiry: dateSchema.nullable(),
  onTime: z.number().min(0).max(100).nullable(), capacity: z.number().int().nonnegative().nullable(),
  exportYears: z.number().nonnegative().nullable(), quarantined: z.boolean(),
  issues: z.array(issueSchema).max(40), raw: z.record(z.string().max(100), z.string().max(2000)),
}).strict();
export type Manufacturer = z.infer<typeof manufacturerSchema>;
export const datasetSchema = z.object({
  version: z.literal(DATA_VERSION), hash: z.string().regex(/^[a-f0-9]{64}$/),
  records: z.array(manufacturerSchema).max(10000),
  quality: z.object({ total: z.number().int(), retained: z.number().int(), quarantined: z.number().int(), counts: z.record(z.string(), z.number().int()) }).strict(),
}).strict();
export type Dataset = z.infer<typeof datasetSchema>;
export const checkSchema = z.object({ field: cleanText, status: z.enum(['pass', 'fail', 'unknown']), text: z.string().max(1000) }).strict();
export const candidateSchema = z.object({
  supplier: manufacturerSchema,
  eligibility: z.enum(['qualifies', 'needs-confirmation', 'excluded']),
  readyDate: dateSchema.nullable(), checks: z.array(checkSchema).max(20),
  warnings: z.array(z.string().max(1000)).max(30),
}).strict();
export type Candidate = z.infer<typeof candidateSchema>;
export const evaluationSchema = z.object({
  requirement: requirementSchema, datasetHash: z.string().regex(/^[a-f0-9]{64}$/), datasetVersion: z.string().max(100), policyVersion: z.string().max(100),
  qualified: z.array(candidateSchema).max(10000), near: z.array(candidateSchema).max(12),
  totals: z.object({ evaluated: z.number().int().nonnegative(), qualified: z.number().int().nonnegative(), needsConfirmation: z.number().int().nonnegative(), excluded: z.number().int().nonnegative(), quarantined: z.number().int().nonnegative() }).strict(),
  exclusionReasons: z.record(z.string().max(100), z.number().int().nonnegative()),
}).strict();
export type Evaluation = z.infer<typeof evaluationSchema>;
export const workerRequestSchema = z.object({ revision: z.number().int().nonnegative(), datasetHash: z.string().regex(/^[a-f0-9]{64}$/), policyVersion: z.literal(POLICY_VERSION), requirement: requirementSchema }).strict();
export const workerResponseSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('result'), revision: z.number().int(), result: evaluationSchema }).strict(),
  z.object({ type: z.literal('error'), revision: z.number().int(), message: z.string().max(500) }).strict(),
]);
export type WorkerResponse = z.infer<typeof workerResponseSchema>;
export const utcToday = () => new Date().toISOString().slice(0, 10);
export const buyerA = (date: string): Requirement => ({ material: 'aluminium', processes: ['CNC machining'], quantity: 1000, certificates: ['ISO 9001'], maxLeadDays: 42, deadlineMeaning: 'production', destination: 'Germany', asOfDate: date, monthlyVolume: null, repeatUntil: null });
export const buyerB = (date: string): Requirement => ({ ...buyerA(date), material: 'stainless steel', processes: ['sheet metal'], quantity: 1500 });
