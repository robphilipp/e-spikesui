const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const ThreadsPlugin = require('threads-plugin');
const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = [
    new MonacoWebpackPlugin(),
    new ForkTsCheckerWebpackPlugin(),
    new ThreadsPlugin({
        target: 'electron-node-worker'
    }),
    new CopyPlugin({
        patterns: [
            {from: path.resolve(__dirname, 'src', 'resources'), to: 'resources'}
        ]
    })
];
