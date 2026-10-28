import data from '../../data/prepared.json';
import { datasetSchema } from '../lib/schema';
import { runWorkerJob } from '../lib/matching/worker-job';
const parsed = datasetSchema.safeParse(data);
self.onmessage = (event: MessageEvent<unknown>) => {
  if (!parsed.success) {
    const value = event.data;
    const revision = typeof value === 'object' && value !== null && 'revision' in value && Number.isSafeInteger(value.revision) ? Number(value.revision) : -1;
    self.postMessage({ type: 'error', revision, message: 'The prepared dataset could not be loaded. Reload and retry.' });
    return;
  }
  self.postMessage(runWorkerJob(parsed.data, event.data));
};
