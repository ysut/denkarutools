// fetch polyfill for IE11 (hospital EMR terminals)
import 'whatwg-fetch'
import Vue from 'vue'
import App from './App.vue'

Vue.config.productionTip = false

new Vue({
  render: h => h(App),
}).$mount('#app')
