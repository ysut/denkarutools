<template>
  <div class="manager-container">
    <h1>患者管理アプリ</h1>
    <div class="add-form">
      <h3>新規患者追加</h3>
      <input v-model="newPatient.id" placeholder="ID (例: P004)">
      <input v-model="newPatient.name" placeholder="氏名">
      <input v-model.number="newPatient.age" type="number" placeholder="年齢">
      <button @click="savePatient">保存</button>
    </div>

    <table class="patient-table">
      <thead>
        <tr><th>ID</th><th>名前</th><th>年齢</th><th>最終受診日</th></tr>
      </thead>
      <tbody>
        <tr v-for="p in patients" :key="p.id">
          <td>{{ p.id }}</td><td>{{ p.name }}</td><td>{{ p.age }}</td><td>{{ p.last_visit }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
export default {
  data() {
    return {
      patients: [],
      newPatient: { id: '', name: '', age: '', last_visit: '2026-05-06' }
    }
  },
  mounted() { this.loadData(); },
  methods: {
    loadData() {
      fetch('http://localhost:8080/api/patients')
        .then(res => res.json()).then(data => this.patients = data);
    },
    savePatient() {
      fetch('http://localhost:8080/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.newPatient)
      }).then(() => {
        this.newPatient = { id: '', name: '', age: '', last_visit: '2026-05-06' };
        this.loadData();
      });
    }
  }
}
</script>

<style scoped>
.manager-container { padding: 20px; }
.add-form { background: #f0f2f5; padding: 20px; margin-bottom: 20px; border-radius: 8px; }
.patient-table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
th { background: #fafafa; }
</style>