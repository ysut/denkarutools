<template>
  <div class="sim-container">
    <h1>子宮筋腫 3D シミュレーション</h1>
    <p class="sub">中央の子宮・両側付属器のまわりに球・楕円球を配置し、ドラッグで回転して位置関係を確認します</p>

    <div class="sim-layout">
      <!-- Left: 3D canvas -->
      <div class="canvas-wrap">
        <canvas
          ref="canvas"
          class="sim-canvas"
          width="520"
          height="460"
          @mousedown="startDrag"
          @wheel.prevent="onWheel"
        ></canvas>
        <div class="canvas-hint">何もない所をドラッグ=回転 / 筋腫をドラッグ=移動 / ホイール=拡大縮小</div>
      </div>

      <!-- Right: control panel -->
      <div class="panel">
        <div class="panel-box search-box">
          <label><strong>患者IDでNASから読み込み：</strong></label>
          <div class="row">
            <input v-model="patientId" placeholder="例: P001" style="width: 120px;">
            <button @click="loadSim" class="btn-secondary">読み込み</button>
            <button @click="saveSim" class="btn-primary">保存</button>
          </div>
          <span v-if="loadStatus" class="status-text">{{ loadStatus }}</span>
        </div>

        <div class="panel-box">
          <div class="row">
            <label class="chk"><input type="checkbox" v-model="showAnatomy"> 解剖モデル表示</label>
            <label class="chk"><input type="checkbox" v-model="transparent"> 半透明</label>
            <label class="chk"><input type="checkbox" v-model="showLabels"> ラベル</label>
          </div>
          <div class="row zoom-row">
            <span class="mini-label">ズーム</span>
            <input type="range" min="1" max="6" step="0.1" v-model.number="scale">
            <button @click="resetView" class="btn-secondary small">視点リセット</button>
          </div>
        </div>

        <div class="panel-box">
          <div class="row">
            <span class="mini-label" style="margin-right: 8px;">子宮の向き</span>
            <select v-model.number="tiltDeg" class="orient-select">
              <option :value="0">中間位</option>
              <option :value="30">前傾（前屈）</option>
              <option :value="-30">後傾（後屈）</option>
            </select>
          </div>
          <div class="row zoom-row">
            <span class="mini-label">傾き {{ tiltDeg }}°</span>
            <input type="range" min="-60" max="60" step="5" v-model.number="tiltDeg">
          </div>
          <div class="hint-sphere">キャンバス左下の矢印が向き（頭側・尾側・腹側・背側）を示します。</div>
        </div>

        <div class="panel-box">
          <div class="row between">
            <strong>筋腫リスト（{{ shapes.length }}）</strong>
            <button @click="addFibroid" class="btn-success small">＋ 筋腫を追加</button>
          </div>

          <p v-if="shapes.length === 0" class="empty">まだ筋腫がありません。「＋ 筋腫を追加」で配置します。</p>

          <div v-for="(s, i) in shapes" :key="i" class="fibroid-card" :class="{ selected: selectedIndex === i }" @click="selectedIndex = i">
            <div class="row between">
              <input v-model="s.label" class="label-input" placeholder="ラベル">
              <select v-model="s.color" class="color-select" :style="{ background: s.color, color: '#fff' }">
                <option v-for="c in presetColors" :key="c.value" :value="c.value">{{ c.name }}</option>
              </select>
              <button @click="removeFibroid(i)" class="btn-danger small">削除</button>
            </div>

            <div class="ctrl-grid">
              <div class="ctrl" v-for="ax in axes" :key="'r' + ax.key">
                <span class="mini-label">径 {{ ax.name }}(mm)</span>
                <input type="range" min="2" max="80" step="1" v-model.number="s[ax.r]">
                <input type="number" min="2" max="80" v-model.number="s[ax.r]" class="num">
              </div>
              <div class="ctrl" v-for="ax in axes" :key="'p' + ax.key">
                <span class="mini-label">位置 {{ ax.name }}(mm)</span>
                <input type="range" min="-120" max="120" step="1" v-model.number="s[ax.c]">
                <input type="number" min="-120" max="120" v-model.number="s[ax.c]" class="num">
              </div>
            </div>
            <div class="hint-sphere">※ 径 X=Y=Z にすると球になります</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import {
  rotationMatrix, rotatePoint, rotatePointTranspose, silhouetteEllipse, IDENTITY
} from '../utils/ellipsoid3d.js';

