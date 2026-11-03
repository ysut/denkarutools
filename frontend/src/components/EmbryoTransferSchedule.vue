<template>
  <div class="hrt-container">
    <div class="no-print">
      <h1>胚移植スケジュール表の作成（ホルモン補充周期）</h1>
      <p class="lead">上から順番に入力すると、いつ・どの薬を・どれだけ使うか、次の受診日がわかる患者さん用の表ができます。</p>

      <!-- ① 患者 -->
      <div class="step-box">
        <div class="step-title"><span class="step-num">1</span> 患者さん</div>
        <div class="row">
          <input v-model.trim="patientId" placeholder="患者ID" class="big-input" style="width: 160px;"
                 @keyup.enter="lookupPatient" @blur="lookupPatient">
          <button class="btn-secondary" @click="lookupPatient">患者を呼び出す</button>
          <span v-if="patientStatus" class="status-text">{{ patientStatus }}</span>
        </div>
        <div class="row">
          <label>氏名：<input v-model="patientName" placeholder="自動入力（手で直せます）" class="big-input"></label>
        </div>
      </div>

      <!-- ② プロトコール・薬剤 -->
      <div class="step-box">
        <div class="step-title"><span class="step-num">2</span> プロトコールと薬剤を選んでください</div>
        <div class="cards">
          <div v-for="p in protocols" :key="p.id" class="card"
               :class="{ selected: protocolId === p.id }" @click="selectProtocol(p.id)">
            <div class="card-code">{{ p.code }}</div>
            <div class="card-name">{{ p.embryo }}</div>
            <div class="card-meta">移植後{{ p.judgeOffset }}日目に判定<span v-if="p.bloodTestOffset !== null">・移植{{ -p.bloodTestOffset }}日前に採血</span></div>
          </div>
        </div>
        <div class="sub-title">エストロゲン剤</div>
        <div class="row">
          <label v-for="e in estrogens" :key="e.id" class="radio-label">
            <input type="radio" :value="e.id" v-model="estrogenId"> {{ e.name }}
          </label>
        </div>
        <div class="sub-title">黄体ホルモン剤（プロゲステロン剤）</div>
        <div class="row">
          <label v-for="p in progestins" :key="p.key" class="radio-label">
            <input type="checkbox" v-model="p.enabled"> {{ p.name || '（名称未入力）' }}
          </label>
          <button class="btn-plain" @click="addCustomProgestin">＋ 他の薬剤を追加</button>
        </div>
      </div>

      <!-- ③ 日程 -->
      <div class="step-box">
        <div class="step-title"><span class="step-num">3</span> 日程を入力してください</div>
        <table class="form-table">
          <tbody>
            <tr>
              <th>月経開始日（1日目）</th>
              <td>
                <input type="date" v-model="cycleStartStr" class="big-input" placeholder="2026-11-03">
                <span class="date-hint">{{ dateHint(cycleStartStr, false) }}</span>
              </td>
            </tr>
            <tr>
              <th>{{ estrogen.short }} 開始</th>
              <td>
                月経
                <input type="number" v-model.number="estrogenStartDay" min="1" max="10" class="big-input num-input">
                日目の{{ estrogen.type === 'patch' ? '寝る前' : '23時' }}から
                <span class="date-hint">{{ estrogenStartLabel }}</span>
              </td>
            </tr>
            <tr v-for="(v, i) in visits" :key="'v' + i">
              <th>{{ i === 0 ? '受診日（内膜・ホルモン値確認）' : '追加の受診日' }}</th>
              <td>
                <input type="date" v-model="v.dateStr" class="big-input" placeholder="2026-11-14">
                <span class="date-hint">{{ dateHint(v.dateStr, true) }}</span>
                <div class="row inner-row">
                  <label>表示名：<input v-model="v.label" class="big-input" style="width: 260px;"></label>
                  <label>予約：<input v-model="v.note" class="big-input" style="width: 120px;"></label>
                  <button v-if="i > 0" class="btn-plain danger" @click="visits.splice(i, 1)">削除</button>
                </div>
              </td>
            </tr>
            <tr>
              <th></th>
              <td><button class="btn-plain" @click="addVisit">＋ 受診日を追加（内膜の再評価など）</button></td>
            </tr>
            <tr>
              <th>移植日</th>
              <td>
                <input type="date" v-model="transferStr" class="big-input" placeholder="2026-11-22">
                <span class="date-hint">{{ dateHint(transferStr, true) }}</span>
                <div class="row inner-row">
                  <button class="btn-plain" @click="autoTransfer" :disabled="!visits[0].dateStr">
                    受診日の翌日から黄体ホルモン開始として移植日を入れる
                  </button>
                  <button class="btn-plain" v-if="transferStr" @click="transferStr = ''">移植日を未定に戻す</button>
                </div>
                <p class="hint">移植日が未定のときは、受診日までの表（受診日の夜以降は「受診時に指示」）を作成します。</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ④ 用量 -->
      <div class="step-box">
        <div class="step-title">
          <span class="step-num">4</span> 薬の量と開始日を確認してください
          <button class="btn-plain" @click="resetDoses">標準に戻す</button>
        </div>

        <div class="sub-title">{{ estrogen.name }}</div>
        <table class="form-table">
          <tbody>
            <tr v-for="ph in [1, 2]" :key="'ph' + ph">
              <th>{{ ph === 1 ? '受診日まで' : '受診日の夜から' }}</th>
              <td v-if="estrogen.type === 'patch'">
                1回
                <select v-model.number="estrogenDose['p' + ph].count" class="big-input">
                  <option v-for="n in 4" :key="n" :value="n">{{ n }}</option>
                </select>
                枚（毎晩、右・左交互）
              </td>
              <td v-else>
                <span v-for="(s, si) in slotLabels" :key="si" class="slot-input">
                  {{ s }}
                  <input type="number" min="0" v-model.number="estrogenDose['p' + ph].slots[si]" class="big-input num-input">
                </span>
                {{ estrogen.unit }}
              </td>
            </tr>
          </tbody>
        </table>

        <div class="sub-title">黄体ホルモン剤（開始日は移植日を基準に計算します）</div>
        <table class="form-table dose-table">
          <tbody>
            <tr v-for="(p, pi) in enabledProgestins" :key="p.key">
              <th>
                <span v-if="!p.custom">{{ p.name }}</span>
                <span v-else>
                  <input v-model="p.name" placeholder="薬剤名" class="big-input" style="width: 150px;">
                  <input v-model="p.abbr" placeholder="略称（カレンダー用）" class="big-input" style="width: 150px; margin-top: 4px;">
                </span>
              </th>
              <td>
                <div>
                  <span v-for="(s, si) in slotLabels" :key="si" class="slot-input">
                    {{ s }}
                    <input type="number" min="0" v-model.number="p.dose[si]" class="big-input num-input">
                  </span>
                  <input v-if="p.custom" v-model="p.unit" class="big-input" style="width: 50px;">
                  <span v-else>{{ p.unit }}</span>
                </div>
                <div class="inner-row">
                  開始：移植日の
                  <select v-model.number="p.startOffset" class="big-input">
                    <option v-for="o in offsetOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
                  </select>
                  の
                  <select v-model.number="p.startSlot" class="big-input">
                    <option v-for="(s, si) in slotLabels" :key="si" :value="si">{{ s }}</option>
                  </select>
                  から
                  <span class="date-hint" v-if="transferDate">→ {{ progestinStartLabel(p) }}</span>
                  <button v-if="p.custom" class="btn-plain danger" @click="removeProgestin(pi)">削除</button>
                </div>
              </td>
            </tr>
            <tr>
              <th>採血のみの来院</th>
              <td>
                <label><input type="checkbox" v-model="bloodTestEnabled"> あり：移植日の</label>
                <select v-model.number="bloodTestOffset" class="big-input" :disabled="!bloodTestEnabled">
                  <option v-for="o in offsetOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
                </select>
                <label>予約：<input v-model="notes.bloodTest" class="big-input" style="width: 120px;"></label>
              </td>
            </tr>
            <tr>
              <th>妊娠判定日</th>
              <td>
                移植後
                <input type="number" min="1" max="30" v-model.number="judgeOffset" class="big-input num-input">
                日目
                <label>予約：<input v-model="notes.judge" class="big-input" style="width: 120px;"></label>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ⑤ 用紙 -->
      <div class="step-box">
        <div class="step-title"><span class="step-num">5</span> 用紙の設定</div>
        <div class="row">
          <span>印刷する形式：</span>
          <label class="radio-label"><input type="radio" value="list" v-model="layout"> 一覧表（1日1行）</label>
          <label class="radio-label"><input type="radio" value="calendar" v-model="layout"> カレンダー（月表示）</label>
          <label class="radio-label"><input type="radio" value="both" v-model="layout"> 両方（2ページ）</label>
        </div>
        <div class="row">
          <label>移植日の来院時間など：<input v-model="notes.transfer" class="big-input" style="width: 280px;" placeholder="例: 8:00〜9:00 来院（予約不要）"></label>
        </div>
        <div class="row">
          <label style="flex-grow: 1;">備考（用紙の下に印刷されます）：
            <textarea v-model="freeNote" rows="2" class="big-input" style="width: 100%;"></textarea>
          </label>
        </div>
        <div class="row">
          <label style="flex-grow: 1;">施設名・連絡先（この端末に保存されます）：
            <input v-model="facility" @change="saveFacility" class="big-input" style="width: 100%;"
                   placeholder="例: ○○病院 産婦人科 生殖医療外来 TEL 0166-xx-xxxx">
          </label>
        </div>
      </div>

      <div v-if="schedule.errors.length" class="msg-box error">
        <div v-for="(e, i) in schedule.errors" :key="'e' + i">⚠ {{ e }}</div>
      </div>
      <div v-if="schedule.warnings.length" class="msg-box warn">
        <div v-for="(w, i) in schedule.warnings" :key="'w' + i">ⓘ {{ w }}</div>
      </div>

      <div class="step-box" v-if="ready">
        <div class="step-title"><span class="step-num">6</span> 下の仕上がりを確認して印刷してください</div>
        <p v-if="!schedule.complete" class="hint">※ 移植日が未定のため、受診日までの暫定表です。</p>
        <button class="btn-print" @click="printSheet">🖨 この用紙を印刷する</button>
      </div>
    </div>

    <!-- ===== 印刷用シート（画面ではプレビュー表示） ===== -->
    <div class="print-sheet hrt-sheet" v-if="ready">
      <div class="sheet-page" v-for="page in pages" :key="page">
        <div class="sheet-header">
          <span class="sheet-code">{{ protocol.code }}</span>
          <span class="sheet-title">{{ protocol.name }}</span>
        </div>
        <table class="sheet-patient">
          <tbody>
            <tr>
              <th>お名前</th><td class="patient-name">{{ patientName || '\u3000' }} 様</td>
              <th>ID</th><td>{{ patientId || '\u3000' }}</td>
              <th>発行日</th><td>{{ todayLabel }}</td>
            </tr>
          </tbody>
        </table>
        <div class="sheet-carry">このスケジュール表は必ず毎回ご持参ください。</div>

        <div class="key-dates">
          <span v-for="(k, i) in schedule.keyDates" :key="'k' + i" class="key-date" :class="k.mark ? 'mark-' + k.mark : ''">
            <span class="key-label">{{ k.label }}</span>
            <span class="key-value">{{ fmtLong(k.date) }}</span>
          </span>
        </div>

        <!-- 一覧表 -->
        <template v-if="page === 'list'">
          <table class="list-table">
            <thead>
              <tr>
                <th rowspan="2" class="c-date">日付</th>
                <th rowspan="2" class="c-day">周期</th>
                <th rowspan="2" class="c-event">予定</th>
                <th v-for="(c, ci) in schedule.columns" :key="'h' + ci" :colspan="c.type === 'patch' ? 2 : 1" class="c-med">
                  {{ c.short }}
                </th>
              </tr>
              <tr>
                <template v-for="(c, ci) in schedule.columns">
                  <template v-if="c.type === 'patch'">
                    <th :key="'r' + ci" class="c-sub">右</th>
                    <th :key="'l' + ci" class="c-sub">左</th>
                  </template>
                  <th v-else :key="'s' + ci" class="c-sub">7時-15時-23時</th>
                </template>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in schedule.rows" :key="r.ymd" :class="rowClass(r)">
                <td class="c-date" :class="dayClass(r)">
                  {{ fmtShort(r.date) }}<span v-if="r.holiday" class="holiday-name">{{ r.holiday }}</span>
                </td>
                <td class="c-day">day {{ r.cycleDay }}</td>
                <td class="c-event">
                  <div v-for="(e, ei) in r.events" :key="ei">
                    <strong>{{ e.label }}</strong><span v-if="e.note" class="ev-note">{{ e.note }}</span>
                  </div>
                </td>
                <template v-for="(cell, ci) in r.cells">
                  <template v-if="schedule.columns[ci].type === 'patch'">
                    <td v-if="cell.judge" :key="'j' + ci" colspan="2" class="c-dose small">結果によりお伝えします</td>
                    <template v-else>
                      <td :key="'r' + ci" class="c-dose">{{ cell.side === '右' ? patchText(cell) : '' }}</td>
                      <td :key="'l' + ci" class="c-dose">{{ cell.side === '左' ? patchText(cell) : '' }}</td>
                    </template>
                  </template>
                  <td v-else :key="'d' + ci" class="c-dose">{{ cell ? fmtSlots(cell.slots) : '' }}</td>
                </template>
              </tr>
            </tbody>
          </table>
        </template>

        <!-- カレンダー -->
        <template v-else>
          <table class="cal-table">
            <thead>
              <tr><th v-for="(w, wi) in weekdayNames" :key="wi" :class="{ sun: wi === 0, sat: wi === 6 }">{{ w }}</th></tr>
            </thead>
            <tbody>
              <tr v-for="(week, wi) in calendarWeeks" :key="'w' + wi">
                <td v-for="cell in week" :key="cell.ymd" :class="calCellClass(cell)">
                  <div class="cal-date" :class="cell.row ? dayClass(cell.row) : ''">
                    {{ cell.label }}
                    <span v-if="cell.row" class="cal-day">day{{ cell.row.cycleDay }}</span>
                  </div>
                  <template v-if="cell.row">
                    <div v-for="(e, ei) in cell.row.events" :key="'e' + ei" class="cal-event" :class="'ev-' + e.kind">{{ e.short }}</div>
                    <template v-for="(c, ci) in cell.row.cells">
                      <div v-if="c" :key="'m' + ci" class="cal-med">
                        <span class="cal-abbr">{{ schedule.columns[ci].abbr }}</span>
                        {{ calDose(schedule.columns[ci], c) }}
                      </div>
                    </template>
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </template>

        <div class="legend">
          数字は <strong>7時-15時-23時</strong> にそれぞれ使う数です（錠・個）。「×」はその時間は使いません。
          <span v-if="estrogen.type === 'patch'">{{ estrogen.short }}は寝る前に、表の側（右・左）に貼り替える枚数です。</span>
          <span v-if="!schedule.complete">「＊」は受診時にお伝えします。</span>
        </div>

        <div class="info-row">
          <div class="info-box">
            <div v-for="(line, i) in estrogen.description" :key="'d' + i" :class="{ 'info-head': i === 0 }">
              <span v-if="i > 0">▶ </span>{{ line }}
            </div>
          </div>
          <div class="info-box" v-if="schedule.complete">
            <div class="info-head">{{ progestinDescription }}</div>
            <div v-for="p in enabledProgestins" :key="'pd' + p.key">▶ {{ p.name }}</div>
          </div>
        </div>

        <ul class="sheet-notes">
          <li v-if="!schedule.complete">受診日の夜以降のお薬の量と、移植日までの予定は受診時にお伝えします（新しい表をお渡しします）。</li>
          <li v-if="schedule.complete && afternoonMeds">判定日の受診が午後の場合、15時の{{ afternoonMeds }}を使用した上でお越しください。</li>
          <li v-for="(n, i) in standardNotes" :key="'n' + i">{{ n }}</li>
          <li v-if="freeNote">{{ freeNote }}</li>
        </ul>
        <div class="sheet-warning">{{ warningBox }}</div>
        <div class="sheet-footer" v-if="facility">{{ facility }}</div>
      </div>
    </div>
  </div>
