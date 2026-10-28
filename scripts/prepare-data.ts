import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { normalizeCsv } from '../src/lib/data/normalize.ts';
const source = await readFile(new URL('../veridia_csv.csv', import.meta.url));
const dataset = normalizeCsv(source.toString('utf8'), createHash('sha256').update(source).digest('hex'));
await mkdir(new URL('../data/', import.meta.url), { recursive: true });
await writeFile(new URL('../data/prepared.json', import.meta.url), JSON.stringify(dataset));
await writeFile(new URL('../data/quality.json', import.meta.url), JSON.stringify({ hash: dataset.hash, ...dataset.quality }, null, 2) + '\n');
console.log(JSON.stringify({ hash: dataset.hash, ...dataset.quality }, null, 2));
