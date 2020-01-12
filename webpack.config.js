const path = require('path')
const webpack = require('webpack')
const CopyWebpackPlugin = require('copy-webpack-plugin')

module.exports = {
  mode: "production",
  target: "electron-main",
  entry: './main.js',
  output: {
    path: path.resolve(__dirname, './build'),
    filename: "main.js"
  },
  plugins: [
    // 让 moment.js 中的语言文件，按需加载。使用的时候配置即可。没有导入的语言文件不会被加载。
    // 默认情况下，加载moment.js会导入全部的语言文件。
    new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
    // 将package.json文件移到构建目录下。
    new CopyWebpackPlugin([
      {
        from: path.resolve(__dirname, './package.json'),
        to: path.resolve(__dirname, './build')
      }
    ]),
  ],
  node: {
    __dirname: false
  }
}
