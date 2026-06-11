<template>
  <div class="calc-container">
    <h1>化学療法計算機</h1>

    <div class="section">
      <label><strong>性別</strong></label><br>
      <input type="radio" v-model="inputs.sex" value="female"> 女性
      <input type="radio" v-model="inputs.sex" value="male"> 男性
      <input type="radio" v-model="inputs.sex" value="other"> その他
    </div>

    <div class="input-grid">
      <div class="field"><label>年齢 (歳)</label><input type="number" v-model.number="inputs.age"></div>
      <div class="field"><label>身長 (cm)</label><input type="number" v-model.number="inputs.height"></div>
      <div class="field"><label>体重 (kg)</label><input type="number" v-model.number="inputs.weight"></div>
      <div class="field"><label>BMI</label><div class="static-val">{{ bmi.toFixed(1) }}</div></div>
    </div>

    <div class="section main-mode">
      <label><strong>計算するもの</strong></label><br>
      <select v-model="inputs.mode">
        <option value="carboplatin">カルボプラチン</option>
        <option value="bsa_drug">体表面積から算出する薬剤</option>
      </select>
    </div>

    <div v-if="inputs.mode === 'carboplatin'" class="sub-pane">
      <h3>カルボプラチン（Calvert式）設定</h3>
      <div class="row">
        <label>目標AUC：</label>
        <input type="number" v-model.number="inputs.auc" step="0.5"> mg/mL × min
      </div>
      <div class="row">
        <label>GFR算出方法：</label>
        <select v-model="inputs.gfrMethod">
          <option value="cg">Cockcroft-Gault式で推算</option>
          <option value="real">24時間蓄尿クレアチニンクリアランス</option>
        </select>
      </div>

      <div v-if="inputs.gfrMethod === 'cg'" class="detail-pane">
        <div class="row">
          <label>血清Cr：</label>
          <input type="number" step="0.01" v-model.number="inputs.scr"> mg/dL
        </div>
        <div class="row">
          <label>血清Crの補正方法：</label>
          <select v-model="inputs.scrAdj">
            <option value="nci">NCI-GOG/NCCN基準</option>
            <option value="ando">Ando式</option>
            <option value="none">補正しない</option>
          </select>
        </div>
        <div class="row">
          <label>標準体重(IBW)の計算式：</label>
          <select v-model="inputs.ibwFormula">
            <option value="devine">Devine式</option>
            <option value="hamwi">Hamwi式</option>
            <option value="robinson">Robinson式</option>
            <option value="miller">Miller式</option>
          </select>
        </div>
        <div class="row">
          <label>体重補正の適用：</label>
          <select v-model="inputs.weightAdj">
            <option value="ibw">常に標準体重を用いる</option>
            <option value="actual">常に実体重を用いる</option>
            <option value="bmi_based">設定したBMI以上で補正体重(AdjBW)を用いる</option>
          </select>
        </div>
        <div class="row" v-if="inputs.weightAdj === 'bmi_based'">
          <label style="margin-left: 20px; color: #555;">└ 補正を適用するBMI基準値：</label>
          <input type="number" v-model.number="inputs.weightAdjBmiLimit" style="width: 70px;"> 以上
        </div>
      </div>

      <div v-if="inputs.gfrMethod === 'real'" class="detail-pane">
        <label>実測Ccr値：</label>
        <input type="number" v-model.number="inputs.realCcr"> ml/min
      </div>
    </div>

    <div v-if="inputs.mode === 'bsa_drug'" class="sub-pane">
      <h3>体表面積（BSA）計算設定</h3>
      <div class="row">
        <label>BSA算出式：</label>
        <input type="radio" v-model="inputs.bsaMethod" value="fujimoto"> 藤本式
        <input type="radio" v-model="inputs.bsaMethod" value="dubois"> Du Bois式
      </div>
      <div class="row">
        <label>設定用量：</label>
        <input type="number" v-model.number="inputs.dosePerBsa"> mg/m²
      </div>
    </div>

    <div class="result-area">
      <h2>計算結果</h2>
      <div class="res-grid">
        <div class="res-item">BMI: <strong>{{ bmi.toFixed(1) }}</strong></div>
        <div class="res-item">採用体重: <strong>{{ results.usedWeight.toFixed(1) }} kg</strong> ({{ results.weightLabel }})</div>
        
        <div v-if="inputs.mode === 'carboplatin'">
          <div class="res-item">推算GFR(Ccr): <strong>{{ results.gfr.toFixed(1) }}</strong> ml/min</div>
          <div class="res-item dose-box">
            投与量: <span class="highlight">{{ results.dose.toFixed(0) }}</span> mg
            <span class="muted-text">(105%: {{ results.dose105.toFixed(0) }} mg)</span>
          </div>
        </div>
        <div v-else>
          <div class="res-item">体表面積(BSA): <strong>{{ results.bsa.toFixed(3) }}</strong> m²</div>
          <div class="res-item dose-box">投与量: <span class="highlight">{{ results.dose.toFixed(0) }}</span> mg</div>
        </div>
      </div>
      <button class="copy-btn" @click="copyResults">結果をクリップボードにコピー</button>
    </div>
  </div>
</template>

<script>
import { copyText } from '../utils/clipboard.js';

