// Frozen-embryo-transfer schedule for the hormone-replacement (HR) cycle.
//
// Defaults are transcribed from the HR-BT / HR-ET patient sheets in
// docs/HR-images. Every progestin start, the blood test and the pregnancy
// test are anchored to the transfer day (T); the estrogen is anchored to the
// menstrual cycle day.
//
//   HR-BT (胚盤胞):  T-8 受診 → T-7 23時 デュファストン開始
//                    → T-4 採血 + 23時 ウトロゲスタン開始 → T 移植 → T+7 判定
//   HR-ET (分割胚):  T-3 受診 → T-2 23時 デュファストン開始
//                    → T 移植 + 23時 ウトロゲスタン開始 → T+10 判定
//
// Doses are per time slot (7時 / 15時 / 23時). On the pregnancy-test day the
// 23時 dose is withheld (decided by the result), as on the paper sheets.

export var SLOT_LABELS = ['7時', '15時', '23時'];
var NIGHT = 2;

export var PROTOCOLS = [
  {
    id: 'BT', code: 'HR-BT', name: 'ホルモン補充周期（胚盤胞移植）', embryo: '胚盤胞移植',
    judgeOffset: 7,
    bloodTestOffset: -4,
    progestinStart: { duphaston: -7, utrogestan: -4 }
  },
  {
    id: 'ET', code: 'HR-ET', name: 'ホルモン補充周期（分割胚移植）', embryo: '分割胚移植',
    judgeOffset: 10,
    bloodTestOffset: null,
    progestinStart: { duphaston: -2, utrogestan: 0 }
  }
];

// type 'patch': N patches every evening, alternating right/left (each patch
//               stays 2 days). type 'tid': tablets per slot.
export var ESTROGENS = [
  {
    id: 'estrana', name: 'エストラーナテープ', short: 'エストラーナ', type: 'patch',
    unit: '枚', defaultCount: 2,
    description: [
      'エストラーナ：子宮内膜の増殖を促します。',
      '入浴後、寝る前に貼付します。',
      '2日毎に貼り替えます（貼ったまま入浴OK）。',
      '貼る位置は肌荒れを防ぐため、適宜ずらしてください。',
      '途中ではがれかかったら、新しいテープと交換してください。その際、貼り替えのスケジュールは変更しません。'
    ]
  },
  {
    id: 'julina', name: 'ジュリナ錠', short: 'ジュリナ', type: 'tid',
    unit: '錠', defaultDose: [3, 3, 3],
    description: ['ジュリナ：エストロゲン剤です。子宮内膜を増殖させます。']
  }
];

export var PROGESTINS = [
  { id: 'duphaston', name: 'デュファストン錠', short: 'デュファストン', abbr: 'デュファ', unit: '錠', defaultDose: [2, 2, 2] },
  { id: 'utrogestan', name: 'ウトロゲスタン腟用カプセル', short: 'ウトロゲスタン腟剤', abbr: 'ウトロ', unit: '個', defaultDose: [1, 1, 1] }
];

export var PROGESTIN_DESCRIPTION = 'プロゲステロン剤：着床への準備を促し、着床後の内膜を安定させます。';

export var STANDARD_NOTES = [
  '妊娠判定後の来院日は結果により異なります。'
];

export var WARNING_BOX = '血栓症（エコノミークラス症候群）、肝機能障害、乳癌、子宮体癌の既往がある方で、' +
  '当院への申告をされていない場合は、速やかにお申し出ください。';

// ---- dates (local midnight; never parse ISO strings with Date() — IE11) ----

export function parseYmd(s) {
  var m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(s || '').trim());
  if (!m) return null;
  var d = new Date(+m[1], +m[2] - 1, +m[3]);
  if (d.getMonth() !== +m[2] - 1) return null;
  return d;
}

export function toYmd(d) {
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}

function pad2(n) { return (n < 10 ? '0' : '') + n; }

export function addDays(d, n) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