// Fixed schematic anatomy: uterus body/cervix + bilateral ovaries/tubes.
// Axis-aligned ellipsoids in scene mm (x:right, y:up, z:toward viewer). frame
// 'uterus' shapes tilt with the ante/retroversion control about PIVOT; 'world'
// shapes stay fixed. Anatomical orientation is shown by the corner gizmo, not
// by markers on the model.
var PIVOT = [0, -12, 0]; // isthmus-ish pivot for uterine ante/retroversion
var ANATOMY = [
  { label: '子宮体部', frame: 'uterus', cx: 0, cy: 6, cz: 0, rx: 26, ry: 34, rz: 22, color: '#d98ba0', alpha: 0.9 },
  { label: '子宮頸部', frame: 'uterus', cx: 0, cy: -30, cz: 0, rx: 13, ry: 16, rz: 12, color: '#c9788e', alpha: 0.9 },
  { label: '左卵巣', frame: 'world', cx: -54, cy: 8, cz: 4, rx: 11, ry: 16, rz: 10, color: '#b48fd0', alpha: 0.95 },
  { label: '右卵巣', frame: 'world', cx: 54, cy: 8, cz: 4, rx: 11, ry: 16, rz: 10, color: '#b48fd0', alpha: 0.95 },
  { label: '左卵管', frame: 'world', cx: -30, cy: 24, cz: 2, rx: 26, ry: 2.4, rz: 2.4, color: '#e0a6b4', alpha: 0.85 },
  { label: '右卵管', frame: 'world', cx: 30, cy: 24, cz: 2, rx: 26, ry: 2.4, rz: 2.4, color: '#e0a6b4', alpha: 0.85 }
];

