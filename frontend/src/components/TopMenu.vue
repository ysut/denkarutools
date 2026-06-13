<template>
  <div class="container">
    <h1>denkarutools メニュー</h1>
    <p class="sub">使いたい機能のカードを押してください</p>
    <div class="menu-grid">
      <div class="menu-card" @click="$emit('changeView', 'Chemocalc')">
        <div class="icon">🧪</div>
        <h2>化学療法計算機</h2>
        <p>カルボプラチン・体表面積の投与量計算</p>
      </div>
      <div class="menu-card" @click="$emit('changeView', 'ChemoSchedule')">
        <div class="icon">📅</div>
        <h2>化学療法スケジュール</h2>
        <p>患者さん用スケジュール用紙の作成・印刷</p>
      </div>
      <div class="menu-card" @click="$emit('changeView', 'DrugHoldChecker')">
        <div class="icon">💊</div>
        <h2>術前休薬チェッカー</h2>
        <p>内服薬の手術前後の休薬・再開の目安</p>
      </div>
      <div class="menu-card" @click="$emit('changeView', 'LabFormatter')">
        <div class="icon">🧾</div>
        <h2>検査結果 整形ツール</h2>
        <p>検査結果の整形・単位付与・CTCAE Grade</p>
      </div>
      <div class="menu-card" @click="$emit('changeView', 'PatientManager')">
        <div class="icon">📋</div>
        <h2>患者管理</h2>
        <p>患者リストの登録・編集</p>
      </div>
      <div class="menu-card" @click="$emit('changeView', 'PreopSummary')">
        <div class="icon">📝</div>
        <h2>術前サマリー</h2>
        <p>術前情報の入力・保存・コピー</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {}
</script>

<style scoped>
.container { text-align: center; margin-top: 40px; padding: 0 20px; }
h1 { color: #00493c; }
.sub { color: #666; margin-bottom: 30px; }
/* flex (not grid) for IE11 compatibility */
.menu-grid { display: flex; flex-wrap: wrap; justify-content: center; max-width: 900px; margin: auto; }
.menu-card {
  width: 240px;
  margin: 10px;
  box-sizing: border-box;
  padding: 30px 20px;
  border: 1px solid #cfe0da;
  border-radius: 12px;
  cursor: pointer;
  background: #fff;
  transition: 0.2s;
}
.menu-card .icon { font-size: 2.2em; margin-bottom: 8px; }
.menu-card h2 { font-size: 1.15em; color: #00493c; margin: 6px 0; }
.menu-card p { color: #666; font-size: 0.9em; }
.menu-card:hover { background: #e6f2ee; transform: translateY(-4px); box-shadow: 0 4px 12px rgba(0, 73, 60, 0.15); border-color: #00715d; }
</style>
