// Lab report cleaner / formatter for pasted EMR results.
//
// Input is text copied from the hospital EMR lab panel. Two shapes appear:
//   - value only:        "024  RBC               3.48 L"
//   - value + ref + unit: "022  RBC  3.62 L   3.86-4.92   x10^6/μL"
// We strip the leading row number and the boilerplate rows (依頼元 / ｺﾒﾝﾄ /
// 付加コメント etc.), attach a unit (from the input column or a default
// dictionary), and append CTCAE v5.0 grades on the right for the lab toxicities
// that are graded purely on a value.
//
// All grades are reference values only; CTCAE criteria that need symptoms or
// clinical context are intentionally not evaluated here.

// ---- default units for the unit-less paste format (clip.txt) ----
export var DEFAULT_UNITS = {
  'WBC': 'x10^3/μL', 'RBC': 'x10^6/μL', 'HGB': 'g/dL', 'HTC': '%',
  'MCV': 'fl', 'MCH': 'pg', 'MCHC': '%', 'RDW': '%', 'PLT': 'x10^3/μL', 'MPV': 'fl',
  'Neut': '%', 'Lymp': '%', 'Mono': '%', 'Eos': '%', 'Baso': '%',
  'Neut/μL': 'x10^3/μL', 'Lymp/μL': 'x10^3/μL', 'Mono/μL': 'x10^3/μL',
  'Eos/μL': 'x10^3/μL', 'Baso/μL': 'x10^3/μL', 'N-RBC': '/100WBC',
  'PT': 'sec', 'PT %': '%', 'PT INR': '', 'APTT': 'sec', 'FIB': 'mg/dL',
  'D.D': 'μg/mL', 'AT-Ⅲ': '%',
  'TP': 'g/dL', 'ALB': 'g/dL', 'T-BIL': 'mg/dL', 'D-BIL': 'mg/dL',
  'T-CHO': 'mg/dL', 'TG': 'mg/dL', 'ChE': 'U/L', 'ALP_IF': 'U/L', '_JS換算': 'U/L',
  'AST': 'U/L', 'ALT': 'U/L', 'LD': 'U/L', 'γGT': 'U/L', 'CK': 'U/L',
  'AMY': 'U/L', 'ﾘﾊﾟｰｾﾞ': 'U/L',
  'BUN': 'mg/dL', 'CRE': 'mg/dL', 'eGFR': 'mL/min', 'UA': 'mg/dL',
  'CysC': 'mg/L', 'eGFRCys': 'mL/min',
  'Na': 'mmol/L', 'K': 'mmol/L', 'Cl': 'mmol/L', 'Ca': 'mg/dL',
  '補正Ca': 'mg/dL', 'IP': 'mg/dL', '血糖': 'mg/dL', 'HbA1c NGSP': '%',
  'CRP': 'mg/dL', 'FT3': 'pg/mL', 'FT4': 'ng/dL', 'TSH': 'μIU/mL',
  'ｺﾙﾁｿﾞｰﾙ': 'μg/dL', 'ACTH': 'pg/mL', 'KL-6': 'U/mL',
  'CA19-9': 'U/mL', 'CA125': 'U/mL', 'RPR定量': '', 'HBs Ag': '', 'HBs Ab': 'mIU/mL'
};

// ---- default reference ranges for grading when the paste has no ref column ----
// female adult ranges roughly matching the EMR; {lln, uln}
var DEFAULT_REF = {
  'HGB': { lln: 11.6, uln: 14.8 },
  'PLT': { lln: 158, uln: 348 },
  'WBC': { lln: 3.3, uln: 8.6 },
  'Neut/μL': { lln: 1.5, uln: 7.5 },
  'Lymp/μL': { lln: 1.0, uln: 4.0 },
  'AST': { lln: 13, uln: 30 },
  'ALT': { lln: 7, uln: 23 },
  'ALP_IF': { lln: 38, uln: 113 },
  'γGT': { lln: 9, uln: 32 },
  'T-BIL': { lln: 0.4, uln: 1.5 },
  'CRE': { lln: 0.46, uln: 0.79 },
  'Na': { lln: 138, uln: 145 },
  'K': { lln: 3.6, uln: 4.8 },
  'Ca': { lln: 8.8, uln: 10.1 },
  '補正Ca': { lln: 8.8, uln: 10.1 },
  'ALB': { lln: 4.1, uln: 5.1 },
  'IP': { lln: 2.5, uln: 4.5 }
};

// Lines that are always boilerplate noise.
function isNoiseLine(name, rest) {
  if (name === '') return true;
  if (/^依頼元/.test(name)) return true;
  if (/ｺﾒﾝﾄ/.test(name)) return true;
  if (/^(付加コメント|依頼コメント|検体コメント)$/.test(name)) return true;
  if (/^結果値種別/.test(name)) return true;
  return false;
}

