<template>
  <div id="app">
    <nav class="nav-bar no-print">
      <div class="brand" @click="go('TopMenu')">denkarutools</div>
      <button @click="go('TopMenu')" :class="{ active: currentView === 'TopMenu' }">🏠 トップ</button>
      <button @click="go('Chemocalc')" :class="{ active: currentView === 'Chemocalc' }">🧪 化学療法計算</button>
      <button @click="go('ChemoSchedule')" :class="{ active: currentView === 'ChemoSchedule' }">📅 化学療法スケジュール</button>
      <button @click="go('DrugHoldChecker')" :class="{ active: currentView === 'DrugHoldChecker' }">💊 術前休薬チェック</button>
      <button @click="go('LabFormatter')" :class="{ active: currentView === 'LabFormatter' }">🧾 検査結果整形</button>
      <button @click="go('PatientManager')" :class="{ active: currentView === 'PatientManager' }">📋 患者管理</button>
      <button @click="go('PreopSummary')" :class="{ active: currentView === 'PreopSummary' }">📝 術前サマリー</button>
      <button @click="go('WardBoard')" :class="{ active: currentView === 'WardBoard' }">🛏 入院ボード</button>
      <button @click="go('FibroidSim3D')" :class="{ active: currentView === 'FibroidSim3D' }">🧊 筋腫3Dシミュ</button>
    </nav>
    <component :is="currentView" ref="view" @changeView="go($event)" />
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
import WardBoard from './components/WardBoard.vue'
import FibroidSim3D from './components/FibroidSim3D.vue'

export default {
  components: { TopMenu, Chemocalc, ChemoSchedule, DrugHoldChecker, LabFormatter, PatientManager, PreopSummary, WardBoard, FibroidSim3D },
  data() {
    return { currentView: 'TopMenu' }
  },
  methods: {
    // Central view switch. If the active component exposes confirmLeave() and it
    // returns false (e.g. unsaved changes, user cancelled), stay put.
    // No optional chaining — IE11 must parse this.
    go(target) {
      if (target === this.currentView) return;
      var c = this.$refs.view;
      if (c && typeof c.confirmLeave === 'function' && !c.confirmLeave()) return;
      this.currentView = target;
    }
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