export default {
  name: 'ChemoCalc',
  data() {
    return {
      inputs: {
        sex: 'female', age: 60, height: 160, weight: 60,
        mode: 'carboplatin', gfrMethod: 'cg', scr: 0.8,
        scrAdj: 'nci', ibwFormula: 'devine', weightAdj: 'bmi_based',
        weightAdjBmiLimit: 25, // ★デフォルト値を25に設定
        realCcr: 0, auc: 5, bsaMethod: 'fujimoto', dosePerBsa: 0
      }
    }
  },
  computed: {
    bmi() {
      const hm = this.inputs.height / 100;
      return hm > 0 ? this.inputs.weight / (hm * hm) : 0;
    },
    ibw() {
      const { height, sex, ibwFormula } = this.inputs;
      const isMale = sex === 'male';
      const h_in = height / 2.54;
      const h_diff = Math.max(0, h_in - 60);
      if (ibwFormula === 'devine') return isMale ? 50.0 + 2.3 * h_diff : 45.5 + 2.3 * h_diff;
      if (ibwFormula === 'hamwi') return isMale ? 48.0 + 2.7 * h_diff : 45.5 + 2.2 * h_diff;
      if (ibwFormula === 'robinson') return isMale ? 52.0 + 1.9 * h_diff : 49.0 + 1.7 * h_diff;
      return isMale ? 56.2 + 1.41 * h_diff : 53.1 + 1.36 * h_diff; // miller
    },
    usedWeight() {
      const { weight, weightAdj, weightAdjBmiLimit } = this.inputs;
      if (weightAdj === 'ibw') return { val: this.ibw, label: 'IBW' };
      
      // ★ 固定値の25から、可変の weightAdjBmiLimit に変更
      if (weightAdj === 'bmi_based' && this.bmi > weightAdjBmiLimit) {
        return { val: this.ibw + 0.4 * (weight - this.ibw), label: `AdjBW (BMI>${weightAdjBmiLimit})` };
      }
      return { val: weight, label: 'Actual' };
    },
    bsa() {
      const { weight, height, bsaMethod } = this.inputs;
      if (weight <= 0 || height <= 0) return 0;
      if (bsaMethod === 'fujimoto') return 0.008883 * Math.pow(weight, 0.444) * Math.pow(height, 0.663);
      return 0.007184 * Math.pow(weight, 0.425) * Math.pow(height, 0.725);
    },
    gfr() {
      const { gfrMethod, scr, scrAdj, age, sex, realCcr } = this.inputs;
      if (gfrMethod === 'real') return realCcr;
      if (!scr || scr <= 0) return 0;
      let sCr_used = scr;
      if (scrAdj === 'nci') sCr_used = Math.max(scr, 0.7);
      if (scrAdj === 'ando') sCr_used = Math.max(scr + 0.2, 0.6);
      let val = ((140 - age) * this.usedWeight.val) / (72 * sCr_used);
      if (sex !== 'male') val *= 0.85;
      if (scrAdj === 'nci' && val > 125) val = 125;
      return val;
    },
    results() {
      const { mode, auc, dosePerBsa, scrAdj } = this.inputs;
      let calvertConstant = 25;
      if (scrAdj === 'ando' && this.gfr >= 15 && this.gfr <= 25) calvertConstant = 15;
      const dose = mode === 'carboplatin' ? auc * (this.gfr + calvertConstant) : this.bsa * dosePerBsa;
      return {
        dose, dose105: dose * 1.05, gfr: this.gfr, bsa: this.bsa,
        usedWeight: this.usedWeight.val, weightLabel: this.usedWeight.label, calvertConstant
      };
    }
  },
  methods: {
    copyResults() {
      const res = this.results;
      const summary = `【化学療法計算結果】
性別: ${this.inputs.sex === 'male' ? '男性' : '女性/その他'}
BMI: ${this.bmi.toFixed(1)}
採用体重: ${res.usedWeight.toFixed(1)}kg (${res.weightLabel})
${this.inputs.mode === 'carboplatin' ? `推算GFR: ${res.gfr.toFixed(1)} ml/min (定数:${res.calvertConstant})\n投与量: ${res.dose.toFixed(0)} mg` : `体表面積: ${res.bsa.toFixed(3)} m²\n投与量: ${res.dose.toFixed(0)} mg`}
(105%参考: ${res.dose105.toFixed(0)} mg)`;
      copyText(summary)
        .then(() => alert("コピーしました"))
        .catch(() => alert("クリップボードへのコピーに失敗しました。"));
    }
  }
}
</script>

<style scoped>
.calc-container { max-width: 800px; margin: auto; padding: 20px; text-align: left; background: #fff; }
.section { margin-bottom: 20px; padding: 15px; background: #f0f2f5; border-radius: 8px; }
.sub-pane { border: 2px solid #e8e8e8; padding: 20px; margin-top: 15px; border-radius: 8px; }
.detail-pane { background: #fffbe6; padding: 15px; margin-top: 15px; border-left: 5px solid #ffe58f; }
/* flex (not grid) for IE11 compatibility */
.input-grid { display: flex; flex-wrap: wrap; margin: 15px -5px; }
.field { display: flex; flex-direction: column; font-size: 0.85em; width: calc(25% - 10px); min-width: 110px; margin: 5px; box-sizing: border-box; }
.static-val { padding: 8px; background: #eee; border-radius: 4px; font-weight: bold; margin-top: 5px; }
.result-area { margin-top: 40px; padding: 20px; background: #f6ffed; border: 1px solid #b7eb8f; border-radius: 12px; }
.highlight { color: #cf1322; font-size: 1.8em; font-weight: bold; }
.muted-text { font-size: 0.8em; color: #666; margin-left: 8px; }
.copy-btn { margin-top: 20px; width: 100%; padding: 12px; background: #00715d; color: white; border: none; border-radius: 6px; cursor: pointer; }
input, select { padding: 5px; border: 1px solid #d9d9d9; border-radius: 4px; }
</style>