<template>
  <div class="chemo-container">
    <div class="no-print">
      <h1>化学療法スケジュール表の作成</h1>
      <p class="lead">上から順番に入力していくだけで、印刷用のスケジュール表ができます。</p>

      <!-- ① 患者選択 -->
      <div class="step-box">
        <div class="step-title"><span class="step-num">1</span> 患者IDを入力してください</div>
        <div class="row">
          <input v-model.trim="patientId" placeholder="例: P001" class="big-input" style="width: 160px;"
                 @keyup.enter="lookupPatient" @blur="lookupPatient">
          <button class="btn-secondary" @click="lookupPatient">患者を呼び出す</button>
          <span v-if="patientStatus" class="status-text">{{ patientStatus }}</span>
        </div>
        <div class="row">
          <label>氏名：<input v-model="patientName" placeholder="自動入力（手で直せます）" class="big-input"></label>
          <label>病名：<input v-model="patientDisease" placeholder="自動入力（手で直せます）" class="big-input"></label>
        </div>
      </div>

      <!-- ② レジメン選択 -->
      <div class="step-box">
        <div class="step-title"><span class="step-num">2</span> レジメン（治療の種類）を選んでください</div>
        <div v-if="regimenLoadError" class="error-text">{{ regimenLoadError }}</div>
        <div class="regimen-cards">
          <div v-for="reg in regimens" :key="reg.id"
               class="regimen-card" :class="{ selected: selectedRegimenId === reg.id }"
               @click="selectRegimen(reg.id)">
            <div class="regimen-name">{{ reg.name }}</div>
            <div class="regimen-meta">{{ reg.target }}</div>
            <div class="regimen-meta">{{ reg.cycle }}</div>
            <span v-if="reg.daily" class="daily-badge">連日投与</span>
          </div>
        </div>
        <p class="hint">※ レジメンの追加・修正は <code>regimens.toml</code> を編集してください（再起動不要）。</p>
      </div>

      <!-- ③ 日程 -->
      <div class="step-box" v-if="selectedRegimen">
        <div class="step-title"><span class="step-num">3</span> 投与開始日とコースを入力してください</div>
        <div class="row">
          <label>投与開始日：<input type="date" v-model="startDate" class="big-input"></label>
          <label>コース：第
            <input type="number" v-model.number="courseNumber" min="1" class="big-input" style="width: 70px;">
            コース目
          </label>
        </div>
      </div>

      <!-- ④ 内容の調整 -->
      <div class="step-box" v-if="selectedRegimen">
        <div class="step-title">
          <span class="step-num">4</span> 必要なら点滴の内容を直してください
          <button class="btn-plain" @click="rebuildDays">元に戻す</button>
        </div>
        <p class="hint">ここでの変更はこの用紙だけの一時的な変更です（レジメンの定義は変わりません）。</p>

        <div v-for="(day, di) in editableDays" :key="di" class="edit-day">
          <div class="edit-day-head">
            <span class="day-badge">{{ day.label }}</span>
            <strong>{{ formatDate(day.offset) }}</strong>
            <button class="btn-plain danger" v-if="editableDays.length > 1" @click="removeDay(di)">この日を削除</button>
          </div>
          <div v-for="(step, si) in day.steps" :key="si" class="edit-step">
            <div class="edit-step-time">
              時間：<input v-model="step.time" placeholder="例: 10:30-11:00" class="big-input" style="width: 150px;">
              <button class="btn-plain danger" v-if="day.steps.length > 1" @click="removeStep(day, si)">この枠を削除</button>
            </div>
            <div v-for="(drug, gi) in step.drugs" :key="gi" class="edit-drug-row">
              <input v-model="drug.text" placeholder="例: パクリタキセル 230 mg" class="big-input drug-input">
              <button class="btn-plain danger" @click="removeDrug(step, gi)">✕</button>
            </div>
            <button class="btn-plain" @click="addDrug(step)">＋ 薬剤を追加</button>
          </div>
          <button class="btn-plain" @click="addStep(day)">＋ 時間枠を追加</button>
        </div>

        <div class="row" style="margin-top: 10px;">
          <label style="flex-grow:1;">備考（用紙の下に印刷されます）：
            <textarea v-model="note" rows="2" class="big-input" style="width: 100%;"
                      placeholder="例: 当日は朝食を済ませてお越しください。"></textarea>
          </label>
        </div>
      </div>

      <!-- ⑤ 印刷 -->
      <div class="step-box print-step" v-if="selectedRegimen">
        <div class="step-title"><span class="step-num">5</span> 下の仕上がりを確認して印刷してください</div>
        <button class="btn-print" @click="printSheet">🖨 この用紙を印刷する</button>
      </div>
    </div>

    <!-- ===== 印刷用シート（画面ではプレビュー表示） ===== -->
    <div class="print-sheet" v-if="selectedRegimen">
      <div class="sheet-header">
        <h2>化学療法スケジュール</h2>
        <div class="sheet-issued">発行日: {{ todayLabel }}</div>
      </div>

      <table class="sheet-patient">
        <tbody>
          <tr>
            <th>お名前</th><td class="patient-name">{{ patientName || '\u3000' }} 様</td>
            <th>ID</th><td>{{ patientId || '\u3000' }}</td>
          </tr>
          <tr>
            <th>病名</th><td>{{ patientDisease || '\u3000' }}</td>
            <th>コース</th><td>第 {{ courseNumber }} コース</td>
          </tr>
          <tr>
            <th>治療</th><td colspan="3">{{ selectedRegimen.name }}<span class="sheet-cycle">（{{ selectedRegimen.cycle }}）</span></td>
          </tr>
        </tbody>
      </table>

      <div v-if="selectedRegimen.daily" class="sheet-daily-banner">
        ★ この治療は <strong>連日（複数日）</strong> の通院・投与があります。下のすべての日付をご確認ください。
        <div class="sheet-date-strip">
          <span v-for="(day, i) in editableDays" :key="i" class="date-chip">
            {{ day.label }}：{{ formatDate(day.offset) }}
          </span>
        </div>
      </div>

      <div v-for="(day, di) in editableDays" :key="'sheet-' + di" class="sheet-day">
        <div class="sheet-day-head">
          <span class="day-badge print-badge">{{ day.label }}</span>
          <span class="sheet-date">{{ formatDate(day.offset) }}</span>
        </div>
        <table class="sheet-table">
          <tbody>
            <tr v-for="(step, si) in day.steps" :key="si">
              <td class="time-cell">{{ step.time }}</td>
              <td class="drug-cell">
                <div v-for="(drug, gi) in step.drugs" :key="gi">{{ drug.text }}</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="note" class="sheet-note">
        <strong>備考：</strong>{{ note }}
      </div>
      <div class="sheet-footer">
        体調がすぐれないとき（発熱・強い吐き気など）は、来院前に病棟・外来へご連絡ください。
      </div>
    </div>
  </div>
