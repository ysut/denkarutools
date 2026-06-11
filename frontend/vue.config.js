const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: true,
  lintOnSave: false,
  productionSourceMap: false,
  chainWebpack: config => {
    config.plugin('html').tap(args => {
      args[0].title = 'denkarutools'
      return args
    })
  },
  devServer: {
    proxy: {
      '/api': { target: 'http://localhost:8080' }
    }
  }
})
