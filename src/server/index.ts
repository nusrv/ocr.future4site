import fs from 'node:fs/promises';
import { createApp } from './app';
import { config } from './config';

fs.mkdir(config.STORAGE_PATH, { recursive: true }).then(() => {
  const app = createApp();
  app.listen(config.PORT, () => console.log(`Future OCR listening on port ${config.PORT}`));
}).catch((error) => { console.error('Unable to initialize storage', error); process.exitCode = 1; });