// --- IE11-safe color helpers (no CSS color funcs, just hex math) ---
function hexToRgb(h) {
  h = h.replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  var n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function rgbStr(r, g, b) {
  return 'rgb(' + Math.round(r) + ',' + Math.round(g) + ',' + Math.round(b) + ')';
}
function lighten(hex, t) {
  var c = hexToRgb(hex);
  return rgbStr(c.r + (255 - c.r) * t, c.g + (255 - c.g) * t, c.b + (255 - c.b) * t);
}
function darken(hex, t) {
  var c = hexToRgb(hex);
  return rgbStr(c.r * (1 - t), c.g * (1 - t), c.b * (1 - t));
}
function clamp(v, lo, hi) {
  return v < lo ? lo : (v > hi ? hi : v);
}

export default {
  data() {
    return {
      patientId: '',
      loadStatus: '',
      yaw: 0.6,
      pitch: -0.3,
      scale: 2.2,
      showAnatomy: true,
      transparent: true,
      showLabels: true,
      tiltDeg: 0,
      selectedIndex: -1,
      shapes: [],
      axes: [
        { key: 'x', name: 'X', r: 'rx', c: 'cx' },
        { key: 'y', name: 'Y', r: 'ry', c: 'cy' },
        { key: 'z', name: 'Z', r: 'rz', c: 'cz' }
      ],
      presetColors: [
        { name: '青', value: '#2f80c0' },
        { name: '緑', value: '#2e9e6b' },
        { name: '橙', value: '#e08a2e' },
        { name: '赤', value: '#cc4b4b' },
        { name: '紫', value: '#8e5fb0' },
        { name: '黄', value: '#c9a227' }
      ]
    };
  },
  watch: {
    shapes: { handler: 'scheduleDraw', deep: true },
    yaw: 'scheduleDraw',
    pitch: 'scheduleDraw',
    scale: 'scheduleDraw',
    showAnatomy: 'scheduleDraw',
    transparent: 'scheduleDraw',
    showLabels: 'scheduleDraw',
    tiltDeg: 'scheduleDraw',
    selectedIndex: 'scheduleDraw'
  },
  mounted() {
    this.ctx = this.$refs.canvas.getContext('2d');
    // Drag is tracked on the document so the rotation keeps following the
    // cursor even when it leaves the canvas. PointerEvents are unavailable on
    // IE11, so we use mouse events.
    this._onMove = this.onMove.bind(this);
    this._onUp = this.onUp.bind(this);
    document.addEventListener('mousemove', this._onMove);
    document.addEventListener('mouseup', this._onUp);
    this.draw();
  },
  beforeDestroy() {
    document.removeEventListener('mousemove', this._onMove);
    document.removeEventListener('mouseup', this._onUp);
    if (this._raf) cancelAnimationFrame(this._raf);
  },
  methods: {
    tiltMatrix() {
      var t = this.tiltDeg * Math.PI / 180;
      var c = Math.cos(t), s = Math.sin(t);
      // Rotation about the X axis: tilts the fundus toward anterior (+z) / posterior (-z).
      return [1, 0, 0, 0, c, -s, 0, s, c];
    },
    // resolveShape returns the world-space center and local orientation for a
    // shape, applying the uterine tilt to 'uterus'-frame anatomy.
    resolveShape(shape, frame) {
      if (frame === 'uterus') {
        var tilt = this.tiltMatrix();
        var d = [shape.cx - PIVOT[0], shape.cy - PIVOT[1], shape.cz - PIVOT[2]];
        var rd = rotatePoint(tilt, d);
        return { center: [PIVOT[0] + rd[0], PIVOT[1] + rd[1], PIVOT[2] + rd[2]], orient: tilt };
      }
      return { center: [shape.cx, shape.cy, shape.cz], orient: IDENTITY };
    },
    // hitTestFibroid returns the index of the topmost fibroid under a canvas
    // point (px,py), or -1. Anatomy is not selectable.
    hitTestFibroid(px, py) {
      var cw = this.$refs.canvas.width, ch = this.$refs.canvas.height;
      var scale = this.scale;
      var R = rotationMatrix(this.yaw, this.pitch);
      var best = -1, bestZ = -Infinity;
      for (var i = 0; i < this.shapes.length; i++) {
        var s = this.shapes[i];
        if (!s.rx || !s.ry || !s.rz) continue;
        var e = silhouetteEllipse(R, IDENTITY, [s.cx, s.cy, s.cz], [s.rx, s.ry, s.rz]);
        var sx = cw / 2 + e.x * scale, sy = ch / 2 - e.y * scale;
        var A = e.semiMajor * scale, B = e.semiMinor * scale;
        var dx = px - sx, dy = py - sy;
        var ca = Math.cos(e.angle), sa = Math.sin(e.angle);
        var lx = (ca * dx - sa * dy) / A, ly = (sa * dx + ca * dy) / B;
        if (lx * lx + ly * ly <= 1 && e.depthZ > bestZ) {
          bestZ = e.depthZ;
          best = i;
        }
      }
      return best;
    },
    startDrag(e) {
      var rect = this.$refs.canvas.getBoundingClientRect();
      var hit = this.hitTestFibroid(e.clientX - rect.left, e.clientY - rect.top);
      if (hit >= 0) {
        // Grab the fibroid: drag moves it parallel to the view plane.
        this.selectedIndex = hit;
        var s = this.shapes[hit];
        var R = rotationMatrix(this.yaw, this.pitch);
        var rc = rotatePoint(R, [s.cx, s.cy, s.cz]);
        this._moveSel = { shape: s, startX: e.clientX, startY: e.clientY, X0: rc[0], Y0: rc[1], Z0: rc[2] };
      } else {
        this._drag = { x: e.clientX, y: e.clientY, yaw: this.yaw, pitch: this.pitch };
      }
    },
    onMove(e) {
      if (this._moveSel) {
        // Keep depth (Z) fixed; map the screen delta back to world via R^T.
        var R = rotationMatrix(this.yaw, this.pitch);
        var newX = this._moveSel.X0 + (e.clientX - this._moveSel.startX) / this.scale;
        var newY = this._moveSel.Y0 - (e.clientY - this._moveSel.startY) / this.scale;
        var world = rotatePointTranspose(R, [newX, newY, this._moveSel.Z0]);
        var s = this._moveSel.shape;
        s.cx = Math.round(world[0]);
        s.cy = Math.round(world[1]);
        s.cz = Math.round(world[2]);
        return;
      }
      if (!this._drag) return;
      var dx = e.clientX - this._drag.x;
      var dy = e.clientY - this._drag.y;
      this.yaw = this._drag.yaw + dx * 0.01;
      this.pitch = clamp(this._drag.pitch + dy * 0.01, -1.4, 1.4);
    },
    onUp() {
      this._drag = null;
      this._moveSel = null;
    },
    onWheel(e) {
      var f = e.deltaY < 0 ? 1.1 : 0.9;
      this.scale = clamp(this.scale * f, 1, 6);
    },
    resetView() {
      this.yaw = 0.6;
      this.pitch = -0.3;
      this.scale = 2.2;
    },
    addFibroid() {
      this.shapes.push({
        label: '筋腫' + (this.shapes.length + 1),
        cx: 0, cy: 46, cz: 0,
        rx: 15, ry: 15, rz: 15,
        color: '#2f80c0'
      });
      this.selectedIndex = this.shapes.length - 1;
    },
    removeFibroid(i) {
      this.shapes.splice(i, 1);
      this.selectedIndex = -1;
    },
    scheduleDraw() {
      var self = this;
      if (this._raf) return;
      this._raf = requestAnimationFrame(function () {
        self._raf = null;
        self.draw();
      });
    },
    draw() {
      var ctx = this.ctx;
      if (!ctx) return;
      var cw = this.$refs.canvas.width;
      var ch = this.$refs.canvas.height;
      var scale = this.scale;

      // Background
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cw, ch);
      ctx.fillStyle = '#f4f8f7';
      ctx.fillRect(0, 0, cw, ch);

      var R = rotationMatrix(this.yaw, this.pitch);

      // Combine read-only anatomy with the user's fibroids, project each, then
      // depth-sort far->near (painter's algorithm) so nearer shapes draw on top.
      var items = [];
      if (this.showAnatomy) {
        for (var a = 0; a < ANATOMY.length; a++) {
          items.push({ shape: ANATOMY[a], frame: ANATOMY[a].frame, index: -1 });
        }
      }
      for (var f = 0; f < this.shapes.length; f++) {
        items.push({ shape: this.shapes[f], frame: 'world', index: f });
      }

      var projected = [];
      for (var i = 0; i < items.length; i++) {
        var s = items[i].shape;
        if (!s.rx || !s.ry || !s.rz) continue; // skip degenerate / partly-typed input
        var rs = this.resolveShape(s, items[i].frame);
        var e = silhouetteEllipse(R, rs.orient, rs.center, [s.rx, s.ry, s.rz]);
        e.shape = s;
        e.selected = items[i].index >= 0 && items[i].index === this.selectedIndex;
        projected.push(e);
      }
      projected.sort(function (p, q) { return p.depthZ - q.depthZ; });

      for (var k = 0; k < projected.length; k++) {
        this.drawShape(ctx, projected[k], cw, ch, scale);
      }

      this.drawGizmo(ctx, R, ch);
    },
    // drawGizmo renders a small orientation indicator in the lower-left corner:
    // arrows for 頭側/尾側 (cranial/caudal, ±y) and 腹側/背側 (ventral/dorsal,
    // ±z). It uses the same scene rotation R so it tracks the view.
    drawGizmo(ctx, R, ch) {
      var ox = 56, oy = ch - 50, len = 26;
      var dirs = [
        { v: [0, 1, 0], label: '頭側', color: '#c0392b' },
        { v: [0, -1, 0], label: '尾側', color: '#c0392b' },
        { v: [0, 0, 1], label: '腹側', color: '#2e7d32' },
        { v: [0, 0, -1], label: '背側', color: '#2e7d32' }
      ];
      for (var i = 0; i < dirs.length; i++) {
        dirs[i].r = rotatePoint(R, dirs[i].v);
      }
      // Draw arrows pointing away first so nearer ones sit on top.
      dirs.sort(function (a, b) { return a.r[2] - b.r[2]; });

      ctx.save();
      // Faint backing disc for legibility over the model.
      ctx.beginPath();
      ctx.arc(ox, oy, len + 16, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fill();
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (var j = 0; j < dirs.length; j++) {
        var d = dirs[j];
        var tx = ox + d.r[0] * len;
        var ty = oy - d.r[1] * len; // screen y is down
        // Fade arrows that point away from the viewer.
        ctx.globalAlpha = 0.45 + 0.55 * ((d.r[2] + 1) / 2);
        ctx.strokeStyle = d.color;
        ctx.fillStyle = d.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        // Arrowhead
        var ang = Math.atan2(ty - oy, tx - ox);
        var hl = 6;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx - hl * Math.cos(ang - 0.4), ty - hl * Math.sin(ang - 0.4));
        ctx.lineTo(tx - hl * Math.cos(ang + 0.4), ty - hl * Math.sin(ang + 0.4));
        ctx.closePath();
        ctx.fill();
        // Label just beyond the tip
        ctx.fillText(d.label, ox + d.r[0] * (len + 13), oy - d.r[1] * (len + 13));
      }
      ctx.restore();
    },
    drawShape(ctx, e, cw, ch, scale) {
      var s = e.shape;
      var px = cw / 2 + e.x * scale;
      var py = ch / 2 - e.y * scale; // screen y points down
      var A = e.semiMajor * scale;
      var B = e.semiMinor * scale;
      var alpha = (s.alpha != null) ? s.alpha : (this.transparent ? 0.58 : 0.95);

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(-e.angle); // scene y is up, device y is down -> negate
      ctx.scale(A, B);      // map the unit circle to the projected ellipse

      // Radial shading: highlight from the upper-left for a 3D look.
      var grad = ctx.createRadialGradient(-0.35, -0.35, 0.05, 0, 0, 1);
      grad.addColorStop(0, lighten(s.color, 0.5));
      grad.addColorStop(0.55, s.color);
      grad.addColorStop(1, darken(s.color, 0.28));

      ctx.beginPath();
      ctx.arc(0, 0, 1, 0, Math.PI * 2);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.globalAlpha = 1;
      var avg = (A + B) / 2 || 1;
      ctx.lineWidth = 1 / avg; // ~1px outline in device space
      ctx.strokeStyle = darken(s.color, 0.35);
      ctx.stroke();
      if (e.selected) {
        // Bright ring marks the currently grabbed fibroid.
        ctx.lineWidth = 2.5 / avg;
        ctx.strokeStyle = '#ff7a00';
        ctx.stroke();
      }
      ctx.restore();

      if (this.showLabels) {
        ctx.save();
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#2c3e50';
        ctx.fillText(s.label, px, py - B - 3);
        ctx.restore();
      }
    },
    loadSim() {
      if (!this.patientId) {
        alert('読み込む患者IDを入力してください。');
        return;
      }
      this.loadStatus = '読み込み中...';
      var self = this;
      fetch('/api/fibroid-sim?id=' + encodeURIComponent(this.patientId))
        .then(function (res) {
          if (!res.ok) throw new Error('データなし');
          return res.json();
        })
        .then(function (data) {
          self.shapes = (data && data.shapes) ? data.shapes : [];
          self.loadStatus = '読み込み成功';
          self.scheduleDraw();
        })
        .catch(function () {
          self.shapes = [];
          self.loadStatus = 'データなし（新規作成）';
          self.scheduleDraw();
        });
    },
    saveSim() {
      if (!this.patientId) {
        alert('保存には患者IDが必須です。');
        return;
      }
      fetch('/api/fibroid-sim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: this.patientId, shapes: this.shapes })
      })
        .then(function (res) {
          alert(res.ok ? 'NASに保存しました。' : '保存に失敗しました。');
        })
        .catch(function (err) {
          alert('通信エラー: ' + err);
        });
    }
  }
};
</script>

