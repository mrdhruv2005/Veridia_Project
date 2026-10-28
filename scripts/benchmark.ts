import { readFile, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { cpus } from 'node:os';
import { buyerA, buyerB, datasetSchema } from '../src/lib/schema.ts';
import { match } from '../src/lib/matching/match.ts';
const data = datasetSchema.parse(JSON.parse(await readFile(new URL('../data/prepared.json', import.meta.url), 'utf8')));
const requests = [buyerA('2026-10-27'), buyerB('2026-10-27')];
for (let i = 0; i < 10; i++) match(data, requests[i % 2]);
const durations = Array.from({ length: 100 }, (_, i) => { const start = performance.now(); match(data, requests[i % 2]); return performance.now() - start; }).sort((a,b) => a-b);
const result = { engine: `Node ${process.version}`, cpu: cpus()[0].model, rows: data.records.length, samples: durations.length, warmups: 10,
  p50Ms: Number(durations[49].toFixed(2)), p95Ms: Number(durations[94].toFixed(2)), maxMs: Number(durations[99].toFixed(2)),
  scope: 'Pure matching, alternating Buyer A/B, excludes normalization, worker startup, transfer and rendering. Local mock-data timing; not a scalability claim.' };
await writeFile(new URL('../docs/benchmark.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