</template>

<script>
const WEEKDAYS_JA = ['日', '月', '火', '水', '木', '金', '土'];

export default {
  data() {
    return {
      patients: [],
      patientId: '',
      patientName: '',
      patientDisease: '',
      patientStatus: '',
      regimens: [],
      regimenLoadError: '',
      selectedRegimenId: '',
      startDate: new Date().toISOString().split('T')[0],
      courseNumber: 1,
      editableDays: [],
      note: ''
    };
  },
  computed: {
    selectedRegimen() {
      return this.regimens.find(r => r.id === this.selectedRegimenId) || null;
    },
    todayLabel() {
      return this.dateLabel(new Date());
    }
  },
  mounted() {
    this.loadPatients();
    this.loadRegimens();
  },
  methods: {
    loadPatients() {
      fetch('/api/patients')
        .then(res => res.json())
        .then(data => { this.patients = data; })
        .catch(() => { /* lookup simply won't auto-fill */ });
    },
    loadRegimens() {
      fetch('/api/regimens')
        .then(res => {
          if (!res.ok) throw new Error('status ' + res.status);
          return res.json();
        })
        .then(data => { this.regimens = data; })
        .catch(err => {
          this.regimenLoadError = 'レジメン定義（regimens.toml）の読み込みに失敗しました: ' + err.message;
        });
    },
    lookupPatient() {
      if (!this.patientId) return;
      const found = this.patients.find(p => p.id === this.patientId);
      if (found) {
        this.patientName = found.name;
        this.patientDisease = found.disease || '';
        this.patientStatus = '✔ 患者情報を読み込みました';
      } else {
        this.patientStatus = '登録がありません（氏名・病名を手入力してください）';
      }
    },
    selectRegimen(id) {
      this.selectedRegimenId = id;
      this.rebuildDays();
    },
    rebuildDays() {
      const reg = this.selectedRegimen;
      if (!reg) { this.editableDays = []; return; }
      this.editableDays = (reg.days || []).map((day, i) => ({
        label: day.label || 'Day ' + (i + 1),
        offset: Number(day.offset) || 0,
        steps: (day.steps || []).map(step => ({
          time: step.time || '',
          drugs: (step.drugs || []).map(text => ({ text }))
        }))
      }));
    },
    addDrug(step) { step.drugs.push({ text: '' }); },
    removeDrug(step, i) { step.drugs.splice(i, 1); },
    addStep(day) { day.steps.push({ time: '', drugs: [{ text: '' }] }); },
    removeStep(day, i) { day.steps.splice(i, 1); },
    removeDay(i) { this.editableDays.splice(i, 1); },
    formatDate(offset) {
      if (!this.startDate) return '（開始日未設定）';
      // IE11 renders <input type="date"> as plain text, so validate the format.
      if (!/^\d{4}-\d{2}-\d{2}$/.test(this.startDate)) return '（開始日は 2026-06-18 の形式で入力）';
      const d = new Date(this.startDate + 'T00:00:00');
      if (isNaN(d.getTime())) return '（開始日を確認してください）';
      d.setDate(d.getDate() + offset);
      return this.dateLabel(d);
    },
    dateLabel(d) {
      return `${d.getMonth() + 1}月${d.getDate()}日(${WEEKDAYS_JA[d.getDay()]})`;
    },
    printSheet() {
      window.print();
    }
  }
};
</script>

