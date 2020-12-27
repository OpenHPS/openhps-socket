const PROJECT_NAME = "openhps-socket";
const LIBRARY_NAME = "@openhps/socket";

const path = require('path');

module.exports = env => [
{
  name: PROJECT_NAME,
  mode: env.prod ? "production" : "development",
  entry: `./dist/cjs/client/index.js`,
  devtool: 'source-map',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: `web/${PROJECT_NAME}${env.prod ? ".min" : ""}.${env.module ? 'mjs' : 'js'}`,
    library: LIBRARY_NAME,
    libraryTarget: 'umd',
    umdNamedDefine: true,
    globalObject: `(typeof self !== 'undefined' ? self : this)`,
  },
  optimization: {
    minimize: env.prod,
  },
  performance: {
    hints: false,
    maxEntrypointSize: 512000,
    maxAssetSize: 512000
  }, 
  externals: ["@openhps/core"],
}];