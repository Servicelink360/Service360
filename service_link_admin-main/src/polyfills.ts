// Browser shim for deps / dev overlay that read `process.env` (no npm `process` import).
export {};

(function installProcessShim() {
  if (typeof globalThis === 'undefined') return;
  const root = globalThis as { process?: { env: Record<string, string | undefined> } };
  if (!root.process) {
    root.process = { env: { NODE_ENV: 'development' } };
    return;
  }
  if (!root.process.env) {
    root.process.env = { NODE_ENV: 'development' };
    return;
  }
  if (root.process.env.NODE_ENV == null) {
    root.process.env = { ...root.process.env, NODE_ENV: 'development' };
  }
})();
