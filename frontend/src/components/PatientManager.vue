<template>
  <div class="manager-container">
    <h1>患者管理</h1>
    <div class="add-form">
      <h3>患者の追加・更新（同じIDなら上書き）</h3>
      <div class="form-row">
        <input v-model.trim="newPatient.id" placeholder="ID (例: P004)">
        <input v-model="newPatient.name" placeholder="氏名">
        <input v-model.number="newPatient.age" type="number" placeholder="年齢">
        <input v-model="newPatient.disease" placeholder="病名 (例: 卵巣癌 IIIC期)" class="disease-input">
        <button class="btn-save" @click="savePatient">保存</button>
      </div>
    </div>

    <table class="patient-table">
      <thead>
        <tr><th>ID</th><th>名前</th><th>年齢</th><th>病名</th><th>最終受診日</th><th></th></tr>
      </thead>
      <tbody>
        <tr v-for="p in patients" :key="p.id">
          <td>{{ p.id }}</td>
          <td>{{ p.name }}</td>
          <td>{{ p.age }}</td>
          <td>{{ p.disease }}</td>
          <td>{{ p.last_visit }}</td>
          <td class="cell-actions">
            <button class="btn-edit" @click="editPatient(p)">編集</button>
            <button class="btn-delete" @click="deletePatient(p)">削除</button>
          </td>
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
      newPatient: this.emptyPatient()
    }
  },
  mounted() { this.loadData(); },
  methods: {
    emptyPatient() {
      return { id: '', name: '', age: '', disease: '', last_visit: new Date().toISOString().split('T')[0] };
    },
    loadData() {
      fetch('/api/patients')
        .then(res => res.json())
        .then(data => { this.patients = data; })
        .catch(err => alert("患者データの読み込みに失敗しました: " + err));
    },
    savePatient() {
      if (!this.newPatient.id) {
        alert("IDを入力してください。");
        return;
      }
      fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.assign({}, this.newPatient, { age: Number(this.newPatient.age) || 0 }))
      })
      .then(res => {
        if (!res.ok) throw new Error("ステータス " + res.status);
        this.newPatient = this.emptyPatient();
        this.loadData();
      })
      .catch(err => alert("保存に失敗しました: " + err));
    },
    editPatient(p) {
      this.newPatient = Object.assign(this.emptyPatient(), p);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    deletePatient(p) {
      if (!confirm(`「${p.name}」(${p.id}) を削除します。よろしいですか？`)) return;
      fetch('/api/patients?id=' + encodeURIComponent(p.id), { method: 'DELETE' })
        .then(res => {
          if (!res.ok) throw new Error("ステータス " + res.status);
          this.loadData();
        })
        .catch(err => alert("削除に失敗しました: " + err));
    }
  }
}
</script>

<style scoped>
.manager-container { max-width: 980px; margin: auto; padding: 20px; }
h1 { color: #00493c; }
.add-form { background: #fff; border: 1px solid #cfe0da; padding: 20px; margin-bottom: 20px; border-radius: 10px; }
.form-row { display: flex; flex-wrap: wrap; }
.form-row > * { margin: 0 10px 8px 0; }
.form-row input { padding: 9px; border: 1px solid #c8c8c8; border-radius: 6px; font-size: 1em; }
.disease-input { flex-grow: 1; min-width: 200px; }
.btn-save { padding: 9px 24px; background: #00715d; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; }
.btn-save:hover { opacity: 0.88; }
.patient-table { width: 100%; border-collapse: collapse; background: #fff; }
th, td { border: 1px solid #cfe0da; padding: 12px; text-align: left; }
th { background: #e6f2ee; color: #00493c; }
.cell-actions { white-space: nowrap; }
.btn-edit, .btn-delete { border: 1px solid #ccc; border-radius: 5px; padding: 5px 12px; cursor: pointer; margin-right: 6px; background: #f4f6f5; }
.btn-delete { color: #b03030; }
</style>
