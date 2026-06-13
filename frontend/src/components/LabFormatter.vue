<template>
  <div class="lab-container">
    <h1>検査結果 整形ツール</h1>
    <p class="lead">
      電子カルテからコピーした血液・尿検査の結果を下の枠に貼り付けて「整形する」を押してください。<br>
      余計な行（依頼元・コメント行など）を消し、単位を付け、CTCAE基準のGradeを右側に付けます。
    </p>

    <div class="input-box">
      <textarea v-model="inputText" rows="10" class="lab-textarea"
                placeholder="ここに検査結果を貼り付け（Ctrl+V）"></textarea>
      <div class="actions">
        <button class="btn-run" @click="run">✔ 整形する</button>
        <button class="btn-clear" @click="clearAll">入力を消す</button>
      </div>
    </div>

    <div v-if="done" class="results">
      <div class="result-head">
        <h2>整形結果</h2>
        <div class="mode-toggle">
          <button :class="{ on: mode === 'aligned' }" @click="setMode('aligned')">表形式（等幅フォント用）</button>
          <button :class="{ on: mode === 'delim' }" @click="setMode('delim')">区切り（どのフォントでも可）</button>
        </div>
        <button class="btn-copy" @click="copy">📋 結果をコピー</button>
      </div>
      <p class="mode-hint">
        貼り付け先がMS明朝など<strong>等幅フォント</strong>なら「表形式」、MS P明朝など<strong>可変幅フォント</strong>なら「区切り」を選んでください。
      </p>

      <div class="set-bar">
        <label>カルテ用セット：
          <select v-model="selectedSetName" @change="render">
            <option value="">すべて表示</option>
            <option v-for="s in sets" :key="s.name" :value="s.name">{{ s.name }}</option>
          </select>
        </label>
        <button class="btn-plain" @click="showEditor = !showEditor">セットの作成・編集</button>
      </div>

      <div v-if="showEditor" class="set-editor">
        <p class="hint">残したい項目にチェックを入れ、セット名を付けて保存してください（チェックした順に並びます）。保存したセットは全端末で共有されます。</p>
        <div class="check-grid">
          <label v-for="name in availableItems" :key="name" class="check-item">
            <input type="checkbox" :checked="checked.indexOf(name) !== -1" @change="toggleItem(name)">
            {{ name }}
            <span v-if="checked.indexOf(name) !== -1" class="check-order">{{ checked.indexOf(name) + 1 }}</span>
          </label>
        </div>
        <div class="set-save-row">
          <input v-model.trim="newSetName" placeholder="セット名（例: 化学療法前）" class="set-name-input">
          <button class="btn-secondary" @click="saveSet">このセットを保存</button>
          <span class="muted">選択 {{ checked.length }} 項目</span>
        </div>
        <div v-if="sets.length" class="set-list">
          <span class="muted">登録済み：</span>
          <span v-for="s in sets" :key="s.name" class="set-chip">
            {{ s.name }}（{{ s.items.length }}）
            <button class="link-btn" @click="editSet(s)">編集</button>
            <button class="link-btn danger" @click="deleteSet(s.name)">削除</button>
          </span>
        </div>
      </div>

      <div class="output-wrap">
        <div v-for="(row, i) in rows" :key="i" class="out-line" :class="row.cls">{{ row.text }}</div>
      </div>

      <div v-if="grades.length" class="grade-summary">
        <strong>CTCAE 該当一覧：</strong>
        <span v-for="(g, i) in grades" :key="i" class="grade-chip" :class="g.cls">{{ g.text }}</span>
      </div>

      <div class="disclaimer">
        ※ Gradeは検査値のみによる<strong>機械判定の目安</strong>です（CTCAE v5.0準拠）。症状や臨床経過を要する項目は判定対象外です。
        最終判断は主治医が行ってください。
      </div>
    </div>
  </div>
</template>

<script>
import { parseLabReport, formatReport, formatReportAligned, applyLabSet, gradeItem, gradeLevel } from '../data/labFormat.js';
import { copyText } from '../utils/clipboard.js';