export function diffDays(a, b) {
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

var WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

export function dateLabel(d) {
  return (d.getMonth() + 1) + '/' + d.getDate() + '(' + WEEKDAYS[d.getDay()] + ')';
}

export function longDateLabel(d) {
  return (d.getMonth() + 1) + '月' + d.getDate() + '日(' + WEEKDAYS[d.getDay()] + ')';
}

// ---- Japanese public holidays (current law; equinox formula valid 1980–2099) ----

var holidayCache = {};

function nthMonday(y, month, n) {
  var first = new Date(y, month - 1, 1).getDay();
  return 1 + ((8 - first) % 7) + (n - 1) * 7;
}

function holidaysOf(y) {
  if (holidayCache[y]) return holidayCache[y];
  var h = {};
  var set = function (m, d, name) { h[m + '-' + d] = name; };
  set(1, 1, '元日');
  set(1, nthMonday(y, 1, 2), '成人の日');
  set(2, 11, '建国記念の日');
  set(2, 23, '天皇誕生日');
  set(3, Math.floor(20.8431 + 0.242194 * (y - 1980) - Math.floor((y - 1980) / 4)), '春分の日');
  set(4, 29, '昭和の日');
  set(5, 3, '憲法記念日');
  set(5, 4, 'みどりの日');
  set(5, 5, 'こどもの日');
  set(7, nthMonday(y, 7, 3), '海の日');
  set(8, 11, '山の日');
  set(9, nthMonday(y, 9, 3), '敬老の日');
  set(9, Math.floor(23.2488 + 0.242194 * (y - 1980) - Math.floor((y - 1980) / 4)), '秋分の日');
  set(10, nthMonday(y, 10, 2), 'スポーツの日');
  set(11, 3, '文化の日');
  set(11, 23, '勤労感謝の日');

  var keys = Object.keys(h);
  // 国民の休日: a weekday sandwiched between two holidays
  for (var i = 0; i < keys.length; i++) {
    var p = keys[i].split('-');
    var mid = new Date(y, +p[0] - 1, +p[1] + 1);
    var next = addDays(mid, 1);
    var midKey = (mid.getMonth() + 1) + '-' + mid.getDate();
    if (!h[midKey] && mid.getDay() !== 0 && mid.getFullYear() === y &&
        h[(next.getMonth() + 1) + '-' + next.getDate()]) {
      h[midKey] = '国民の休日';
    }
  }
  // 振替休日: a holiday on Sunday moves to the next non-holiday day
  keys = Object.keys(h);
  for (var j = 0; j < keys.length; j++) {
    var q = keys[j].split('-');
    var d = new Date(y, +q[0] - 1, +q[1]);
    if (d.getDay() !== 0) continue;
    do { d = addDays(d, 1); } while (h[(d.getMonth() + 1) + '-' + d.getDate()]);
    if (d.getFullYear() === y) h[(d.getMonth() + 1) + '-' + d.getDate()] = '振替休日';
  }
  holidayCache[y] = h;
  return h;
}

export function holidayName(d) {
  return holidaysOf(d.getFullYear())[(d.getMonth() + 1) + '-' + d.getDate()] || '';
}

// ---- schedule builder ----

// Dose cells:
//   tid   → { slots: [a, b, c] }  a number per slot; 0 = ×, '*' = 受診時に指示
//   patch → { side: '右'|'左', count: n|'*' }  or { judge: true }
//
// opts:
//   cycleStart        Date (月経1日目)
//   estrogenStartDay  cycle day the estrogen starts (23時/就寝前)
//   estrogen          ESTROGENS entry
//   estrogenDose1     before the dose-change visit (number for patch, [a,b,c] for tid)
//   estrogenDose2     from the evening of the dose-change visit
//   visits            [{ date, label, note }] — visits[0] is the dose-change visit
//   transferDate      Date | null (null = 受診日までの暫定表)
//   progestins        [{ name, short, abbr, unit, dose:[a,b,c], startOffset, startSlot }]
//   bloodTestOffset   number | null (relative to T)
//   judgeOffset       number (relative to T)
//   notes             { bloodTest, transfer, judge }
export function buildSchedule(opts) {
  var result = { columns: [], rows: [], keyDates: [], warnings: [], errors: [], complete: false };
  var cycleStart = opts.cycleStart;
  if (!cycleStart) { result.errors.push('月経開始日を入力してください。'); return result; }

  var estStart = addDays(cycleStart, (opts.estrogenStartDay || 2) - 1);
  var visits = (opts.visits || []).filter(function (v) { return v.date; });
  var mainVisit = visits.length ? visits[0].date : null;
  if (!mainVisit) { result.errors.push('受診日を入力してください。'); return result; }

  var T = opts.transferDate;
  var complete = !!T;
  result.complete = complete;
  var judge = complete ? addDays(T, opts.judgeOffset) : null;
  var lastVisit = visits.reduce(function (m, v) { return v.date > m ? v.date : m; }, mainVisit);
  var end = complete ? judge : lastVisit;

  if (mainVisit < estStart) result.errors.push('受診日が薬の開始日より前になっています。');
  if (complete && T <= mainVisit) result.errors.push('移植日が受診日より前（または同じ日）になっています。');
  if (diffDays(end, estStart) > 90) result.errors.push('期間が90日を超えています。日付を確認してください。');
  if (result.errors.length) return result;

  var progestins = complete ? (opts.progestins || []) : [];
  progestins = progestins.map(function (p) {
    return Object.assign({}, p, { start: addDays(T, p.startOffset) });
  });
  progestins.forEach(function (p) {
    if (p.start <= mainVisit) {
      result.warnings.push(p.short + 'の開始日（' + longDateLabel(p.start) + '）が受診日以前になっています。');
    }
  });
  visits.forEach(function (v) {
    if (v.date < estStart || v.date > end) {
      result.warnings.push('受診日 ' + longDateLabel(v.date) + ' は表の期間外のため表示されません。');
    }
  });

  var est = opts.estrogen;
  result.columns.push({ kind: 'estrogen', type: est.type, name: est.name, short: est.short, abbr: est.short, unit: est.unit });
  progestins.forEach(function (p) {
    result.columns.push({ kind: 'progestin', type: 'tid', name: p.name, short: p.short, abbr: p.abbr, unit: p.unit });
  });

  // events by date
  var events = {};
  var addEvent = function (date, ev) {
    var k = toYmd(date);
    (events[k] = events[k] || []).push(ev);
  };
  visits.forEach(function (v, i) {
    addEvent(v.date, { kind: 'visit', short: i === 0 ? '受診' : (v.short || '受診'), label: v.label || '受診', note: v.note || '' });
  });
  var bloodDate = null;
  if (complete && opts.bloodTestOffset !== null && opts.bloodTestOffset !== undefined) {
    bloodDate = addDays(T, opts.bloodTestOffset);
    addEvent(bloodDate, { kind: 'blood', short: '採血', label: '採血のみ', note: (opts.notes && opts.notes.bloodTest) || '' });
  }
  if (complete) {
    addEvent(T, { kind: 'transfer', short: '移植', label: '胚移植', note: (opts.notes && opts.notes.transfer) || '' });
    addEvent(judge, {
      kind: 'judge', short: '判定', label: '妊娠判定（移植後' + opts.judgeOffset + '日目）',
      note: (opts.notes && opts.notes.judge) || ''
    });
  }

  for (var d = estStart; d <= end; d = addDays(d, 1)) {
    var isJudge = complete && +d === +judge;
    var isLast = !complete && +d === +lastVisit;
    var cells = [estrogenCell(est, d, estStart, mainVisit, opts, isJudge, isLast)];
    progestins.forEach(function (p) { cells.push(progestinCell(p, d, isJudge)); });
    var evs = events[toYmd(d)] || [];
    result.rows.push({
      date: d,
      ymd: toYmd(d),
      cycleDay: diffDays(d, cycleStart) + 1,
      weekday: d.getDay(),
      holiday: holidayName(d),
      events: evs,
      kinds: evs.map(function (e) { return e.kind; }),
      cells: cells
    });
  }

  // key dates summary (in date order)
  var kd = [{ label: '月経開始日', date: cycleStart }, { label: est.short + ' 開始', date: estStart }];
  visits.forEach(function (v) { if (v.date <= end) kd.push({ label: v.label || '受診', date: v.date, mark: 'visit' }); });
  progestins.forEach(function (p) {
    kd.push({ label: p.short + ' 開始（' + SLOT_LABELS[p.startSlot] + '〜）', date: p.start });
  });
  if (bloodDate) kd.push({ label: '採血のみ', date: bloodDate, mark: 'blood' });
  if (complete) {
    kd.push({ label: '胚移植', date: T, mark: 'transfer' });
    kd.push({ label: '妊娠判定', date: judge, mark: 'judge' });
  }
  kd.sort(function (a, b) { return a.date - b.date; });
  result.keyDates = kd;

  // dates the patient must come in — flag weekends/holidays (informational)
  [].concat(visits.map(function (v) { return v.date; }), bloodDate ? [bloodDate] : [], complete ? [T, judge] : [])
    .forEach(function (date) {
      var h = holidayName(date);
      if (h || date.getDay() === 0) {
        result.warnings.push(longDateLabel(date) + ' は' + (h ? '祝日（' + h + '）' : '日曜日') + 'です。来院日として問題ないか確認してください。');
      }
    });

  return result;
}

function estrogenCell(est, d, estStart, mainVisit, opts, isJudge, isLast) {
  var n = diffDays(d, estStart);
  var dose1 = opts.estrogenDose1;
  var dose2 = opts.estrogenDose2;
  if (est.type === 'patch') {
    if (isJudge) return { judge: true };
    var side = n % 2 === 0 ? '右' : '左';
    if (isLast) return { side: side, count: '*' };
    return { side: side, count: d < mainVisit ? dose1 : dose2 };
  }
  var slots;
  if (d < mainVisit) slots = dose1.slice();
  else if (+d === +mainVisit) slots = [dose1[0], dose1[1], dose2[2]];
  else slots = dose2.slice();
  if (n === 0) { slots[0] = 0; slots[1] = 0; }
  if (isLast) slots[NIGHT] = '*';
  if (isJudge) slots[NIGHT] = 0;
  return { slots: slots };
}

function progestinCell(p, d, isJudge) {
  if (d < p.start) return null;
  var slots = p.dose.slice();
  if (+d === +p.start) {
    for (var i = 0; i < p.startSlot; i++) slots[i] = 0;
  }
  if (isJudge) slots[NIGHT] = 0;
  return { slots: slots };
}

export function formatSlots(slots) {
  return slots.map(function (v) {
    if (v === '*') return '＊';
    return v ? String(v) : '×';
  }).join('-');
}
