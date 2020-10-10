const path = require('path');

module.exports = [
  // Add support for native node modules
  {
    test: /\.node$/,
    use: 'node-loader',
  },
  {
    test: /\.(m?js|node)$/,
    parser: { amd: false },
    use: {
      loader: '@marshallofsound/webpack-asset-relocator-loader',
      options: {
        outputAssetBase: 'native_modules',
      },
    },
  },
  {
    test: /\.tsx?$/,
    exclude: /(node_modules|\.webpack)/,
    use: {
      loader: 'ts-loader',
      options: {
        transpileOnly: true
      }
    }
  },
  {
    test: /\.ttf$/,
    use: ['file-loader'],
    include:[path.resolve(__dirname, '..', 'node_modules/monaco-editor')],
  },
  {
    test: /\.css$/i,
    use: ['to-string-loader', 'style-loader', 'css-loader', 'less-loader'],
    include:[path.resolve(__dirname, '..', 'node_modules/monaco-editor')],
  },
];