</template>

<script>
import {
  PROTOCOLS, ESTROGENS, PROGESTINS, PROGESTIN_DESCRIPTION, STANDARD_NOTES, WARNING_BOX, SLOT_LABELS,
  parseYmd, toYmd, addDays, diffDays, dateLabel, longDateLabel, buildSchedule, formatSlots
} from '../data/hrtSchedule.js';

var FACILITY_KEY = 'denkarutools.hrtSchedule.facility';
var DEFAULT_VISIT_DAY = 12;
var customSeq = 0;

function defaultVisit() {
  return { dateStr: '', label: '受診（内膜・ホルモン値の確認）', note: '要予約' };
}

function loadFacility() {
  try { return window.localStorage.getItem(FACILITY_KEY) || ''; } catch (e) { return ''; }
}

export default {
  data() {
    return {
      protocols: PROTOCOLS,
      estrogens: ESTROGENS,
      slotLabels: SLOT_LABELS,
      weekdayNames: ['日', '月', '火', '水', '木', '金', '土'],
      progestinDescription: PROGESTIN_DESCRIPTION,
      standardNotes: STANDARD_NOTES,
      warningBox: WARNING_BOX,

      patients: [],
      patientId: '',
      patientName: '',
      patientStatus: '',

      protocolId: 'BT',
      estrogenId: 'estrana',
      progestins: [],
      estrogenDose: null,
      bloodTestEnabled: true,
      bloodTestOffset: -4,
      judgeOffset: 7,

      cycleStartStr: '',
      estrogenStartDay: 2,
      visits: [defaultVisit()],
      autoVisitStr: '',
      transferStr: '',

      notes: { bloodTest: '要予約', transfer: '', judge: '要予約' },
      layout: 'list',
      freeNote: '',
      facility: loadFacility()
    };
  },
  created() {
    this.selectProtocol(this.protocolId);
  },
  mounted() {
    fetch('/api/patients')
      .then(res => res.json())
      .then(data => { this.patients = data; })
      .catch(() => { /* lookup simply won't auto-fill */ });
  },
  computed: {
    protocol() {
      return PROTOCOLS.find(p => p.id === this.protocolId);
    },
    estrogen() {
      return ESTROGENS.find(e => e.id === this.estrogenId);
    },
    enabledProgestins() {
      return this.progestins.filter(p => p.enabled);
    },
    cycleStart() { return parseYmd(this.cycleStartStr); },
    transferDate() { return parseYmd(this.transferStr); },
    estrogenStartLabel() {
      if (!this.cycleStart) return '';
      return '→ ' + longDateLabel(addDays(this.cycleStart, (this.estrogenStartDay || 1) - 1));
    },
    offsetOptions() {
      const opts = [];
      for (let n = -10; n <= 3; n++) {
        opts.push({ value: n, label: n < 0 ? (-n) + '日前' : n === 0 ? '当日' : n + '日後' });
      }
      return opts;
    },
    schedule() {
      const est = this.estrogen;
      const dose = p => (est.type === 'patch'
        ? Number(this.estrogenDose[p].count) || 0
        : this.estrogenDose[p].slots.map(v => Number(v) || 0));
      return buildSchedule({
        cycleStart: this.cycleStart,
        estrogenStartDay: Number(this.estrogenStartDay) || 1,
        estrogen: est,
        estrogenDose1: dose('p1'),
        estrogenDose2: dose('p2'),
        visits: this.visits.map(v => ({ date: parseYmd(v.dateStr), label: v.label, note: v.note, short: '受診' })),
        transferDate: this.transferDate,
        progestins: this.enabledProgestins.map(p => ({
          name: p.name || '（薬剤名）',
          short: p.short || p.name || '（薬剤名）',
          abbr: p.abbr || (p.name || '').slice(0, 4),
          unit: p.unit,
          dose: p.dose.map(v => Number(v) || 0),
          startOffset: p.startOffset,
          startSlot: p.startSlot
        })),
        bloodTestOffset: this.bloodTestEnabled ? this.bloodTestOffset : null,
        judgeOffset: Number(this.judgeOffset) || 1,
        notes: this.notes
      });
    },
    ready() {
      return this.schedule.rows.length > 0;
    },
    pages() {
      return this.layout === 'both' ? ['list', 'calendar'] : [this.layout];
    },
    calendarWeeks() {
      const rows = this.schedule.rows;
      if (!rows.length) return [];
      const byYmd = {};
      rows.forEach(r => { byYmd[r.ymd] = r; });
      const first = rows[0].date;
      const last = rows[rows.length - 1].date;
      let d = addDays(first, -first.getDay());
      const end = addDays(last, 6 - last.getDay());
      const weeks = [];
      let week = [];
      for (; d <= end; d = addDays(d, 1)) {
        const ymd = toYmd(d);
        const showMonth = (week.length === 0 && weeks.length === 0) || d.getDate() === 1;
        week.push({
          ymd: ymd,
          label: showMonth ? (d.getMonth() + 1) + '/' + d.getDate() : String(d.getDate()),
          row: byYmd[ymd] || null
        });
        if (week.length === 7) { weeks.push(week); week = []; }
      }
      return weeks;
    },
    afternoonMeds() {
      const names = [];
      if (this.estrogen.type === 'tid') names.push(this.estrogen.short);
      this.enabledProgestins.forEach(p => { if (p.name) names.push(p.short || p.name); });
      return names.join('、');
    },
    todayLabel() {
      return longDateLabel(new Date());
    }
  },
  watch: {
    cycleStartStr() {
      // Pre-fill the visit on cycle day 12 unless it was typed by hand.
      if (!this.cycleStart) return;
      const v = this.visits[0];
      if (!v.dateStr || v.dateStr === this.autoVisitStr) {
        v.dateStr = toYmd(addDays(this.cycleStart, DEFAULT_VISIT_DAY - 1));
        this.autoVisitStr = v.dateStr;
      }
    },
    estrogenId() {
      this.resetEstrogenDose();
    }
  },
  methods: {
    lookupPatient() {
      if (!this.patientId) return;
      const found = this.patients.find(p => p.id === this.patientId);
      if (found) {
        this.patientName = found.name;
        this.patientStatus = '✔ 患者情報を読み込みました';
      } else {
        this.patientStatus = '登録がありません（氏名を手入力してください）';
      }
    },
    selectProtocol(id) {
      this.protocolId = id;
      this.resetDoses();
    },
    resetEstrogenDose() {
      const e = this.estrogen;
      const mk = () => ({ count: e.defaultCount || 2, slots: (e.defaultDose || [0, 0, 0]).slice() });
      this.estrogenDose = { p1: mk(), p2: mk() };
    },
    resetDoses() {
      const proto = this.protocol;
      const custom = this.progestins.filter(p => p.custom);
      this.progestins = PROGESTINS.map(p => ({
        key: p.id,
        custom: false,
        enabled: true,
        name: p.name,
        short: p.short,
        abbr: p.abbr,
        unit: p.unit,
        dose: p.defaultDose.slice(),
        startOffset: proto.progestinStart[p.id],
        startSlot: 2
      })).concat(custom);
      this.bloodTestEnabled = proto.bloodTestOffset !== null;
      this.bloodTestOffset = proto.bloodTestOffset !== null ? proto.bloodTestOffset : -4;
      this.judgeOffset = proto.judgeOffset;
      this.resetEstrogenDose();
    },
    addCustomProgestin() {
      customSeq++;
      this.progestins.push({
        key: 'custom' + customSeq, custom: true, enabled: true,
        name: '', short: '', abbr: '', unit: '個',
        dose: [0, 0, 1], startOffset: 0, startSlot: 2
      });
    },
    removeProgestin(enabledIndex) {
      const p = this.enabledProgestins[enabledIndex];
      this.progestins.splice(this.progestins.indexOf(p), 1);
    },
    addVisit() {
      const v = defaultVisit();
      v.label = '受診（内膜の再評価）';
      this.visits.push(v);
    },
    autoTransfer() {
      // The paper sheets start the first progestin the night after the visit.
      const visit = parseYmd(this.visits[0].dateStr);
      if (!visit) return;
      const offsets = this.enabledProgestins.map(p => p.startOffset);
      const first = offsets.length ? Math.min.apply(null, offsets) : 0;
      this.transferStr = toYmd(addDays(visit, 1 - first));
    },
    progestinStartLabel(p) {
      return longDateLabel(addDays(this.transferDate, p.startOffset)) + ' ' + SLOT_LABELS[p.startSlot];
    },
    dateHint(str, withDay) {
      if (!str) return '';
      const d = parseYmd(str);
      if (!d) return '⚠ 2026-11-03 の形式で入力してください';
      let s = longDateLabel(d);
      if (withDay && this.cycleStart) s += '・周期 day ' + (diffDays(d, this.cycleStart) + 1);
      return s;
    },
    saveFacility() {
      try { window.localStorage.setItem(FACILITY_KEY, this.facility); } catch (e) { /* not persisted */ }
    },
    fmtShort(d) { return dateLabel(d); },
    fmtLong(d) { return longDateLabel(d); },
    fmtSlots(slots) { return formatSlots(slots); },
    patchText(cell) {
      return cell.count === '*' ? '＊' : cell.count + '枚';
    },
    calDose(col, cell) {
      if (col.type !== 'patch') return formatSlots(cell.slots);
      if (cell.judge) return '結果で指示';
      return cell.side + (cell.count === '*' ? '＊' : cell.count + '枚');
    },
    rowClass(r) {
      return r.kinds.map(k => 'ev-' + k).join(' ');
    },
    dayClass(r) {
      if (r.holiday || r.weekday === 0) return 'sun';
      if (r.weekday === 6) return 'sat';
      return '';
    },
    calCellClass(cell) {
      if (!cell.row) return 'cal-out';
      return ['cal-in'].concat(cell.row.kinds.map(k => 'ev-' + k)).join(' ');
    },
    printSheet() {
      window.print();
    }
  }
};
</script>

