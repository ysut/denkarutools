<template>
  <div class="container">
    <h1>denkarutools メニュー</h1>
    <div class="menu-grid">
      <div class="menu-card" @click="$emit('changeView', 'Chemocalc')">
        <h2>🧪 化学療法計算機</h2>
        <p>カルボプラチン・体表面積算出</p>
      </div>
      <div class="menu-card" @click="$emit('changeView', 'PatientManager')">
        <h2>📋 患者管理アプリ</h2>
        <p>NASデータ読み書き・管理</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {}
</script>

<style scoped>
.container { text-align: center; margin-top: 50px; }
.menu-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; max-width: 600px; margin: auto; }
.menu-card { padding: 40px; border: 1px solid #ddd; border-radius: 12px; cursor: pointer; background: #fdfdfd; transition: 0.3s; }
.menu-card:hover { background: #f0f7ff; transform: translateY(-5px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
</style>