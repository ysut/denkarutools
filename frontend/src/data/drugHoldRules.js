// Perioperative drug-hold reference rules.
// Each rule lists a representative drug, its aliases (brand/generic names),
// and typical pre-/post-operative hold guidance for elective gynecologic surgery.
// These are reference values only — institutional policy and the attending
// physician's judgement always take precedence.

export const DRUG_HOLD_RULES = [
  // ---- 抗血小板薬 ----
  {
    category: '抗血小板薬',
    drug: 'アスピリン',
    aliases: ['アスピリン', 'バイアスピリン', 'バファリン', 'タケルダ', 'コンプラビン', 'aspirin'],
    stop: '手術 7日前',
    resume: '止血確認後（術後1〜3日目安）',
    note: '血栓リスクが高い患者では休薬可否を処方医（循環器・脳神経内科など）と必ず相談。'
  },
  {
    category: '抗血小板薬',
    drug: 'クロピドグレル',
    aliases: ['クロピドグレル', 'プラビックス', 'コンプラビン'],
    stop: '手術 7〜14日前（施設基準に従う）',
    resume: '止血確認後、処方医と相談のうえ再開',
    note: 'ステント留置後などは休薬で血栓リスクが上がるため、処方医との調整が必須。'
  },
  {
    category: '抗血小板薬',
    drug: 'プラスグレル',
    aliases: ['プラスグレル', 'エフィエント'],
    stop: '手術 14日前',
    resume: '止血確認後、処方医と相談のうえ再開',
    note: '添付文書上、出血リスクのある手術では14日以上前の休薬が推奨。'
  },
  {
    category: '抗血小板薬',
    drug: 'チクロピジン',
    aliases: ['チクロピジン', 'パナルジン'],
    stop: '手術 10〜14日前',
    resume: '止血確認後、処方医と相談のうえ再開',
    note: ''
  },
  {
    category: '抗血小板薬',
    drug: 'シロスタゾール',
    aliases: ['シロスタゾール', 'プレタール'],
    stop: '手術 3日前',
    resume: '食事再開後、止血確認後',
    note: '半減期が短く、休薬期間は比較的短くてよい。'
  },
  {
    category: '抗血小板薬・脂質',
    drug: 'イコサペント酸エチル（EPA）',
    aliases: ['イコサペント酸', 'エパデール', 'ロトリガ', 'オメガ3', 'EPA'],
    stop: '手術 7日前目安',
    resume: '食事再開後',
    note: '血小板凝集抑制作用があるため術前休薬が望ましい。'
  },

  // ---- 抗凝固薬 ----
  {
    category: '抗凝固薬',
    drug: 'ワルファリン',
    aliases: ['ワルファリン', 'ワーファリン', 'ワーファリンカリウム'],
    stop: '手術 3〜5日前（PT-INR確認）',
    resume: '術後出血がなければ早期に再開（必要時はヘパリン併用）',
    note: '血栓高リスク例ではヘパリン置換を検討。術前にPT-INRの正常化を確認する。'
  },
  {
    category: '抗凝固薬（DOAC）',
    drug: 'ダビガトラン',
    aliases: ['ダビガトラン', 'プラザキサ'],
    stop: '手術 1〜2日前（腎機能低下例では最大4日前）',
    resume: '止血確認後（術後1〜3日目安）',
    note: '腎排泄型のためCcrに応じて休薬期間を延長する。'
  },
  {
    category: '抗凝固薬（DOAC）',
    drug: 'リバーロキサバン',
    aliases: ['リバーロキサバン', 'イグザレルト'],
    stop: '手術 24時間以上前（出血高リスク手術は48時間前）',
    resume: '止血確認後（術後1〜3日目安）',
    note: ''
  },
  {
    category: '抗凝固薬（DOAC）',
    drug: 'アピキサバン',
    aliases: ['アピキサバン', 'エリキュース'],
    stop: '手術 24時間以上前（出血高リスク手術は48時間前）',
    resume: '止血確認後（術後1〜3日目安）',
    note: ''
  },
  {
    category: '抗凝固薬（DOAC）',
    drug: 'エドキサバン',
    aliases: ['エドキサバン', 'リクシアナ'],
    stop: '手術 24時間以上前（出血高リスク手術は48時間前）',
    resume: '止血確認後（術後1〜3日目安）',
    note: ''
  },

  // ---- 糖尿病薬 ----
  {
    category: '糖尿病薬（ビグアナイド）',
    drug: 'メトホルミン',
    aliases: ['メトホルミン', 'メトグルコ', 'グリコラン', 'メタクト', 'イニシンク', 'エクメット', 'メトアナ'],
    stop: '手術 48時間前から休薬',
    resume: '術後48時間以降、食事・腎機能が安定してから',
    note: '乳酸アシドーシス予防のため。ヨード造影剤検査の前後48時間も休薬。'
  },
  {
    category: '糖尿病薬（SGLT2阻害薬）',
    drug: 'SGLT2阻害薬',
    aliases: ['エンパグリフロジン', 'ジャディアンス', 'ダパグリフロジン', 'フォシーガ', 'イプラグリフロジン', 'スーグラ', 'カナグリフロジン', 'カナグル', 'トホグリフロジン', 'デベルザ', 'ルセオグリフロジン', 'ルセフィ', 'トラディアンス', 'カナリア', 'スージャヌ'],
    stop: '手術 3日前から休薬',
    resume: '食事が十分摂取できるようになってから',
    note: '正常血糖ケトアシドーシスの予防のため術前3日間の休薬が推奨。'
  },
  {
    category: '糖尿病薬（SU薬）',
    drug: 'スルホニル尿素薬',
    aliases: ['グリメピリド', 'アマリール', 'グリベンクラミド', 'オイグルコン', 'ダオニール', 'グリクラジド', 'グリミクロン'],
    stop: '手術当日の朝から休薬',
    resume: '食事再開後',
    note: '絶食中の低血糖に注意。'
  },
  {
    category: '糖尿病薬（その他経口薬）',
    drug: 'DPP-4阻害薬など',
    aliases: ['シタグリプチン', 'ジャヌビア', 'グラクティブ', 'ビルダグリプチン', 'エクア', 'リナグリプチン', 'トラゼンタ', 'テネリグリプチン', 'テネリア', 'アログリプチン', 'ネシーナ', 'ボグリボース', 'ベイスン', 'アカルボース', 'グルコバイ', 'ミグリトール', 'セイブル', 'ピオグリタゾン', 'アクトス', 'レパグリニド', 'シュアポスト', 'ミチグリニド', 'グルファスト', 'ナテグリニド', 'スターシス'],
    stop: '手術当日の朝から休薬',
    resume: '食事再開後',
    note: ''
  },
  {
    category: '糖尿病薬（GLP-1受容体作動薬）',
    drug: 'GLP-1受容体作動薬',
    aliases: ['セマグルチド', 'オゼンピック', 'リベルサス', 'ウゴービ', 'デュラグルチド', 'トルリシティ', 'リラグルチド', 'ビクトーザ', 'エキセナチド', 'バイエッタ', 'ビデュリオン', 'チルゼパチド', 'マンジャロ'],
    stop: '連日製剤は手術当日、週1回製剤は手術1週間前を目安に休薬を検討',
    resume: '食事再開後',
    note: '胃内容排出遅延による誤嚥リスクが指摘されており、麻酔科と相談。'
  },
  {
    category: '糖尿病薬（インスリン）',
    drug: 'インスリン',
    aliases: ['インスリン', 'ノボラピッド', 'ヒューマログ', 'ランタス', 'トレシーバ', 'レベミル', 'アピドラ', 'フィアスプ', 'ルムジェブ', 'ライゾデグ'],
    stop: '原則継続（手術当日は減量・スライディングなど調節）',
    resume: '継続',
    note: '当日の投与量は血糖値・絶食時間に応じて麻酔科・内科と調整。'
  },

  // ---- 女性ホルモン関連 ----
  {
    category: '女性ホルモン（OC/LEP）',
    drug: '低用量ピル・LEP製剤',
    aliases: ['ピル', 'ヤーズ', 'ヤーズフレックス', 'ルナベル', 'フリウェル', 'ジェミーナ', 'マーベロン', 'ファボワール', 'トリキュラー', 'ラベルフィーユ', 'アンジュ', 'シンフェーズ', 'ドロエチ', 'OC', 'LEP'],
    stop: '手術 4週間前から休薬',
    resume: '術後2週間以降かつ十分に歩行できるようになってから',
    note: '静脈血栓塞栓症（VTE）リスクのため。緊急手術時は弾性ストッキング等で予防強化。'
  },
  {
    category: '女性ホルモン（HRT）',
    drug: 'ホルモン補充療法（エストロゲン製剤）',
    aliases: ['エストラーナ', 'ジュリナ', 'プレマリン', 'ディビゲル', 'ルエストロジェル', 'メノエイド', 'ウェールナラ', 'エフメノ', 'エストリール', 'ホーリン'],
    stop: '手術 4週間前を目安に休薬を検討',
    resume: '術後、歩行確立後に再開を検討',
    note: 'VTEリスクに応じて判断。経皮製剤はリスクが低いとされるが施設方針に従う。'
  },
  {
    category: '女性ホルモン（SERM）',
    drug: 'SERM（骨粗鬆症治療薬）',
    aliases: ['ラロキシフェン', 'エビスタ', 'バゼドキシフェン', 'ビビアント'],
    stop: '手術 3日前（長期不動が予想される場合）',
    resume: '十分に歩行できるようになってから',
    note: 'VTEリスクのため、長期臥床が見込まれる手術では休薬。'
  },
  {
    category: '女性ホルモン（抗エストロゲン薬）',
    drug: 'タモキシフェン',
    aliases: ['タモキシフェン', 'ノルバデックス'],
    stop: 'VTE高リスク手術では 2〜4週間前の休薬を検討',
    resume: '処方医（乳腺科など）と相談のうえ再開',
    note: '再発抑制効果とのバランスがあるため、自己判断で中止せず処方医と調整。'
  },

  // ---- その他 ----
  {
    category: 'NSAIDs（解熱鎮痛薬）',
    drug: 'NSAIDs',
    aliases: ['ロキソプロフェン', 'ロキソニン', 'ジクロフェナク', 'ボルタレン', 'セレコキシブ', 'セレコックス', 'イブプロフェン', 'ブルフェン', 'ナプロキセン', 'ナイキサン', 'エトドラク', 'メロキシカム', 'モービック'],
    stop: '原則継続可（施設方針により手術前日まで）',
    resume: '術後鎮痛として継続可',
    note: 'アスピリン以外のNSAIDsの血小板機能への影響は可逆的で半減期も短い。'
  },
  {
    category: 'SSRI/SNRI（抗うつ薬）',
    drug: 'SSRI・SNRI',
    aliases: ['パロキセチン', 'パキシル', 'セルトラリン', 'ジェイゾロフト', 'エスシタロプラム', 'レクサプロ', 'フルボキサミン', 'デプロメール', 'ルボックス', 'デュロキセチン', 'サインバルタ', 'ベンラファキシン', 'イフェクサー'],
    stop: '原則継続（出血リスク増加の報告はあるが中断リスクが上回ることが多い）',
    resume: '継続',
    note: '抗血栓薬併用時は出血リスクに注意。中止する場合は離脱症状に注意し処方医と相談。'
  },
  {
    category: 'サプリメント・健康食品',
    drug: 'サプリメント（EPA・イチョウ葉・ニンニクなど）',
    aliases: ['イチョウ葉', 'ギンコ', 'ニンニク', 'ガーリック', 'ビタミンE', 'セントジョーンズワート', 'セイヨウオトギリソウ', 'サプリ', 'サプリメント'],
    stop: '手術 7日前を目安に中止',
    resume: '術後、経口摂取安定後',
    note: '出血傾向や麻酔薬との相互作用の報告があるため、術前は中止が無難。'
  },
  {
    category: 'ステロイド',
    drug: '副腎皮質ステロイド（プレドニゾロンなど）',
    aliases: ['プレドニゾロン', 'プレドニン', 'メチルプレドニゾロン', 'メドロール', 'デキサメタゾン', 'デカドロン', 'ヒドロコルチゾン', 'コートリル'],
    stop: '休薬しない（急な中断は副腎不全の危険）',
    resume: '継続（周術期はストレスドーズ増量を検討）',
    note: '長期内服例では周術期ステロイドカバーを麻酔科と相談。'
  }
];

