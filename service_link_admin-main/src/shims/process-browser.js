/**
 * Minimal browser `process` for webpack ProvidePlugin (replaces npm `process` when absent).
 */
var proc = (module.exports = {});

proc.browser = true;
proc.env = {};
proc.argv = [];
proc.title = 'browser';
proc.version = '';
proc.versions = {};
proc.nextTick = function (fn) {
  setTimeout(fn, 0);
};

var globalProcess =
  (typeof globalThis !== 'undefined' && globalThis.process) ||
  (typeof window !== 'undefined' && window.process);

if (globalProcess && globalProcess.env) {
  proc.env = globalProcess.env;
}

if (!proc.env.NODE_ENV) {
  proc.env.NODE_ENV = 'development';
}
