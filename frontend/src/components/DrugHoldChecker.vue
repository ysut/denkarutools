<template>
  <div class="checker-container">
    <h1>術前休薬チェッカー</h1>
    <p class="lead">
      内服中の薬を下の枠に入力して「チェックする」を押してください。<br>
      区切りは <strong>改行・カンマ（, 、）・句点（。）・スラッシュ・2つ以上のスペース</strong> が使えます。
    </p>

    <div class="input-box">
      <textarea v-model="inputText" rows="5" class="drug-textarea"
                placeholder="例:&#10;バイアスピリン 100mg、メトグルコ&#10;ヤーズ配合錠&#10;エパデール"></textarea>
      <div class="actions">
        <button class="btn-check" @click="check">✔ チェックする</button>
        <button class="btn-clear" @click="clearAll">入力を消す</button>
      </div>
    </div>

    <div v-if="checked" class="results">
      <h2>判定結果（{{ results.length }} 件）</h2>

      <div v-if="unknownCount > 0" class="warn-banner">
        ⚠ 判定できなかった薬が {{ unknownCount }} 件あります。薬剤部・添付文書で必ず確認してください。
      </div>

      <table class="result-table">
        <thead>
          <tr>
            <th>入力した薬</th>
            <th>分類・該当薬</th>
            <th>術前の休薬目安</th>
            <th>術後の再開目安</th>
            <th>注意点</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="(res, i) in results">
            <tr v-if="res.matches.length === 0" :key="'u' + i" class="row-unknown">
              <td class="cell-input">{{ res.token }}</td>
              <td colspan="4">該当データなし — 休薬の要否を個別に確認してください</td>
            </tr>
            <tr v-for="(rule, j) in res.matches" :key="i + '-' + j"
                :class="rowClass(rule)">
              <td class="cell-input">{{ j === 0 ? res.token : '〃' }}</td>
              <td><span class="cat-chip">{{ rule.category }}</span><br>{{ rule.drug }}</td>
              <td class="cell-stop">{{ rule.stop }}</td>
              <td>{{ rule.resume }}</td>
              <td class="cell-note">{{ rule.note || '—' }}</td>
            </tr>
          </template>
        </tbody>
      </table>

      <div class="disclaimer">
        ※ この結果は一般的な<strong>目安</strong>です。最終的な休薬・再開の判断は、添付文書・各学会ガイドライン・
        施設の規定に基づき、主治医および処方医・麻酔科と相談のうえ決定してください。
      </div>
    </div>
  </div>
</template>

<script>
import { splitDrugInput, matchDrug } from '../data/drugHoldRules.js';

export default {
  data() {
    return {
      inputText: '',
      checked: false,
      results: []
    };
  },
  computed: {
    unknownCount() {
      return this.results.filter(r => r.matches.length === 0).length;
    }
  },
  methods: {
    check() {
      const tokens = splitDrugInput(this.inputText);
      if (tokens.length === 0) {
        alert('薬の名前を入力してください。');
        return;
      }
      this.results = tokens.map(token => ({
        token,
        matches: matchDrug(token)
      }));
      this.checked = true;
    },
    clearAll() {
      this.inputText = '';
      this.results = [];
      this.checked = false;
    },
    rowClass(rule) {
      if (/休薬しない|原則継続/.test(rule.stop)) return 'row-continue';
      return 'row-stop';
    }
  }
};
</script>

<style scoped>
.checker-container { max-width: 980px; margin: auto; padding: 20px; text-align: left; }
.lead { color: #555; line-height: 1.7; }
.input-box { background: #fff; border: 1px solid #cfe0da; border-radius: 10px; padding: 18px; }
.drug-textarea { width: 100%; box-sizing: border-box; font-size: 1.1em; padding: 12px; border: 1px solid #c8c8c8; border-radius: 8px; font-family: inherit; }
.actions { display: flex; margin-top: 12px; }
.actions .btn-check { margin-right: 12px; }
.btn-check { flex-grow: 1; font-size: 1.2em; padding: 14px; background: #00715d; color: #fff; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; }
.btn-clear { padding: 14px 20px; background: #eee; border: 1px solid #ccc; border-radius: 8px; cursor: pointer; }
.btn-check:hover { opacity: 0.88; }

.results { margin-top: 25px; }
.warn-banner { background: #fdf3e7; border: 2px solid #d9822b; color: #8a4b08; padding: 10px 14px; border-radius: 8px; margin-bottom: 12px; font-weight: bold; }
.result-table { width: 100%; border-collapse: collapse; background: #fff; }
.result-table th { background: #00493c; color: #fff; padding: 10px; font-size: 0.9em; }
.result-table td { border: 1px solid #ccc; padding: 10px; vertical-align: top; font-size: 0.95em; line-height: 1.6; }
.cell-input { font-weight: bold; white-space: nowrap; }
.cell-stop { font-weight: bold; }
.cell-note { font-size: 0.85em; color: #555; }
.cat-chip { display: inline-block; background: #e6f2ee; color: #00493c; border-radius: 10px; padding: 2px 10px; font-size: 0.8em; font-weight: bold; margin-bottom: 4px; }
.row-stop .cell-stop { color: #b03030; }
.row-continue .cell-stop { color: #1e6e3c; }
.row-unknown { background: #fff8f0; color: #8a4b08; font-weight: bold; }
.disclaimer { margin-top: 16px; padding: 12px; background: #f4f6f5; border-left: 5px solid #00715d; font-size: 0.9em; color: #444; line-height: 1.7; }
</style>