// Normalize a string for fuzzy matching: full-width → half-width,
// lowercase, hiragana → katakana, strip spaces and dose-like fragments.
export function normalizeDrugText(text) {
  let s = String(text);
  // String.prototype.normalize is missing in IE11; degrade gracefully
  // (full-width latin/digits then stay as-is, katakana matching still works).
  if (s.normalize) s = s.normalize('NFKC');
  s = s.toLowerCase();
  s = s.replace(/[ぁ-ゖ]/g, ch =>
    String.fromCharCode(ch.charCodeAt(0) + 0x60)
  );
  s = s.replace(/[0-9.]+\s*(mg|mcg|μg|ug|g|ml|単位|錠|包|cap|カプセル|テープ|貼|t)?/g, '');
  s = s.replace(/[\s\u3000・()（）「」-]/g, '');
  return s;
}

// Split free-form input into drug name tokens.
// Delimiters: newlines, commas, Japanese punctuation, slashes, bullet marks,
// and runs of 2+ spaces. A single space is NOT a delimiter so that names
// like "バイアスピリン 100mg" stay together.
export function splitDrugInput(text) {
  return String(text)
    .split(/[\n\r,、，;；。．/／·・]+|[ \t\u3000]{2,}/)
    .map(t => t.trim())
    .filter(t => t.length > 0);
}

// Find matching rules for one input token. Returns an array of rules.
export function matchDrug(token) {
  const norm = normalizeDrugText(token);
  if (norm.length < 2) return [];
  const hits = [];
  for (const rule of DRUG_HOLD_RULES) {
    let best = 0;
    for (const alias of rule.aliases) {
      const normAlias = normalizeDrugText(alias);
      if (normAlias.length < 2) continue;
      if (norm.includes(normAlias) || normAlias.includes(norm)) {
        best = Math.max(best, Math.min(normAlias.length, norm.length));
      }
    }
    if (best > 0) hits.push({ rule, score: best });
  }
  hits.sort((a, b) => b.score - a.score);
  return hits.map(h => h.rule);
}
