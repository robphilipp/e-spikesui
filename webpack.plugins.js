const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const ThreadsPlugin = require('threads-plugin');

module.exports = [
  new MonacoWebpackPlugin(),
  new ForkTsCheckerWebpackPlugin(),
  new ThreadsPlugin(),
];