// Parse the pasted report into a list of {type:'section'|'item', ...} entries.
export function parseLabReport(text) {
  var lines = String(text).replace(/\r/g, '').split('\n');
  var out = [];
  var pendingName = null; // for 項目 / 結果 pairs in urine sediment

  for (var i = 0; i < lines.length; i++) {
    var raw = lines[i];
    // drop a leading 3-digit row number (e.g. "024 ")
    var body = raw.replace(/^\s*\d{3}\s+/, '').replace(/^\s+/, '');
    body = body.replace(/\s+$/, '');
    if (body === '') continue;

    // section header: "[血算]"
    var sec = body.match(/^\[(.+?)\]$/);
    if (sec) {
      out.push({ type: 'section', name: sec[1] });
      pendingName = null;
      continue;
    }

    // split into columns on runs of 2+ spaces
    var cols = body.split(/\s{2,}/);
    var name = cols[0].replace(/\s+$/, '');
    var value = cols.length > 1 ? cols[1].replace(/\s+/g, ' ').replace(/\s+$/, '') : '';
    var ref = cols.length > 2 ? cols[2] : '';
    var unit = cols.length > 3 ? cols[3] : '';

    // strip a trailing "外注" marker that can ride along the value column
    value = value.replace(/\s*外注\s*$/, '').replace(/\s+$/, '');

    if (isNoiseLine(name, body)) continue;

    // 項目 / 結果 pair → fold into a single named item
    if (name === '項目') { pendingName = value; continue; }
    if (name === '結果') {
      if (pendingName) { name = pendingName; pendingName = null; }
      else name = '結果';
    }

    // split an H/L flag off the value ("3.62 L" → value 3.62, flag L)
    var flag = '';
    var fm = value.match(/^(.+?)\s+([HL])$/);
    if (fm) { value = fm[1]; flag = fm[2]; }

    // drop rows with no usable value (unmeasured "-" or empty)
    if (value === '' || value === '-') continue;

    out.push({
      type: 'item',
      name: name,
      value: value,
      flag: flag,
      ref: ref,
      unit: unit
    });
  }
  return out;
}

// Resolve the unit for an item: explicit column wins, else dictionary.
function resolveUnit(item) {
  if (item.unit && item.unit !== '') return item.unit;
  if (Object.prototype.hasOwnProperty.call(DEFAULT_UNITS, item.name)) return DEFAULT_UNITS[item.name];
  return '';
}

// Extract a numeric value from strings like "3.62", "<0.1", ">100/H", "<23.0".
// Returns null when there is no single number (e.g. "5-9/H", "(-)", "陰性").
function numericValue(value) {
  var v = String(value).replace(/[<>]/g, '').replace(/\/.*$/, '').replace(/[HL]$/, '').trim();
  if (/^-?\d+(\.\d+)?$/.test(v)) return parseFloat(v);
  return null;
}

// Parse a reference column into {lln, uln} where possible.
function parseRef(ref) {
  if (!ref) return null;
  var r = ref.replace(/\s/g, '');
  var m = r.match(/^(-?\d+(?:\.\d+)?)-(-?\d+(?:\.\d+)?)$/);
  if (m) return { lln: parseFloat(m[1]), uln: parseFloat(m[2]) };
  m = r.match(/^<=?(-?\d+(?:\.\d+)?)$/);
  if (m) return { uln: parseFloat(m[1]) };
  m = r.match(/^(-?\d+(?:\.\d+)?)以上$/);
  if (m) return { lln: parseFloat(m[1]) };
  return null;
}

// Convert a value to absolute count/μL when the unit is a x10^n concentration.
function toAbsolute(num, unit) {
  if (/10\^3/.test(unit)) return num * 1000;
  if (/10\^6/.test(unit)) return num * 1000000;
  return num;
}

// pick LLN/ULN for grading: input ref column first, then default dictionary
function refFor(item) {
  var r = parseRef(item.ref);
  if (r && (r.lln != null || r.uln != null)) return r;
  if (Object.prototype.hasOwnProperty.call(DEFAULT_REF, item.name)) return DEFAULT_REF[item.name];
  return null;
}

// ratio-based high grade: thresholds are multiples of ULN, ascending
function gradeHighRatio(value, uln, label, mults) {
  if (uln == null) return '';
  var ratio = value / uln;
  if (ratio <= mults[0]) return ''; // within / at ULN bound handled by caller
  for (var g = mults.length - 1; g >= 0; g--) {
    if (ratio > mults[g]) return label + ' Grade ' + (g + 1);
  }
  return '';
}

