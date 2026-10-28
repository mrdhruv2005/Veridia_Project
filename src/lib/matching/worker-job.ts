import { workerRequestSchema, type Dataset, type WorkerResponse } from '../schema';
import { match } from './match';

export function runWorkerJob(dataset: Dataset, message: unknown): WorkerResponse {
  const parsed = workerRequestSchema.safeParse(message);
  const revision = parsed.success ? parsed.data.revision : (typeof message === 'object' && message !== null && 'revision' in message && Number.isSafeInteger(message.revision) ? Number(message.revision) : -1);
  if (!parsed.success) return { type: 'error', revision, message: 'Invalid matching request. Review the requirement and try again.' };
  if (parsed.data.datasetHash !== dataset.hash) return { type: 'error', revision, message: 'Dataset version is unavailable. Reload the application before recalculating.' };
  try { return { type: 'result', revision, result: match(dataset, parsed.data.requirement) }; }
  catch { return { type: 'error', revision, message: 'Matching failed. Review the requirement and retry.' }; }
}
export function isCurrentRevision(current: number, response: { revision: number }): boolean { return current === response.revision; }