<style scoped>
.sim-container { max-width: 1100px; margin: auto; padding: 20px; text-align: left; }
h1 { color: #00493c; }
.sub { color: #666; margin-bottom: 16px; }
/* flex (not grid) for IE11 compatibility */
.sim-layout { display: flex; flex-wrap: wrap; align-items: flex-start; }
.canvas-wrap { margin: 0 20px 16px 0; }
.sim-canvas {
  width: 520px;
  height: 460px;
  border: 1px solid #cfe0da;
  border-radius: 10px;
  background: #f4f8f7;
  cursor: move;
  display: block;
  -ms-touch-action: none;
  touch-action: none;
}
.canvas-hint { color: #888; font-size: 0.8em; margin-top: 6px; text-align: center; width: 520px; }
.panel { flex: 1 1 360px; min-width: 320px; }
.panel-box { background: #f0f2f5; border-radius: 8px; padding: 12px; margin-bottom: 12px; }
.search-box { background: #e6f7ff; border: 1px solid #91d5ff; }
.row { display: flex; flex-wrap: wrap; align-items: center; margin-top: 6px; }
.row.between { justify-content: space-between; }
.row > * { margin-right: 8px; }
.zoom-row input[type="range"] { flex: 1 1 auto; }
.chk { font-size: 0.9em; color: #444; margin-right: 14px; }
.status-text { font-size: 0.9em; color: #1890ff; font-weight: bold; }
.mini-label { font-size: 0.78em; color: #555; }
.empty { color: #999; font-size: 0.9em; margin: 8px 0 0; }
.fibroid-card { background: #fff; border: 1px solid #e0e6e4; border-radius: 6px; padding: 8px; margin-top: 8px; cursor: pointer; }
.fibroid-card.selected { border-color: #ff7a00; box-shadow: 0 0 0 2px rgba(255, 122, 0, 0.25); }
.orient-select { padding: 5px; border: 1px solid #d9d9d9; border-radius: 4px; }
.label-input { width: 90px; padding: 4px; border: 1px solid #d9d9d9; border-radius: 4px; }
.color-select { padding: 4px; border: none; border-radius: 4px; font-weight: bold; }
/* axis controls: 3 per row via flex widths for IE11 (no grid) */
.ctrl-grid { display: flex; flex-wrap: wrap; margin: 6px -4px 0; }
.ctrl { box-sizing: border-box; width: 33.33%; padding: 0 4px; margin-bottom: 6px; }
.ctrl span { display: block; }
.ctrl input[type="range"] { width: 100%; }
.ctrl .num { width: 100%; box-sizing: border-box; padding: 3px; border: 1px solid #d9d9d9; border-radius: 4px; margin-top: 2px; }
.hint-sphere { color: #999; font-size: 0.75em; margin-top: 4px; }
button { padding: 8px 14px; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; }
button.small { padding: 5px 10px; font-size: 0.85em; }
.btn-primary { background: #00715d; color: #fff; }
.btn-secondary { background: #00493c; color: #fff; }
.btn-success { background: #52c41a; color: #fff; }
.btn-danger { background: #cc4b4b; color: #fff; }
button:hover { opacity: 0.85; }
input, select { font-size: 0.95em; }
</style>
