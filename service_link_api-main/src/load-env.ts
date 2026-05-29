import * as dotenv from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';

/** Resolve .env whether you run from repo root, `service_link_api-main`, or `dist/src`. */
const envPaths = [
  join(process.cwd(), '.env'),
  join(__dirname, '..', '..', '.env'),
  join(__dirname, '..', '.env'),
];

for (const p of envPaths) {
  if (existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}
