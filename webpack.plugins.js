const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');

module.exports = [
  // new MonacoWebpackPlugin(),
  new MonacoWebpackPlugin({
    // languages: ['json', 'javascript'],
    languages: ['typescript', 'javascript', 'css'],
  }),
  new ForkTsCheckerWebpackPlugin(),
];