<style scoped>
.chemo-container { max-width: 860px; margin: auto; padding: 20px; text-align: left; }
.lead { color: #555; }
.step-box { background: #fff; border: 1px solid #cfe0da; border-radius: 10px; padding: 18px; margin-bottom: 18px; }
/* flex `gap` and CSS grid are avoided below for IE11 compatibility */
.step-title { font-size: 1.15em; font-weight: bold; color: #00493c; margin-bottom: 12px; display: flex; align-items: center; flex-wrap: wrap; }
.step-title > * { margin-right: 10px; }
.step-num { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: 50%; background: #00715d; color: #fff; font-size: 0.95em; flex-shrink: 0; }
.row { display: flex; align-items: center; flex-wrap: wrap; margin-bottom: 8px; }
.row > * { margin-right: 15px; margin-bottom: 4px; }
.big-input { font-size: 1.05em; padding: 8px; border: 1px solid #c8c8c8; border-radius: 6px; }
.status-text { color: #00715d; font-weight: bold; }
.error-text { color: #c0392b; font-weight: bold; }
.hint { color: #777; font-size: 0.88em; }

.regimen-cards { display: flex; flex-wrap: wrap; margin: 0 -6px; }
.regimen-card { flex: 1 1 240px; min-width: 240px; margin: 6px; box-sizing: border-box; border: 2px solid #cfe0da; border-radius: 10px; padding: 14px; cursor: pointer; position: relative; background: #fafdfb; }
.regimen-card:hover { border-color: #00715d; }
.regimen-card.selected { border-color: #00715d; background: #e6f2ee; box-shadow: 0 0 0 2px #00715d inset; }
.regimen-name { font-weight: bold; margin-bottom: 6px; color: #00493c; }
.regimen-meta { font-size: 0.85em; color: #666; }
.daily-badge { position: absolute; top: 10px; right: 10px; background: #b3541e; color: #fff; font-size: 0.75em; font-weight: bold; padding: 3px 8px; border-radius: 10px; }

.edit-day { border: 1px solid #cfe0da; border-radius: 8px; padding: 12px; margin-bottom: 12px; background: #fbfdfc; }
.edit-day-head { display: flex; align-items: center; margin-bottom: 8px; }
.edit-day-head > * { margin-right: 10px; }
.day-badge { background: #00715d; color: #fff; font-weight: bold; padding: 4px 12px; border-radius: 14px; font-size: 0.9em; }
.edit-step { border-left: 4px solid #00715d; padding: 8px 12px; margin: 8px 0; background: #fff; }
.edit-step-time { margin-bottom: 6px; }
.edit-drug-row { display: flex; margin-bottom: 5px; }
.edit-drug-row .drug-input { margin-right: 6px; }
.drug-input { flex-grow: 1; }
.btn-plain { background: #eef3f1; border: 1px solid #ccd; border-radius: 6px; padding: 5px 10px; cursor: pointer; font-size: 0.85em; }
.btn-plain.danger { color: #c0392b; }
.btn-secondary { background: #00715d; color: #fff; border: none; border-radius: 6px; padding: 9px 16px; font-weight: bold; cursor: pointer; }
.btn-print { width: 100%; font-size: 1.3em; padding: 16px; background: #00493c; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; }
.btn-print:hover, .btn-secondary:hover { opacity: 0.88; }

/* ===== 印刷シート（画面プレビュー兼用） ===== */
.print-sheet { background: #fff; border: 1px solid #999; box-shadow: 0 2px 10px rgba(0,0,0,0.15); padding: 28px; margin: 25px 0; }
.sheet-header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 3px solid #00715d; padding-bottom: 6px; margin-bottom: 14px; }
.sheet-header h2 { margin: 0; color: #00493c; letter-spacing: 0.15em; }
.sheet-issued { font-size: 0.85em; color: #555; }
.sheet-patient { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
.sheet-patient th { background: #e6f2ee; width: 90px; text-align: left; }
.sheet-patient th, .sheet-patient td { border: 1px solid #888; padding: 8px 10px; }
.patient-name { font-size: 1.2em; font-weight: bold; }
.sheet-cycle { font-size: 0.85em; color: #555; }
.sheet-daily-banner { border: 2px solid #b3541e; background: #fdf3ec; color: #7a3a12; padding: 10px 14px; border-radius: 8px; margin-bottom: 14px; font-size: 0.95em; }
.sheet-date-strip { margin-top: 8px; display: flex; flex-wrap: wrap; }
.date-chip { background: #fff; border: 1px solid #b3541e; border-radius: 12px; padding: 3px 10px; font-weight: bold; font-size: 0.9em; margin: 0 8px 4px 0; }
.sheet-day { margin-bottom: 16px; page-break-inside: avoid; }
.sheet-day-head { display: flex; align-items: center; margin-bottom: 6px; }
.sheet-day-head > * { margin-right: 12px; }
.print-badge { font-size: 1em; }
.sheet-date { font-size: 1.25em; font-weight: bold; }
.sheet-table { width: 100%; border-collapse: collapse; }
.sheet-table td { border: 1px solid #888; padding: 8px 12px; vertical-align: top; }
.time-cell { width: 150px; font-weight: bold; white-space: nowrap; background: #f7faf8; }
.drug-cell { line-height: 1.7; }
.sheet-note { border: 1px solid #888; padding: 10px; margin-top: 14px; min-height: 40px; }
.sheet-footer { margin-top: 14px; font-size: 0.85em; color: #444; border-top: 1px dashed #999; padding-top: 8px; }
</style>

<style>
/* Print: show only the schedule sheet (must be unscoped to reach body/nav). */
@media print {
  body * { visibility: hidden; }
  .print-sheet, .print-sheet * { visibility: visible; }
  .print-sheet { position: absolute; left: 0; top: 0; width: 100%; border: none; box-shadow: none; margin: 0; padding: 10mm; }
}
</style>