// CTCAE v5.0 grade for a single item. Returns '' when not gradeable / normal.
export function gradeItem(item, byName) {
  var unit = resolveUnit(item);
  var num = numericValue(item.value);
  if (num == null) return '';
  var ref = refFor(item);

  switch (item.name) {
    // ---- hematology ----
    case 'HGB': { // Anemia (g/dL)
      if (num >= 8.0 && num < 10.0) return 'Anemia Grade 2';
      if (num < 8.0) return 'Anemia Grade 3';
      var lln = ref ? ref.lln : 11.6;
      if (num < lln) return 'Anemia Grade 1';
      return '';
    }
    case 'WBC': { // Leukopenia (×10^3/μL → /μL)
      var w = toAbsolute(num, unit);
      if (w < 1000) return 'Leukopenia Grade 4';
      if (w < 2000) return 'Leukopenia Grade 3';
      if (w < 3000) return 'Leukopenia Grade 2';
      var lln2 = (ref && ref.lln != null) ? ref.lln * 1000 : 3300;
      if (w < lln2) return 'Leukopenia Grade 1';
      return '';
    }
    case 'Neut/μL': { // Neutrophil count decreased
      var n = toAbsolute(num, unit);
      if (n < 500) return 'Neutropenia Grade 4';
      if (n < 1000) return 'Neutropenia Grade 3';
      if (n < 1500) return 'Neutropenia Grade 2';
      var llnN = (ref && ref.lln != null) ? ref.lln * 1000 : 1500;
      if (n < llnN) return 'Neutropenia Grade 1';
      return '';
    }
    case 'Lymp/μL': { // Lymphocyte count decreased
      var l = toAbsolute(num, unit);
      if (l < 200) return 'Lymphopenia Grade 4';
      if (l < 500) return 'Lymphopenia Grade 3';
      if (l < 800) return 'Lymphopenia Grade 2';
      var llnL = (ref && ref.lln != null) ? ref.lln * 1000 : 1000;
      if (l < llnL) return 'Lymphopenia Grade 1';
      return '';
    }
    case 'PLT': { // Platelet count decreased
      var p = toAbsolute(num, unit);
      if (p < 25000) return 'Platelet count decreased Grade 4';
      if (p < 50000) return 'Platelet count decreased Grade 3';
      if (p < 75000) return 'Platelet count decreased Grade 2';
      var llnP = (ref && ref.lln != null) ? ref.lln * 1000 : 158000;
      if (p < llnP) return 'Platelet count decreased Grade 1';
      return '';
    }

    // ---- hepatic (ratio of ULN) ----
    case 'AST': return gradeAboveUln(num, ref, 'AST increased', [1, 3, 5, 20]);
    case 'ALT': return gradeAboveUln(num, ref, 'ALT increased', [1, 3, 5, 20]);
    case 'ALP_IF': return gradeAboveUln(num, ref, 'Alkaline phosphatase increased', [1, 2.5, 5, 20]);
    case 'γGT': return gradeAboveUln(num, ref, 'GGT increased', [1, 2.5, 5, 20]);
    case 'T-BIL': return gradeAboveUln(num, ref, 'Blood bilirubin increased', [1, 1.5, 3, 10]);

    // ---- renal ----
    case 'CRE': return gradeAboveUln(num, ref, 'Creatinine increased', [1, 1.5, 3, 6]);

    // ---- electrolytes ----
    case 'Na': {
      if (num < 120) return 'Hyponatremia Grade 4';
      if (num < 130) return 'Hyponatremia Grade 3';
      var llnNa = ref && ref.lln != null ? ref.lln : 138;
      if (num < llnNa) return 'Hyponatremia Grade 1';
      var ulnNa = ref && ref.uln != null ? ref.uln : 145;
      if (num > 160) return 'Hypernatremia Grade 4';
      if (num > 155) return 'Hypernatremia Grade 3';
      if (num > 150) return 'Hypernatremia Grade 2';
      if (num > ulnNa) return 'Hypernatremia Grade 1';
      return '';
    }
    case 'K': {
      var llnK = ref && ref.lln != null ? ref.lln : 3.6;
      if (num < 2.5) return 'Hypokalemia Grade 4';
      if (num < 3.0) return 'Hypokalemia Grade 3';
      if (num < llnK) return 'Hypokalemia Grade 1';
      var ulnK = ref && ref.uln != null ? ref.uln : 4.8;
      if (num > 7.0) return 'Hyperkalemia Grade 4';
      if (num > 6.0) return 'Hyperkalemia Grade 3';
      if (num > 5.5) return 'Hyperkalemia Grade 2';
      if (num > ulnK) return 'Hyperkalemia Grade 1';
      return '';
    }
    case 'Ca':
    case '補正Ca': {
      // skip plain Ca when a corrected Ca is also present
      if (item.name === 'Ca' && byName && byName['補正Ca']) return '';
      var llnCa = ref && ref.lln != null ? ref.lln : 8.8;
      if (num < 6.0) return 'Hypocalcemia Grade 4';
      if (num < 7.0) return 'Hypocalcemia Grade 3';
      if (num < 8.0) return 'Hypocalcemia Grade 2';
      if (num < llnCa) return 'Hypocalcemia Grade 1';
      var ulnCa = ref && ref.uln != null ? ref.uln : 10.1;
      if (num > 13.5) return 'Hypercalcemia Grade 4';
      if (num > 12.5) return 'Hypercalcemia Grade 3';
      if (num > 11.5) return 'Hypercalcemia Grade 2';
      if (num > ulnCa) return 'Hypercalcemia Grade 1';
      return '';
    }
    case 'IP': { // Hypophosphatemia
      if (num < 1.0) return 'Hypophosphatemia Grade 4';
      if (num < 2.0) return 'Hypophosphatemia Grade 3';
      if (num < 2.5) return 'Hypophosphatemia Grade 2';
      var llnP2 = ref && ref.lln != null ? ref.lln : 2.5;
      if (num < llnP2) return 'Hypophosphatemia Grade 1';
      return '';
    }

    // ---- protein ----
    case 'ALB': { // Hypoalbuminemia (g/dL)
      if (num < 2.0) return 'Hypoalbuminemia Grade 3';
      if (num < 3.0) return 'Hypoalbuminemia Grade 2';
      var llnAlb = ref && ref.lln != null ? ref.lln : 4.1;
      if (num < llnAlb) return 'Hypoalbuminemia Grade 1';
      return '';
    }
    default:
      return '';
  }
}

