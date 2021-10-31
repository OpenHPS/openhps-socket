const TerserPlugin = require('terser-webpack-plugin');
const path = require('path');
const pkg = require("./package.json");

const LIBRARY_NAME = pkg.name;
const PROJECT_NAME = pkg.name.replace("@", "").replace("/", "-");

const defaultConfig = env => ({
  mode: env.prod ? "production" : "development",
  devtool: 'source-map',
  resolve: {
    alias: {
      typescript: false,
    },
    fallback: {
      path: false,
      fs: false,
      os: false,
      util: false,
      stream: false,
      url: false,
      assert: false,
      tls: false,
      net: false
    }
  },
  optimization: {
    minimize: env.prod,
    minimizer: [
      new TerserPlugin({
        parallel: true,
        terserOptions: {
          keep_classnames: true,
          sourceMap: true,
        }
      })
    ],
    portableRecords: true,
    usedExports: true,
    providedExports: true
  },
  performance: {
    hints: false,
    maxEntrypointSize: 300000,
    maxAssetSize: 300000
  },
});

const bundle = (env, module, prefix = "", name = PROJECT_NAME) => ({
  name,
  entry: `./lib/${module ? "esm" : "cjs"}/${prefix}index.js`,
  output: {
    path: path.resolve(__dirname, 'lib'),
    filename: `web/${name}${module ? ".es" : ""}${env.prod ? ".min" : ""}.js`,
    library: module ? undefined : LIBRARY_NAME,
    libraryTarget: module ? "module" : "umd",
    umdNamedDefine: !module,
    globalObject: module ? undefined : `(typeof self !== 'undefined' ? self : this)`,
    environment: { module },
  },
  experiments: {
    outputModule: module,
  },
  externalsType: module ? "module" : undefined,
  externals: {
    '@openhps/core': "./" + (module ? "openhps-core.es" : "openhps-core") + (env.prod ? ".min" : "") + ".js",
  },
  devtool: 'source-map',
  plugins: [],
  ...defaultConfig(env)
});

module.exports = env => [
  bundle(env, true, "client/", "openhps-socket-client"),
  bundle(env, false, "client/", "openhps-socket-client"),
];