export default {
  name: 'LabFormatter',
  data() {
    return {
      inputText: '',
      done: false,
      mode: 'aligned',
      parsed: [],
      outputText: '',
      rows: [],
      grades: [],
      // lab item sets (server-shared)
      sets: [],
      selectedSetName: '',
      showEditor: false,
      checked: [],
      newSetName: ''
    };
  },
  computed: {
    // all item names found in the current report, in original order (unique)
    availableItems() {
      var seen = {};
      var names = [];
      for (var i = 0; i < this.parsed.length; i++) {
        var e = this.parsed[i];
        if (e.type === 'item' && !seen[e.name]) { seen[e.name] = true; names.push(e.name); }
      }
      return names;
    }
  },
  mounted() {
    this.loadSets();
  },
  methods: {
    loadSets() {
      fetch('/api/lab-sets')
        .then(function (res) { return res.json(); })
        .then(function (data) { this.sets = data || []; }.bind(this))
        .catch(function () { /* sets just stay empty */ });
    },
    run() {
      if (!this.inputText.trim()) {
        alert('検査結果を貼り付けてください。');
        return;
      }
      this.parsed = parseLabReport(this.inputText);
      this.render();
      this.done = true;
    },
    setMode(m) {
      this.mode = m;
      if (this.done) this.render();
    },
    activeItemNames() {
      if (!this.selectedSetName) return [];
      for (var i = 0; i < this.sets.length; i++) {
        if (this.sets[i].name === this.selectedSetName) return this.sets[i].items || [];
      }
      return [];
    },
    render() {
      var shown = applyLabSet(this.parsed, this.activeItemNames());

      this.outputText = this.mode === 'aligned'
        ? formatReportAligned(shown)
        : formatReport(shown);

      this.rows = this.outputText.split('\n').map(function (line) {
        var cls = '';
        if (/^【.*】$/.test(line)) cls = 'is-section';
        else if (/Grade [34]$/.test(line)) cls = 'is-g34';
        else if (/Grade [12]$/.test(line)) cls = 'is-g12';
        return { text: line, cls: cls };
      });

      // grade summary from the shown items only (high grades first)
      var byName = {};
      var i;
      for (i = 0; i < shown.length; i++) {
        if (shown[i].type === 'item') byName[shown[i].name] = shown[i];
      }
      var found = [];
      for (i = 0; i < shown.length; i++) {
        if (shown[i].type !== 'item') continue;
        var g = gradeItem(shown[i], byName);
        if (g) found.push({ text: g, level: gradeLevel(g), cls: gradeLevel(g) >= 3 ? 'is-g34' : 'is-g12' });
      }
      found.sort(function (a, b) { return b.level - a.level; });
      this.grades = found;
    },
    toggleItem(name) {
      var idx = this.checked.indexOf(name);
      if (idx === -1) this.checked.push(name);
      else this.checked.splice(idx, 1);
    },
    editSet(set) {
      this.newSetName = set.name;
      this.checked = (set.items || []).slice();
      this.showEditor = true;
    },
    saveSet() {
      if (!this.newSetName) { alert('セット名を入力してください。'); return; }
      if (!this.checked.length) { alert('項目を1つ以上選んでください。'); return; }
      var next = [];
      var replaced = false;
      for (var i = 0; i < this.sets.length; i++) {
        if (this.sets[i].name === this.newSetName) {
          next.push({ name: this.newSetName, items: this.checked.slice() });
          replaced = true;
        } else {
          next.push(this.sets[i]);
        }
      }
      if (!replaced) next.push({ name: this.newSetName, items: this.checked.slice() });
      this.saveSets(next, this.newSetName);
    },
    deleteSet(name) {
      if (!confirm('セット「' + name + '」を削除します。よろしいですか？')) return;
      var next = this.sets.filter(function (s) { return s.name !== name; });
      var keepSelected = this.selectedSetName === name ? '' : this.selectedSetName;
      this.saveSets(next, null);
      this.selectedSetName = keepSelected;
    },
    saveSets(next, selectAfter) {
      fetch('/api/lab-sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next)
      })
      .then(function (res) {
        if (!res.ok) throw new Error('status ' + res.status);
        this.sets = next;
        if (selectAfter) this.selectedSetName = selectAfter;
        if (this.done) this.render();
      }.bind(this))
      .catch(function (err) { alert('セットの保存に失敗しました: ' + err); });
    },
    copy() {
      copyText(this.outputText)
        .then(function () { alert('整形結果をコピーしました。'); })
        .catch(function () { alert('コピーに失敗しました。'); });
    },
    clearAll() {
      this.inputText = '';
      this.outputText = '';
      this.parsed = [];
      this.rows = [];
      this.grades = [];
      this.done = false;
    }
  }
};
</script>

