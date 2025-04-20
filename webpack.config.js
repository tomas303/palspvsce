//@ts-check

'use strict';

const path = require('path');

/** @typedef {import('webpack').Configuration} WebpackConfig */

/** @type {WebpackConfig} */
const config = {
  target: 'node', // VS Code extensions run in a Node.js-context
  mode: 'none', // this leaves the source code as close as possible to the original
  entry: './src/extension.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2',
    devtoolModuleFilenameTemplate: '../[resource-path]'
  },
  devtool: 'nosources-source-map', // create a source map that points to the original source file
  externals: {
    vscode: 'commonjs vscode', // the vscode-module is created on-the-fly and must be excluded
    // Exclude node modules that might cause issues
    'node-fetch': 'commonjs node-fetch',
    'encoding': 'commonjs encoding',
    'keytar': 'commonjs keytar'
  },
  resolve: {
    extensions: ['.ts', '.js'],
    mainFields: ['main']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              compilerOptions: {
                "module": "es6"
              }
            }
          }
        ]
      }
    ]
  },
  performance: {
    hints: false // disable performance hints as the extension is small
  },
  optimization: {
    minimize: false // don't minimize for better debuggability
  }
};

module.exports = config;