<style scoped>
.hrt-container { max-width: 900px; margin: auto; padding: 20px; text-align: left; }
.lead { color: #555; }
.step-box { background: #fff; border: 1px solid #cfe0da; border-radius: 10px; padding: 18px; margin-bottom: 18px; }
/* flex `gap` and CSS grid are avoided below for IE11 compatibility */
.step-title { font-size: 1.15em; font-weight: bold; color: #00493c; margin-bottom: 12px; display: flex; align-items: center; flex-wrap: wrap; }
.step-title > * { margin-right: 10px; }
.step-num { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: 50%; background: #00715d; color: #fff; font-size: 0.95em; flex-shrink: 0; }
.sub-title { font-weight: bold; color: #00493c; margin: 14px 0 6px; border-left: 4px solid #00715d; padding-left: 8px; }
.row { display: flex; align-items: center; flex-wrap: wrap; margin-bottom: 8px; }
.row > * { margin-right: 15px; margin-bottom: 4px; }
.inner-row { margin-top: 6px; margin-bottom: 0; }
.big-input { font-size: 1.05em; padding: 7px; border: 1px solid #c8c8c8; border-radius: 6px; }
.num-input { width: 56px; }
.slot-input { margin-right: 10px; white-space: nowrap; }
.radio-label { cursor: pointer; }
.status-text { color: #00715d; font-weight: bold; }
.hint { color: #777; font-size: 0.88em; margin: 6px 0 0; }
.date-hint { color: #00715d; font-weight: bold; margin-left: 8px; }

.cards { display: flex; flex-wrap: wrap; margin: 0 -6px; }
.card { flex: 1 1 240px; min-width: 240px; margin: 6px; box-sizing: border-box; border: 2px solid #cfe0da; border-radius: 10px; padding: 12px 14px; cursor: pointer; background: #fafdfb; }
.card:hover { border-color: #00715d; }
.card.selected { border-color: #00715d; background: #e6f2ee; box-shadow: 0 0 0 2px #00715d inset; }
.card-code { font-weight: bold; color: #fff; background: #00715d; display: inline-block; padding: 2px 10px; border-radius: 4px; }
.card-name { font-weight: bold; color: #00493c; margin: 6px 0 4px; font-size: 1.1em; }
.card-meta { font-size: 0.85em; color: #666; }

.form-table { width: 100%; border-collapse: collapse; }
.form-table th { width: 210px; text-align: left; vertical-align: top; padding: 10px 8px; color: #00493c; font-size: 0.95em; }
.form-table td { padding: 6px 8px; border-bottom: 1px solid #eef3f1; }

.msg-box { border-radius: 8px; padding: 10px 14px; margin-bottom: 14px; line-height: 1.7; }
.msg-box.error { background: #fdecea; border: 1px solid #c0392b; color: #a93226; font-weight: bold; }
.msg-box.warn { background: #fff8e1; border: 1px solid #e0b100; color: #7a5b00; }

.btn-plain { background: #eef3f1; border: 1px solid #ccd; border-radius: 6px; padding: 6px 10px; cursor: pointer; font-size: 0.9em; }
.btn-plain.danger { color: #c0392b; }
.btn-plain[disabled] { opacity: 0.5; cursor: default; }
.btn-secondary { background: #00715d; color: #fff; border: none; border-radius: 6px; padding: 9px 16px; font-weight: bold; cursor: pointer; }
.btn-print { width: 100%; font-size: 1.3em; padding: 16px; background: #00493c; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; }
.btn-print:hover, .btn-secondary:hover { opacity: 0.88; }

/* ===== 印刷シート（画面プレビュー兼用） ===== */
.print-sheet { background: #fff; color: #222; font-size: 13px; margin: 25px 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.sheet-page { border: 1px solid #999; box-shadow: 0 2px 10px rgba(0,0,0,0.15); padding: 22px; margin-bottom: 25px; }
.sheet-header { border-bottom: 3px solid #00715d; padding-bottom: 5px; margin-bottom: 8px; }
.sheet-code { display: inline-block; background: #00715d; color: #fff; font-weight: bold; font-size: 1.4em; padding: 2px 12px; margin-right: 14px; border: 2px solid #00715d; }
.sheet-title { font-size: 1.45em; font-weight: bold; color: #00493c; }
.sheet-patient { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
.sheet-patient th { background: #e6f2ee; width: 60px; text-align: left; white-space: nowrap; }
.sheet-patient th, .sheet-patient td { border: 1px solid #888; padding: 4px 8px; }
.patient-name { font-size: 1.15em; font-weight: bold; width: 40%; }
.sheet-carry { font-size: 0.9em; margin-bottom: 6px; }

.key-dates { border: 2px solid #00715d; border-radius: 6px; padding: 4px 6px; margin-bottom: 8px; }
.key-date { display: inline-block; margin: 2px 10px 2px 0; white-space: nowrap; }
.key-label { font-size: 0.85em; color: #555; margin-right: 4px; }
.key-value { font-weight: bold; }
.key-date.mark-visit .key-value, .key-date.mark-blood .key-value { color: #00493c; text-decoration: underline; }
.key-date.mark-transfer .key-value { color: #b35a00; font-size: 1.1em; }
.key-date.mark-judge .key-value { color: #b0144b; font-size: 1.1em; }

.list-table { width: 100%; border-collapse: collapse; }
.list-table th { background: #e6f2ee; border: 1px solid #888; padding: 2px 4px; font-size: 0.92em; }
.list-table td { border: 1px solid #aaa; padding: 2px 6px; height: 21px; }
.list-table tr { page-break-inside: avoid; }
.c-date { white-space: nowrap; width: 92px; font-weight: bold; }
.c-day { white-space: nowrap; width: 54px; text-align: center; color: #555; font-size: 0.9em; }
.c-event { font-size: 0.92em; }
.c-med { white-space: nowrap; }
.c-sub { font-weight: normal; white-space: nowrap; }
.c-dose { text-align: center; white-space: nowrap; font-family: Consolas, "Courier New", monospace, sans-serif; font-weight: bold; letter-spacing: 0.05em; }
.c-dose.small { font-family: inherit; font-weight: normal; font-size: 0.85em; letter-spacing: 0; }
.holiday-name { font-size: 0.75em; font-weight: normal; margin-left: 3px; }
.ev-note { font-size: 0.85em; margin-left: 6px; color: #444; white-space: nowrap; }
.sun { color: #c0392b; }
.sat { color: #1f5fa8; }
.list-table tr.ev-visit td, .list-table tr.ev-blood td { background: #e3f1ec; }
.list-table tr.ev-transfer td { background: #ffe9cc; }
.list-table tr.ev-judge td { background: #fbdbe5; }

.cal-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.cal-table th { background: #e6f2ee; border: 1px solid #888; padding: 2px; }
.cal-table td { border: 1px solid #888; vertical-align: top; height: 92px; padding: 2px 3px; font-size: 0.82em; overflow: hidden; }
.cal-out { background: #f2f2f2; color: #aaa; }
.cal-date { font-weight: bold; font-size: 1.15em; }
.cal-day { font-size: 0.75em; font-weight: normal; color: #777; float: right; margin-top: 3px; }
.cal-event { font-weight: bold; text-align: center; border: 1.5px solid #00715d; border-radius: 3px; margin: 1px 0; color: #00493c; white-space: nowrap; overflow: hidden; }
.cal-event.ev-transfer { border-color: #b35a00; color: #b35a00; }
.cal-event.ev-judge { border-color: #b0144b; color: #b0144b; }
.cal-med { white-space: nowrap; overflow: hidden; line-height: 1.35; }
.cal-abbr { font-size: 0.85em; color: #555; }
.cal-table td.ev-visit, .cal-table td.ev-blood { background: #eef7f3; }
.cal-table td.ev-transfer { background: #fff3e3; }
.cal-table td.ev-judge { background: #fdeaf0; }

.legend { font-size: 0.85em; margin: 6px 0; color: #333; }
.info-row { display: table; width: 100%; border-spacing: 0; margin: 6px 0; }
.info-box { display: table-cell; width: 50%; border: 1px solid #00715d; padding: 6px 8px; font-size: 0.85em; vertical-align: top; }
.info-box + .info-box { border-left: none; }
.info-head { font-weight: bold; color: #00493c; margin-bottom: 2px; }
.sheet-notes { margin: 6px 0; padding-left: 20px; font-size: 0.9em; }
.sheet-warning { border: 2px solid #c0392b; color: #c0392b; font-weight: bold; padding: 6px 10px; font-size: 0.9em; }
.sheet-footer { margin-top: 8px; text-align: center; font-size: 0.95em; border-top: 1px dashed #999; padding-top: 6px; }
</style>

<style>
@media print {
  .no-print { display: none !important; }
  /* extra .hrt-container beats the scoped (data-v) screen rules */
  .hrt-container .hrt-sheet.print-sheet { padding: 0; margin: 0; font-size: 12px; }
  .hrt-container .hrt-sheet .sheet-page { border: none; box-shadow: none; padding: 0; margin: 0; }
  .hrt-container .hrt-sheet .sheet-page + .sheet-page { page-break-before: always; }
  /* keep a standard cycle (~26 rows) on one A4 page */
  .hrt-container .hrt-sheet .list-table td { height: auto; padding: 1px 5px; line-height: 1.3; }
  .hrt-container .hrt-sheet .sheet-patient th, .hrt-container .hrt-sheet .sheet-patient td { padding: 2px 8px; }
  .hrt-container .hrt-sheet .key-dates { padding: 2px 6px; margin-bottom: 6px; }
  .hrt-container .hrt-sheet .info-box { padding: 4px 8px; }
  html, body { background: #fff !important; }
  @page { size: A4 portrait; margin: 10mm; }
}
</style>