<style scoped>
.lab-container { max-width: 880px; margin: auto; padding: 20px; text-align: left; }
.lead { color: #555; line-height: 1.7; }
.input-box { background: #fff; border: 1px solid #cfe0da; border-radius: 10px; padding: 18px; }
.lab-textarea { width: 100%; box-sizing: border-box; font-size: 1em; padding: 12px; border: 1px solid #c8c8c8; border-radius: 8px; font-family: "MS Gothic", "Osaka-Mono", monospace; }
.actions { display: flex; margin-top: 12px; }
.actions .btn-run { margin-right: 12px; }
.btn-run { flex-grow: 1; font-size: 1.2em; padding: 14px; background: #00715d; color: #fff; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; }
.btn-clear { padding: 14px 20px; background: #eee; border: 1px solid #ccc; border-radius: 8px; cursor: pointer; }
.btn-run:hover { opacity: 0.88; }

.results { margin-top: 25px; }
.result-head { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; }
.result-head h2 { color: #00493c; margin: 0; }
.mode-toggle button { border: 1px solid #00715d; background: #fff; color: #00715d; padding: 7px 12px; cursor: pointer; font-size: 0.85em; }
.mode-toggle button:first-child { border-radius: 6px 0 0 6px; }
.mode-toggle button:last-child { border-radius: 0 6px 6px 0; border-left: none; }
.mode-toggle button.on { background: #00715d; color: #fff; font-weight: bold; }
.mode-hint { color: #777; font-size: 0.85em; margin: 8px 0 0; }
.btn-copy { background: #00715d; color: #fff; border: none; border-radius: 6px; padding: 10px 18px; font-weight: bold; cursor: pointer; }
.btn-copy:hover { opacity: 0.88; }

.set-bar { margin-top: 14px; padding: 10px 12px; background: #e6f2ee; border-radius: 8px; }
.set-bar select { font-size: 1em; padding: 5px; margin-left: 4px; }
.set-bar .btn-plain { margin-left: 14px; }
.btn-plain { background: #fff; border: 1px solid #00715d; color: #00715d; border-radius: 6px; padding: 6px 12px; cursor: pointer; font-size: 0.85em; }
.set-editor { margin-top: 10px; padding: 14px; background: #fff; border: 1px solid #cfe0da; border-radius: 8px; }
.hint { color: #777; font-size: 0.85em; margin: 0 0 10px; }
.check-grid { display: flex; flex-wrap: wrap; }
.check-item { width: 170px; margin: 0 8px 6px 0; font-size: 0.9em; position: relative; }
.check-order { display: inline-block; min-width: 18px; text-align: center; background: #00715d; color: #fff; border-radius: 9px; font-size: 0.75em; padding: 0 5px; margin-left: 3px; }
.set-save-row { margin-top: 10px; display: flex; align-items: center; flex-wrap: wrap; }
.set-name-input { font-size: 1em; padding: 7px; border: 1px solid #c8c8c8; border-radius: 6px; margin-right: 10px; }
.btn-secondary { background: #00715d; color: #fff; border: none; border-radius: 6px; padding: 8px 16px; font-weight: bold; cursor: pointer; margin-right: 10px; }
.muted { color: #888; font-size: 0.85em; }
.set-list { margin-top: 12px; border-top: 1px solid #eee; padding-top: 10px; }
.set-chip { display: inline-block; background: #f4f6f5; border: 1px solid #cfe0da; border-radius: 12px; padding: 3px 10px; margin: 0 8px 6px 0; font-size: 0.85em; }
.link-btn { background: none; border: none; color: #00715d; cursor: pointer; font-size: 0.85em; padding: 0 2px; text-decoration: underline; }
.link-btn.danger { color: #b03030; }

.output-wrap { margin-top: 12px; background: #fff; border: 1px solid #cfe0da; border-radius: 8px; padding: 14px; overflow-x: auto; }
.out-line { font-family: "MS Gothic", "Osaka-Mono", monospace; white-space: pre; font-size: 0.95em; line-height: 1.55; }
.out-line.is-section { font-weight: bold; color: #00493c; margin-top: 6px; border-bottom: 1px solid #e6f2ee; }
.out-line.is-g12 { background: #fff5e8; }
.out-line.is-g34 { background: #fdeaea; color: #a11; font-weight: bold; }

.grade-summary { margin-top: 14px; padding: 12px; background: #f4f6f5; border-radius: 8px; line-height: 2; }
.grade-chip { display: inline-block; border-radius: 12px; padding: 3px 12px; margin: 0 6px 4px 0; font-size: 0.9em; font-weight: bold; }
.grade-chip.is-g12 { background: #fbe7c6; color: #8a5a08; }
.grade-chip.is-g34 { background: #f6c5c5; color: #a11; }

.disclaimer { margin-top: 16px; padding: 12px; background: #f4f6f5; border-left: 5px solid #00715d; font-size: 0.9em; color: #444; line-height: 1.7; }
</style>
