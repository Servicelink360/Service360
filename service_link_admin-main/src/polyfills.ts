// Some dependencies still expect a Node-like `process.env` in the browser.
// CRA used to shim this; newer bundlers may not.
export {};

if (typeof window !== 'undefined') {
  const g = globalThis as unknown as { process?: { env?: Record<string, any> } };
  if (!g.process) g.process = { env: {} };
  if (!g.process.env) g.process.env = {};
  // Keep common fields some libs read.
  if (g.process.env.NODE_ENV == null) g.process.env.NODE_ENV = 'development';
}
