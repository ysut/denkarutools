<template>
  <div id="app">
    <nav class="nav-bar no-print">
      <div class="brand" @click="currentView = 'TopMenu'">denkarutools</div>
      <button @click="currentView = 'TopMenu'" :class="{ active: currentView === 'TopMenu' }">🏠 トップ</button>
      <button @click="currentView = 'Chemocalc'" :class="{ active: currentView === 'Chemocalc' }">🧪 化学療法計算</button>
      <button @click="currentView = 'ChemoSchedule'" :class="{ active: currentView === 'ChemoSchedule' }">📅 化学療法スケジュール</button>
      <button @click="currentView = 'DrugHoldChecker'" :class="{ active: currentView === 'DrugHoldChecker' }">💊 術前休薬チェック</button>
      <button @click="currentView = 'LabFormatter'" :class="{ active: currentView === 'LabFormatter' }">🧾 検査結果整形</button>
      <button @click="currentView = 'PatientManager'" :class="{ active: currentView === 'PatientManager' }">📋 患者管理</button>
      <button @click="currentView = 'PreopSummary'" :class="{ active: currentView === 'PreopSummary' }">📝 術前サマリー</button>
    </nav>
    <component :is="currentView" @changeView="currentView = $event" />
  </div>
</template>

<script>
import TopMenu from './components/TopMenu.vue'
import Chemocalc from './components/Chemocalc.vue'
import ChemoSchedule from './components/ChemoSchedule.vue'
import DrugHoldChecker from './components/DrugHoldChecker.vue'
import LabFormatter from './components/LabFormatter.vue'
import PatientManager from './components/PatientManager.vue'
import PreopSummary from './components/PreopSummary.vue'

export default {
  components: { TopMenu, Chemocalc, ChemoSchedule, DrugHoldChecker, LabFormatter, PatientManager, PreopSummary },
  data() {
    return { currentView: 'TopMenu' }
  }
}
</script>

<style>
/* Color theme inspired by the JSGO (婦人科腫瘍学会) site: calm deep greens.
   Palette (literal values for IE11 — no CSS custom properties):
   primary #00715d / dark #00493c / light #e6f2ee / border #cfe0da / bg #f6f9f8 */
body { margin: 0; background: #f6f9f8; }
#app {
  font-family: "Hiragino Kaku Gothic ProN", "Hiragino Sans", "Yu Gothic", Meiryo, sans-serif;
  color: #2c3e50;
  font-size: 16px;
}

/* flex `gap` is not supported by IE11 — use margins instead */
.nav-bar {
  background: #00493c;
  padding: 10px 16px 6px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}
.brand { color: #fff; font-weight: bold; letter-spacing: 0.08em; margin: 0 12px 4px 0; cursor: pointer; }
.nav-bar button {
  margin: 0 8px 4px 0;
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
  font-size: 0.95em;
  background: #fff;
  color: #00493c;
}
.nav-bar button:hover { background: #e6f2ee; }
.nav-bar button.active { background: #00715d; color: white; }
</style>
