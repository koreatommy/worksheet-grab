import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const ROOT = process.env.WSG_ROOT
  ? resolve(process.env.WSG_ROOT)
  : resolve(__dirname, '../../worksheet-grab');

export const OUT_DIR = join(__dirname, '../out');
export const DIST_DIR = join(__dirname, '../dist');
export const IS_PROD = process.env.NODE_ENV === 'production';
export const PORT = Number(process.env.API_PORT || process.env.PORT || 3000);
