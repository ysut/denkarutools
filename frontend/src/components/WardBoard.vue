<template>
  <div class="ward-container">
    <div class="no-print">
      <h1>入院患者管理ボード</h1>
      <p class="lead">入院患者の日々の状態・申し送りを記録し、A4横向きで印刷できます。患者IDを入れると氏名・病名が自動で入ります。</p>

      <!-- 日付ナビゲーション -->
      <div class="step-box">
        <div class="board-nav">
          <button class="btn-plain" @click="prevDay">◀ 前日</button>
          <input type="date" v-model="boardDate" @change="onDatePicked" class="big-input date-input">
          <button class="btn-plain" @click="nextDay">翌日 ▶</button>
          <span class="weekday">{{ boardDateLabel }}</span>
          <button class="btn-plain" @click="carryForward">前日からコピー</button>
          <span class="spacer"></span>
          <button class="btn-secondary" @click="saveBoard">💾 保存</button>
          <button class="btn-plain" @click="previewMode = true">📄 PDFプレビュー</button>
          <button class="btn-print-sm" @click="printSheet">🖨 印刷</button>
        </div>
        <div class="board-status">
          <span v-if="saveStatus" class="status-text">{{ saveStatus }}</span>
          <span v-if="savedAt" class="muted">最終保存: {{ savedAtLabel }}</span>
          <span v-if="loadError" class="error-text">{{ loadError }}</span>
        </div>
        <div v-if="otherEditors.length" class="edit-warning">
          ⚠ この日付は現在 {{ otherEditorsLabel }} が編集中です。保存が前後すると競合する可能性があります。
        </div>
      </div>

      <!-- 編集テーブル -->
      <div class="step-box">
        <table class="edit-table">
          <thead>
            <tr>
              <th class="col-id">患者ID</th>
              <th class="col-name">氏名</th>
              <th class="col-disease">病名・病期</th>
              <th class="col-cat">区分</th>
              <th class="col-date">手術日 / 入院日</th>
              <th class="col-course">治療経過</th>
              <th class="col-todo">ToDoリスト</th>
              <th class="col-dc">退院予定日</th>
              <th class="col-next">次回外来</th>
              <th class="col-room">部屋</th>
              <th class="col-mark">本日<br>入院</th>
              <th class="col-del"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in rows" :key="i">
              <td>
                <input v-model.trim="row.patientId" class="cell-input" placeholder="P001"
                       @keyup.enter="lookupRow(row)" @blur="lookupRow(row)">
                <div v-if="row._status" class="row-status">{{ row._status }}</div>
              </td>
              <td><input v-model="row.name" class="cell-input"></td>
              <td><input v-model="row.disease" class="cell-input"></td>
              <td>
                <select v-model="row.category" class="cell-input">
                  <option value="surgery">手術</option>
                  <option value="chemo">化学療法</option>
                  <option value="RT">RT</option>
                  <option value="CCRT">CCRT</option>
                  <option value="other">その他</option>
                </select>
              </td>
              <td>
                <input v-if="row.category === 'surgery'" type="date" v-model="row.surgeryDate" class="cell-input">
                <input v-else type="date" v-model="row.admissionDate" class="cell-input">
              </td>
              <td><textarea v-model="row.course" rows="2" class="cell-input"></textarea></td>
              <td><textarea v-model="row.todo" rows="2" class="cell-input"></textarea></td>
              <td><input type="date" v-model="row.dischargePlan" class="cell-input"></td>
              <td><input type="date" v-model="row.nextVisit" class="cell-input"></td>
              <td><input v-model="row.room" class="cell-input"></td>
              <td class="center"><input type="checkbox" v-model="row.admitToday"></td>
              <td class="center"><button class="btn-plain danger" @click="removeRow(i)">✕</button></td>
            </tr>
            <tr v-if="rows.length === 0">
              <td colspan="12" class="empty-row">この日の入院患者はまだ登録されていません。下のボタンで追加してください。</td>
            </tr>
          </tbody>
        </table>
        <button class="btn-plain add-btn" @click="addRow">＋ 患者を追加</button>
      </div>
    </div>

    <!-- ===== 印刷用シート（画面ではプレビュー表示） ===== -->
    <div :class="{ 'preview-wrap': true, 'preview-overlay': previewMode }">
      <div v-if="previewMode" class="preview-toolbar no-print">
        <button class="btn-print-sm" @click="printSheet">🖨 印刷 / PDF保存</button>
        <button class="btn-plain" @click="previewMode = false">閉じる</button>
      </div>
    <div class="print-sheet">
      <div class="sheet-header">
        <h2>入院患者ボード</h2>
        <div class="sheet-issued">{{ boardDate }}（{{ boardWeekday }}）</div>
      </div>
      <table class="sheet-table">
        <colgroup>
          <col style="width: 7%"><col style="width: 9%"><col style="width: 13%"><col style="width: 8%">
          <col style="width: 21%"><col style="width: 16%"><col style="width: 8%"><col style="width: 8%"><col style="width: 5%">
        </colgroup>
        <thead>
          <tr>
            <th>患者ID</th><th>氏名</th><th>病名・病期</th><th>経過日数</th>
            <th>治療経過</th><th>ToDoリスト</th><th>退院予定日</th><th>次回外来</th><th>部屋</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in rows" :key="'p' + i" :class="{ 'admit-row': row.admitToday }">
            <td>{{ row.patientId }}</td>
            <td>
              <span v-if="row.admitToday" class="admit-badge">★本日入院</span>
              {{ row.name }}
            </td>
            <td>{{ row.disease }}</td>
            <td>{{ dayCountLabel(row) }}</td>
            <td class="text-cell">{{ row.course }}</td>
            <td class="text-cell">{{ row.todo }}</td>
            <td>{{ row.dischargePlan }}</td>
            <td>{{ row.nextVisit }}</td>
            <td>{{ row.room }}</td>
          </tr>
          <tr v-if="rows.length === 0">
            <td colspan="9" class="empty-row">登録された入院患者はありません。</td>
          </tr>
        </tbody>
      </table>
    </div>
    </div>
  </div>
