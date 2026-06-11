<template>
  <div class="summary-container">
    <h1>術前サマリー作成アプリ</h1>

    <div class="section search-box">
      <label><strong>患者IDでNASから読み込み：</strong></label>
      <input v-model="searchId" placeholder="例: P001" style="width: 150px;">
      <button @click="loadSummary" class="btn-secondary">読み込み</button>
      <span v-if="loadStatus" class="status-text">{{ loadStatus }}</span>
    </div>

    <div class="form-grid">
      <div class="form-group">
        <label>患者ID *</label>
        <input v-model="form.id" placeholder="必須">
      </div>
      <div class="form-group">
        <label>年齢 (歳)</label>
        <input type="number" v-model.number="form.age">
      </div>
      <div class="form-group">
        <label>Gravida / Para</label>
        <div class="gp-inputs">
          G: <input type="number" v-model.number="form.gravida" style="width: 50px;">
          P: <input type="number" v-model.number="form.para" style="width: 50px;">
        </div>
      </div>
      <div class="form-group full-width">
        <label>主訴</label>
        <input v-model="form.chiefComplaint" placeholder="自由記入">
      </div>
      <div class="form-group full-width">
        <label>既往歴</label>
        <textarea v-model="form.pastHistory" rows="2" placeholder="自由記入"></textarea>
      </div>
      <div class="form-group full-width">
        <label>手術歴</label>
        <textarea v-model="form.surgicalHistory" rows="2" placeholder="自由記入"></textarea>
      </div>

      <div class="form-group full-width section-title">📋 病理・細胞診結果</div>
      
      <div class="form-group-medical">
        <label>子宮頸部細胞診</label>
        <div class="med-row">
          <input type="date" v-model="form.cervicalCytologyDate" class="date-input">
          <input type="text" v-model="form.cervicalCytology" placeholder="結果（例: NILM, HSIL）" class="result-input">
        </div>
      </div>
      <div class="form-group-medical">
        <label>子宮頸部組織診</label>
        <div class="med-row">
          <input type="date" v-model="form.cervicalBiopsyDate" class="date-input">
          <input type="text" v-model="form.cervicalBiopsy" placeholder="結果（例: CIN3, Squamous CC）" class="result-input">
        </div>
      </div>
      <div class="form-group-medical">
        <label>子宮内膜細胞診 ★追加</label>
        <div class="med-row">
          <input type="date" v-model="form.endometrialCytologyDate" class="date-input">
          <input type="text" v-model="form.endometrialCytology" placeholder="結果" class="result-input">
        </div>
      </div>
      <div class="form-group-medical">
        <label>子宮内膜組織診 ★追加</label>
        <div class="med-row">
          <input type="date" v-model="form.endometrialBiopsyDate" class="date-input">
          <input type="text" v-model="form.endometrialBiopsy" placeholder="結果（例: Endometrioid Ca）" class="result-input">
        </div>
      </div>

      <div class="form-group full-width section-title">📷 画像検査所見 ★追加</div>

      <div class="form-group full-width-medical">
        <label>CT</label>
        <div class="med-row">
          <input type="date" v-model="form.ctDate" class="date-input">
          <textarea v-model="form.ctFindings" rows="2" placeholder="CT所見（後腹膜リンパ節、遠隔転移など）" class="result-input-text"></textarea>
        </div>
      </div>

      <div class="form-group full-width-medical">
        <label>MRI</label>
        <div class="med-row">
          <input type="date" v-model="form.mriDate" class="date-input">
          <textarea v-model="form.mriFindings" rows="2" placeholder="MRI所見（局所進展、筋層浸潤、頸部浸潤など）" class="result-input-text"></textarea>
        </div>
      </div>

      <div class="form-group full-width-medical">
        <label>FDG-PET/CT</label>
        <div class="med-row">
          <input type="date" v-model="form.petDate" class="date-input">
          <textarea v-model="form.petFindings" rows="2" placeholder="PET/CT所見（集積部位、SUVmaxなど）" class="result-input-text"></textarea>
        </div>
      </div>
    </div>

    <div class="actions">
      <button @click="saveSummary" class="btn-primary">NASにJSON保存</button>
      <button @click="copyToClipboard" class="btn-success">サマリーをクリップボードにコピー</button>
    </div>
  </div>
</template>

<script>
import { copyText } from '../utils/clipboard.js';

