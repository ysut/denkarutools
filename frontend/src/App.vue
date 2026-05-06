<template>
  <div id="app">
    <nav class="nav-bar">
      <button @click="currentView = 'TopMenu'">トップ</button>
      <button @click="currentView = 'Chemocalc'">化学療法計算</button>
      <button @click="currentView = 'PatientManager'">患者管理</button>
    </nav>
    <hr>
    <component :is="currentView" @changeView="currentView = $event" />
  </div>
</template>

<script>
import TopMenu from './components/TopMenu.vue'
import Chemocalc from './components/Chemocalc.vue'
import PatientManager from './components/PatientManager.vue'

export default {
  components: { TopMenu, Chemocalc, PatientManager },
  data() { return { currentView: 'TopMenu' } }
}
</script>

<style>
.nav-bar { background: #35495e; padding: 10px; display: flex; gap: 10px; justify-content: center; }
.nav-bar button { padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }
#app { font-family: sans-serif; color: #2c3e50; }
</style>