</template>

<script>
const WEEKDAYS_JA = ['日', '月', '火', '水', '木', '金', '土'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const UNSAVED_MSG = '未保存の変更があります。保存せずに移動しますか？';
const HEARTBEAT_MS = 30000; // refresh the edit lock every 30s while dirty

// cleanRow strips the UI-only _status field before save / dirty comparison.
function cleanRow(r) {
  const c = Object.assign({}, r);
  delete c._status;
  return c;
}

function emptyRow() {
  return {
    patientId: '', name: '', disease: '', category: 'surgery',
    surgeryDate: '', admissionDate: '', admitToday: false,
    course: '', todo: '', dischargePlan: '', nextVisit: '', room: '',
    _status: ''
  };
}

// parseYMD returns a Date at local midnight, or null for malformed input.
// IE11 renders <input type="date"> as plain text, so the format is validated.
function parseYMD(s) {
  if (!s || !DATE_RE.test(s)) return null;
  const d = new Date(s + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
}

function toYMD(d) {
  const m = ('0' + (d.getMonth() + 1)).slice(-2);
  const day = ('0' + d.getDate()).slice(-2);
  return d.getFullYear() + '-' + m + '-' + day;
}

export default {
  data() {
    return {
      patients: [],
      boardDate: new Date().toISOString().split('T')[0],
      rows: [],
      savedAt: '',
      saveStatus: '',
      loadError: '',
      previewMode: false,
      savedSnapshot: '[]', // JSON of the last loaded/saved rows, for dirty check
      loadedDate: '',      // date currently loaded (to revert the picker on cancel)
      otherEditors: [],    // active locks held by other terminals for this date
      heartbeatTimer: null
    };
  },
  computed: {
    isDirty() {
      return JSON.stringify(this.rows.map(cleanRow)) !== this.savedSnapshot;
    },
    otherEditorsLabel() {
      return this.otherEditors.map(e => e.holder).join('、');
    },
    boardWeekday() {
      const d = parseYMD(this.boardDate);
      return d ? WEEKDAYS_JA[d.getDay()] : '';
    },
    boardDateLabel() {
      const d = parseYMD(this.boardDate);
      if (!d) return '（日付は 2026-06-18 の形式で入力）';
      return (d.getMonth() + 1) + '月' + d.getDate() + '日(' + WEEKDAYS_JA[d.getDay()] + ')';
    },
    savedAtLabel() {
      // savedAt is RFC3339; show date+time portion without parsing (IE11-safe).
      return this.savedAt.replace('T', ' ').slice(0, 16);
    }
  },
  watch: {
    // Hold the advisory edit lock exactly while there are unsaved changes.
    isDirty(now) {
      if (now) this.acquireLock();
      else this.releaseLock();
    }
  },
  mounted() {
    this.loadPatients();
    this.loadBoard();
    this._onBeforeUnload = this.onBeforeUnload.bind(this);
    window.addEventListener('beforeunload', this._onBeforeUnload);
  },
  beforeDestroy() {
    window.removeEventListener('beforeunload', this._onBeforeUnload);
    this.releaseLock();
  },
  methods: {
    loadPatients() {
      fetch('/api/patients')
        .then(res => res.json())
        .then(data => { this.patients = data; })
        .catch(() => { /* lookup simply won't auto-fill */ });
    },
    loadBoard() {
      if (!DATE_RE.test(this.boardDate)) {
        this.loadError = '日付は 2026-06-18 の形式で入力してください。';
        return;
      }
      this.loadError = '';
      this.saveStatus = '';
      fetch('/api/ward-board?date=' + encodeURIComponent(this.boardDate))
        .then(res => {
          if (!res.ok) throw new Error('status ' + res.status);
          return res.json();
        })
        .then(data => {
          this.rows = (data.rows || []).map(r => Object.assign(emptyRow(), r));
          this.savedAt = data.savedAt || '';
          // Record the clean baseline so isDirty starts false for the new date.
          this.savedSnapshot = JSON.stringify(this.rows.map(cleanRow));
          this.loadedDate = this.boardDate;
          this.fetchLockStatus();
        })
        .catch(err => { this.loadError = 'ボードの読み込みに失敗しました: ' + err.message; });
    },
    saveBoard() {
      if (!DATE_RE.test(this.boardDate)) {
        alert('日付は 2026-06-18 の形式で入力してください。');
        return;
      }
      // Strip the UI-only _status field before saving.
      const cleanRows = this.rows.map(cleanRow);
      this.saveStatus = '保存中...';
      fetch('/api/ward-board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: this.boardDate, rows: cleanRows, savedAt: '' })
      })
        .then(res => {
          if (!res.ok) throw new Error('status ' + res.status);
          this.saveStatus = '✔ 保存しました';
          this.loadBoard();
        })
        .catch(err => {
          this.saveStatus = '';
          alert('保存に失敗しました: ' + err.message);
        });
    },
    shiftDay(n) {
      const d = parseYMD(this.boardDate);
      if (!d) { alert('日付は 2026-06-18 の形式で入力してください。'); return; }
      if (this.isDirty && !confirm(UNSAVED_MSG)) return;
      this.releaseLock(); // release the old date's lock before switching
      d.setDate(d.getDate() + n);
      this.boardDate = toYMD(d);
      this.loadBoard();
    },
    prevDay() { this.shiftDay(-1); },
    nextDay() { this.shiftDay(1); },
    onDatePicked() {
      // v-model already updated boardDate; revert it if the user cancels.
      if (this.isDirty && !confirm(UNSAVED_MSG)) {
        this.boardDate = this.loadedDate;
        return;
      }
      this.releaseLock(); // loadedDate still points at the old date here
      this.loadBoard();
    },
    lookupRow(row) {
      if (!row.patientId) { row._status = ''; return; }
      const found = this.patients.find(p => p.id === row.patientId);
      if (found) {
        row.name = found.name;
        row.disease = found.disease || '';
        row._status = '';
      } else {
        row._status = '未登録（手入力可）';
      }
    },
    addRow() { this.rows.push(emptyRow()); },
    removeRow(i) { this.rows.splice(i, 1); },
    carryForward() {
      if (!DATE_RE.test(this.boardDate)) {
        alert('日付は 2026-06-18 の形式で入力してください。');
        return;
      }
      if (this.rows.length > 0 &&
          !confirm('現在のボードの内容を、前日の患者リストで置き換えます。よろしいですか？\n（本日入院マークはコピーされません）')) {
        return;
      }
      fetch('/api/ward-board?prior=' + encodeURIComponent(this.boardDate))
        .then(res => {
          if (!res.ok) throw new Error('status ' + res.status);
          return res.json();
        })
        .then(data => {
          const src = data.rows || [];
          if (src.length === 0) {
            alert('コピーできる前日のデータが見つかりませんでした。');
            return;
          }
          // Copy everything except the per-day 本日入院 mark (admitToday).
          this.rows = src.map(r => {
            const row = emptyRow();
            row.patientId = r.patientId || '';
            row.name = r.name || '';
            row.disease = r.disease || '';
            row.category = r.category || 'surgery';
            row.surgeryDate = r.surgeryDate || '';
            row.admissionDate = r.admissionDate || '';
            row.course = r.course || '';
            row.todo = r.todo || '';
            row.dischargePlan = r.dischargePlan || '';
            row.nextVisit = r.nextVisit || '';
            row.room = r.room || '';
            return row;
          });
          this.saveStatus = '前日の患者リストをコピーしました（未保存）';
        })
        .catch(err => { alert('前日コピーに失敗しました: ' + err.message); });
    },
    // daysBetween returns integer day difference (to - from), or null if invalid.
    daysBetween(fromYMD, toYMDStr) {
      const a = parseYMD(fromYMD);
      const b = parseYMD(toYMDStr);
      if (!a || !b) return null;
      return Math.round((b.getTime() - a.getTime()) / 86400000);
    },
    dayCountLabel(row) {
      if (row.category === 'surgery') {
        const diff = this.daysBetween(row.surgeryDate, this.boardDate);
        if (diff === null) return '—';
        if (diff < 0) return '術前';
        return '術後' + diff + '日';
      }
      const diff = this.daysBetween(row.admissionDate, this.boardDate);
      if (diff === null) return '—';
      if (diff < 0) return '入院前';
      return '入院' + (diff + 1) + '日目';
    },
    printSheet() { window.print(); },

    // ---- Unsaved-change guard & advisory edit lock ----------------------
    // The lock is keyed by loadedDate (the date currently shown). Lock methods
    // never use boardDate so they stay correct even when the date picker has
    // already changed boardDate ahead of the actual load.
    onBeforeUnload(e) {
      if (this.isDirty) { e.preventDefault(); e.returnValue = ''; }
    },
    // confirmLeave is called by App.vue before switching to another view.
    confirmLeave() {
      if (this.isDirty && !confirm(UNSAVED_MSG)) return false;
      this.releaseLock();
      return true;
    },
    applyOthers(data) {
      this.otherEditors = (data && data.others) || [];
    },
    fetchLockStatus() {
      const date = this.loadedDate;
      if (!DATE_RE.test(date)) return;
      fetch('/api/ward-lock?date=' + encodeURIComponent(date))
        .then(res => (res.ok ? res.json() : { others: [] }))
        .then(data => this.applyOthers(data))
        .catch(() => { /* lock status is advisory; ignore failures */ });
    },
    sendHeartbeat() {
      const date = this.loadedDate;
      if (!DATE_RE.test(date)) return;
      fetch('/api/ward-lock?date=' + encodeURIComponent(date), { method: 'POST' })
        .then(res => (res.ok ? res.json() : { others: [] }))
        .then(data => this.applyOthers(data))
        .catch(() => {});
    },
    acquireLock() {
      this.sendHeartbeat();
      if (!this.heartbeatTimer) {
        this.heartbeatTimer = setInterval(this.sendHeartbeat.bind(this), HEARTBEAT_MS);
      }
    },
    releaseLock() {
      if (this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = null;
      }
      const date = this.loadedDate;
      if (!DATE_RE.test(date)) return;
      fetch('/api/ward-lock?date=' + encodeURIComponent(date) + '&release=1', { method: 'POST' })
        .then(res => (res.ok ? res.json() : { others: [] }))
        .then(data => this.applyOthers(data))
        .catch(() => {});
    }
  }
};
</script>

<style scoped>
.ward-container { max-width: 1200px; margin: auto; padding: 20px; text-align: left; }
.lead { color: #555; }
.step-box { background: #fff; border: 1px solid #cfe0da; border-radius: 10px; padding: 16px; margin-bottom: 16px; }
h1 { color: #00493c; }

/* flex `gap` is avoided for IE11 — margins used instead */
.board-nav { display: flex; align-items: center; flex-wrap: wrap; }
.board-nav > * { margin: 0 8px 6px 0; }
.board-nav .spacer { flex-grow: 1; }
.weekday { font-weight: bold; color: #00493c; }
.date-input { width: 160px; }
.big-input { font-size: 1em; padding: 7px; border: 1px solid #c8c8c8; border-radius: 6px; }
.board-status { margin-top: 4px; min-height: 20px; }
.board-status > span { margin-right: 14px; }
.edit-warning { margin-top: 6px; padding: 7px 12px; background: #fcf3cf; border: 1px solid #e6c200; border-radius: 6px; color: #7a5c00; font-weight: bold; font-size: 0.9em; }
.status-text { color: #00715d; font-weight: bold; }
.error-text { color: #c0392b; font-weight: bold; }
.muted { color: #888; font-size: 0.85em; }

.btn-plain { background: #eef3f1; border: 1px solid #ccd; border-radius: 6px; padding: 6px 12px; cursor: pointer; font-size: 0.9em; }
.btn-plain.danger { color: #c0392b; }
.btn-secondary { background: #00715d; color: #fff; border: none; border-radius: 6px; padding: 8px 16px; font-weight: bold; cursor: pointer; }
.btn-print-sm { background: #00493c; color: #fff; border: none; border-radius: 6px; padding: 8px 16px; font-weight: bold; cursor: pointer; }
.btn-secondary:hover, .btn-print-sm:hover { opacity: 0.88; }
.add-btn { margin-top: 10px; }

/* Editing table */
.edit-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.edit-table th, .edit-table td { border: 1px solid #cfe0da; padding: 4px; vertical-align: top; }
.edit-table th { background: #e6f2ee; color: #00493c; font-size: 0.8em; }
.cell-input { width: 100%; box-sizing: border-box; padding: 5px; border: 1px solid #d9d9d9; border-radius: 4px; font-size: 0.85em; font-family: inherit; }
textarea.cell-input { resize: vertical; }
.center { text-align: center; }
.row-status { color: #c0392b; font-size: 0.7em; margin-top: 2px; }
.empty-row { text-align: center; color: #888; padding: 16px; }

.col-id { width: 7%; }
.col-name { width: 8%; }
.col-disease { width: 11%; }
.col-cat { width: 6%; }
.col-date { width: 9%; }
.col-course { width: 17%; }
.col-todo { width: 12%; }
.col-dc { width: 8%; }
.col-next { width: 8%; }
.col-room { width: 5%; }
.col-mark { width: 5%; }
.col-del { width: 4%; }

/* Fullscreen PDF preview overlay (IE11-safe: no grid/var/gap) */
.preview-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: #525659; overflow: auto; z-index: 1000; padding: 16px; }
.preview-overlay .print-sheet { max-width: 1100px; margin: 0 auto; }
.preview-toolbar { max-width: 1100px; margin: 0 auto 12px; text-align: right; }
.preview-toolbar > button { margin-left: 8px; }

/* Print sheet (also shown on screen as a preview) */
.print-sheet { background: #fff; border: 1px solid #999; box-shadow: 0 2px 10px rgba(0,0,0,0.15); padding: 20px; margin: 25px 0; }
.sheet-header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 3px solid #00715d; padding-bottom: 6px; margin-bottom: 12px; }
.sheet-header h2 { margin: 0; color: #00493c; letter-spacing: 0.12em; }
.sheet-issued { font-size: 1em; color: #333; font-weight: bold; }
.sheet-table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 10pt; }
.sheet-table th, .sheet-table td { border: 1px solid #888; padding: 3px 4px; vertical-align: top; word-break: break-all; overflow-wrap: break-word; }
.sheet-table th { background: #e6f2ee; color: #00493c; }
.sheet-table tr { page-break-inside: avoid; }
.text-cell { white-space: pre-wrap; text-align: left; }
.admit-row { background: #fdf3ec; }
.admit-badge { display: inline-block; background: #b3541e; color: #fff; font-size: 0.7em; font-weight: bold; padding: 1px 5px; border-radius: 8px; margin-right: 3px; }
</style>

<style>
/* Print: show only the board sheet (must be unscoped to reach body/nav). */
@media print {
  @page { size: A4 landscape; margin: 8mm; }
  body * { visibility: hidden; }
  .print-sheet, .print-sheet * { visibility: visible; }
  .print-sheet { position: absolute; left: 0; top: 0; width: 100%; border: none; box-shadow: none; margin: 0; padding: 0; }
}
</style>
