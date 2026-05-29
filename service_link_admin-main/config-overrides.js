var path = require('path');
const webpack = require('webpack');
const { override, fixBabelImports, addWebpackAlias } = require('customize-cra');

// CRA strips `compilerOptions.paths` from tsconfig.json on start. ForkTsCheckerWebpackPlugin
// reads that file, so point it at a config that keeps paths for typechecking only.
function pointForkTsCheckerAtTypecheckConfig(config) {
  const plugin = config.plugins.find(
    (p) => p && p.constructor && p.constructor.name === 'ForkTsCheckerWebpackPlugin'
  );
  if (plugin) {
    plugin.tsconfig = path.resolve(__dirname, 'tsconfig.typecheck.json');
  }
  return config;
}

function prependToEntry(entry, polyfillPath) {
  if (typeof entry === 'string') {
    return entry === polyfillPath ? entry : [polyfillPath, entry];
  }
  if (Array.isArray(entry)) {
    return entry.includes(polyfillPath) ? entry : [polyfillPath, ...entry];
  }
  return entry;
}

function addProcessBrowserPolyfill(config) {
  const polyfillPath = path.resolve(__dirname, 'src/polyfills.ts');

  if (config.entry) {
    if (typeof config.entry === 'object' && !Array.isArray(config.entry)) {
      Object.keys(config.entry).forEach((key) => {
        config.entry[key] = prependToEntry(config.entry[key], polyfillPath);
      });
    } else {
      config.entry = prependToEntry(config.entry, polyfillPath);
    }
  }

  config.plugins = config.plugins || [];
  config.plugins.push(
    new webpack.ProvidePlugin({
      process: 'process/browser.js',
    }),
  );
  return config;
}

module.exports = override(
  fixBabelImports('import', {
    libraryName: 'antd',
    libraryDirectory: 'es',
    style: 'css',
  }),
  addWebpackAlias({
    '@app/lib': path.resolve(__dirname, 'src/library'),
    '@app': path.resolve(__dirname, 'src'),
  }),
  pointForkTsCheckerAtTypecheckConfig,
  addProcessBrowserPolyfill,
);
