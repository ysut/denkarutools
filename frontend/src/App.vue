<template>
  <div id="app">
    <h1>患者一覧 (NASデータ)</h1>
    <table border="1" style="margin: auto; border-collapse: collapse; width: 80%;">
      <thead>
        <tr>
          <th>ID</th>
          <th>名前</th>
          <th>年齢</th>
          <th>最終受診日</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="patient in patients" :key="patient.id">
          <td>{{ patient.id }}</td>
          <td>{{ patient.name }}</td>
          <td>{{ patient.age }}歳</td>
          <td>{{ patient.last_visit }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
export default {
  data() {
    return {
      patients: []
    }
  },
  mounted() {
    fetch('http://localhost:8080/api/patients')
      .then(response => response.json())
      .then(data => {
        this.patients = data;
      })
      .catch(err => console.error("通信エラー:", err));
  }
}
</script>

<style>
#app { font-family: sans-serif; text-align: center; margin-top: 40px; }
th { background-color: #f2f2f2; padding: 10px; }
td { padding: 10px; }
</table >