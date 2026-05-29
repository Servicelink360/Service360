import { existsSync } from 'fs';
import { dirname, join } from 'path';

/** Walk up from `startDir` to the directory that contains `package.json` (app project root). */
function findPackageRoot(startDir: string): string {
  let dir = startDir;
  for (let i = 0; i < 12; i++) {
    if (existsSync(join(dir, 'package.json'))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  return startDir;
}

/**
 * Directory used for `public/` file storage (uploads, PDFs). Must match static `/public/upload/`
 * and {@link PublicPdfController} paths.
 * Prefer `process.cwd()/public` when present; otherwise `public/` next to the repo root found
 * from this file’s location (works for both `dist/main.js` and `dist/src/main.js` layouts).
 */
export function getPublicRoot(): string {
  const cwdPublic = join(process.cwd(), 'public');
  if (existsSync(cwdPublic)) {
    return cwdPublic;
  }
  const projectRoot = findPackageRoot(__dirname);
  return join(projectRoot, 'public');
}
