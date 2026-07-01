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
      // In docker compose the backend is a separate container reachable by its
      // service name. "localhost" here would point at the dev server itself and
      // proxy-loop until the forwarded headers overflow into a 431.
      '/api': { target: 'http://backend:8080' }
    }
  }
})
