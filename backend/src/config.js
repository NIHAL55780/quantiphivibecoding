import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(currentDir, '..');

export const config = {
  port: Number(process.env.PORT) || 4000,
  databasePath: process.env.DATABASE_PATH || path.join(backendRoot, 'data', 'subscriptions.db'),
  corsOrigin: process.env.CORS_ORIGIN || '*',
};
