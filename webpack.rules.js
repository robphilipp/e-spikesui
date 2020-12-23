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
        transpileOnly: true,
        compilerOptions: {
          module: "esnext"
        }
      }
    }
  },
  {
    // test: /\.ttf$/,
    test: /\.(png|woff|woff2|eot|svg|ttf)$/,
    use: ['file-loader'],
  },
  {
    test: /\.css$/i,
    use: ['style-loader', 'css-loader', 'less-loader'],
    include:[path.resolve(__dirname, '..', 'node_modules/monaco-editor')],
  },
];