export default {
  data() {
    return {
      searchId: '',
      loadStatus: '',
      form: {
        id: '', age: '', gravida: '', para: '', chiefComplaint: '', pastHistory: '', surgicalHistory: '',
        cervicalCytologyDate: '', cervicalCytology: '',
        cervicalBiopsyDate: '', cervicalBiopsy: '',
        endometrialCytologyDate: '', endometrialCytology: '',
        endometrialBiopsyDate: '', endometrialBiopsy: '',
        ctDate: '', ctFindings: '',
        mriDate: '', mriFindings: '',
        petDate: '', petFindings: ''
      }
    }
  },
  methods: {
    loadSummary() {
      if (!this.searchId) {
        alert("検索する患者IDを入力してください。");
        return;
      }
      this.loadStatus = '読み込み中...';
      fetch(`/api/preop-summary?id=${this.searchId}`)
        .then(res => {
          if (!res.ok) throw new Error("データなし");
          return res.json();
        })
        .then(data => {
          // 既存データに新しい項目がない場合でもバインドが崩れないようにマージ
          this.form = Object.assign({}, this.defaultForm(), data);
          this.loadStatus = '読み込み成功';
        })
        .catch(() => {
          this.loadStatus = 'データなし（新規作成）';
          const savedId = this.searchId;
          this.clearForm();
          this.form.id = savedId;
        });
    },
    saveSummary() {
      if (!this.form.id) {
        alert("保存には患者IDが必須です。");
        return;
      }
      fetch('/api/preop-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.form)
      })
      .then(res => {
        if (res.ok) {
          alert("NASにサマリーを保存しました。");
        } else {
          alert("保存に失敗しました。");
        }
      })
      .catch(err => alert("通信エラー: " + err));
    },
    copyToClipboard() {
      const f = this.form;
      const text = `【術前サマリー】
■ 患者ID: ${f.id || '-'}
■ 年齢: ${f.age ? f.age + '歳' : '-'}
■ 産科既往: G ${f.gravida !== '' ? f.gravida : '-'} / P ${f.para !== '' ? f.para : '-'}
■ 主訴:
${f.chiefComplaint || '-'}

■ 既往歴:
${f.pastHistory || '-'}

■ 手術歴:
${f.surgicalHistory || '-'}

■ 子宮頸部細胞診: [${f.cervicalCytologyDate || '-'}] ${f.cervicalCytology || '-'}
■ 子宮頸部組織診: [${f.cervicalBiopsyDate || '-'}] ${f.cervicalBiopsy || '-'}
■ 子宮内膜細胞診: [${f.endometrialCytologyDate || '-'}] ${f.endometrialCytology || '-'}
■ 子宮内膜組織診: [${f.endometrialBiopsyDate || '-'}] ${f.endometrialBiopsy || '-'}

■ 画像検査所見:
・CT [${f.ctDate || '-'}]:
  ${f.ctFindings || '-'}
  
・MRI [${f.mriDate || '-'}]:
  ${f.mriFindings || '-'}
  
・FDG-PET/CT [${f.petDate || '-'}]:
  ${f.petFindings || '-'}
`;
      copyText(text)
        .then(() => alert("クリップボードにコピーしました！"))
        .catch(() => alert("クリップボードへのコピーに失敗しました。"));
    },
    defaultForm() {
      return {
        id: '', age: '', gravida: '', para: '', chiefComplaint: '', pastHistory: '', surgicalHistory: '',
        cervicalCytologyDate: '', cervicalCytology: '',
        cervicalBiopsyDate: '', cervicalBiopsy: '',
        endometrialCytologyDate: '', endometrialCytology: '',
        endometrialBiopsyDate: '', endometrialBiopsy: '',
        ctDate: '', ctFindings: '',
        mriDate: '', mriFindings: '',
        petDate: '', petFindings: ''
      };
    },
    clearForm() {
      this.form = this.defaultForm();
    }
  }
}
</script>

<style scoped>
.summary-container { max-width: 800px; margin: auto; padding: 20px; text-align: left; background: #fff; }
.section { margin-bottom: 20px; padding: 15px; background: #f0f2f5; border-radius: 8px; }
.search-box { background: #e6f7ff; border: 1px solid #91d5ff; }
.status-text { margin-left: 15px; font-size: 0.9em; color: #1890ff; font-weight: bold; }
/* flex (not grid) for IE11 compatibility; full-width items take 100% */
.form-grid { display: flex; flex-wrap: wrap; margin: 0 -8px 25px; }
.form-grid > div { box-sizing: border-box; margin: 8px; width: calc(50% - 16px); }
.form-group { display: flex; flex-direction: column; }
.form-group-medical { display: flex; flex-direction: column; background: #fdfdfd; border: 1px solid #e8e8e8; padding: 8px; border-radius: 4px; }
.full-width-medical { width: calc(100% - 16px) !important; display: flex; flex-direction: column; background: #fdfdfd; border: 1px solid #e8e8e8; padding: 8px; border-radius: 4px; }
.full-width { width: calc(100% - 16px) !important; }
.section-title { font-size: 1.1em; font-weight: bold; border-bottom: 2px solid #35495e; padding-bottom: 5px; margin-top: 15px; color: #35495e; }
.gp-inputs { display: flex; align-items: center; margin-top: 5px; }
.gp-inputs input { margin-right: 5px; margin-left: 3px; }
.med-row { display: flex; margin-top: 5px; align-items: flex-start; }
.med-row > .date-input { margin-right: 10px; }
.date-input { width: 130px; padding: 6px; border: 1px solid #d9d9d9; border-radius: 4px; }
.result-input { flex-grow: 1; padding: 6px; border: 1px solid #d9d9d9; border-radius: 4px; }
.result-input-text { flex-grow: 1; padding: 6px; border: 1px solid #d9d9d9; border-radius: 4px; font-family: sans-serif; }
label { font-weight: bold; font-size: 0.9em; color: #444; }
input, textarea { padding: 8px; border: 1px solid #d9d9d9; border-radius: 4px; margin-top: 5px; }
.actions { display: flex; }
.actions button { margin-right: 15px; }
.actions button:last-child { margin-right: 0; }
button { padding: 12px 20px; border: none; border-radius: 6px; font-size: 1em; font-weight: bold; cursor: pointer; }
.btn-primary { background: #00715d; color: white; }
.btn-secondary { background: #00493c; color: white; padding: 8px 15px; font-size: 0.9em; }
.btn-success { background: #52c41a; color: white; flex-grow: 1; }
button:hover { opacity: 0.85; }
</style>