// "increased" labs graded as multiples of ULN. mults[0] is the ULN bound.
function gradeAboveUln(num, ref, label, mults) {
  var uln = ref && ref.uln != null ? ref.uln : null;
  if (uln == null) return '';
  var ratio = num / uln;
  if (ratio > mults[3]) return label + ' Grade 4';
  if (ratio > mults[2]) return label + ' Grade 3';
  if (ratio > mults[1]) return label + ' Grade 2';
  if (ratio > mults[0]) return label + ' Grade 1';
  return '';
}

// extract grade number (1-4) from a grade string, or 0
export function gradeLevel(gradeStr) {
  var m = String(gradeStr).match(/Grade\s+(\d)/);
  return m ? parseInt(m[1], 10) : 0;
}

// Build the formatted, column-aligned report text.
export function formatReport(parsed) {
  // index items by name for cross-references (e.g. corrected Ca)
  var byName = {};
  for (var i = 0; i < parsed.length; i++) {
    if (parsed[i].type === 'item') byName[parsed[i].name] = parsed[i];
  }

  // compute display rows first
  var rows = [];
  var nameW = 0, valW = 0, unitFlagW = 0;
  for (var j = 0; j < parsed.length; j++) {
    var e = parsed[j];
    if (e.type === 'section') { rows.push({ section: e.name }); continue; }
    var unit = resolveUnit(e);
    var grade = gradeItem(e, byName);
    var unitFlag = unit;
    if (e.flag) unitFlag = (unit ? unit + ' ' : '') + '(' + e.flag + ')';
    rows.push({ name: e.name, value: e.value, unitFlag: unitFlag, grade: grade });
    if (e.name.length > nameW) nameW = e.name.length;
    if (e.value.length > valW) valW = e.value.length;
    if (unitFlag.length > unitFlagW) unitFlagW = unitFlag.length;
  }

  var lines = [];
  for (var k = 0; k < rows.length; k++) {
    var r = rows[k];
    if (r.section != null) {
      lines.push('【' + r.section + '】');
      continue;
    }
    var line = padEnd(r.name, nameW) + '  ' + padStart(r.value, valW) + '  ' + r.unitFlag;
    if (r.grade) line = padEnd(line, nameW + 2 + valW + 2 + unitFlagW) + '  ' + r.grade;
    lines.push(line.replace(/\s+$/, ''));
  }
  return lines.join('\n');
}

function padEnd(s, w) {
  s = String(s);
  while (s.length < w) s += ' ';
  return s;
}
function padStart(s, w) {
  s = String(s);
  while (s.length < w) s = ' ' + s;
  return s;
}

// Convenience: text in → formatted text out.
export function cleanLabText(text) {
  return formatReport(parseLabReport(text));
}
