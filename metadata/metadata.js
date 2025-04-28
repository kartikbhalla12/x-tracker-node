import { Worker } from 'worker_threads';
import path, { dirname } from 'path';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const getMetadata = (url) => {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, 'meta.worker.js'), {
      workerData: { url }
    });

    worker.on('message', resolve);
    worker.on('error', (error) => {
      console.error('Worker error:', error);
      reject(error);
    });
    worker.on('exit', code => {
      if (code !== 0)
        reject(new Error(`Worker stopped with exit code ${code}`));
    });
  });
}
