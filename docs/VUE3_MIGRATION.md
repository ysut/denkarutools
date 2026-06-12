# Vue 3 + Vite 移行手順書

Edge入り端末への刷新が完了したら、この手順で Vue 2（EOL済み）から Vue 3 + Vite へ移行する。
作業時間の目安: 半日（検証込み）。

## 前提条件（着手前に必ず確認）

- [ ] **全端末がEdgeに刷新済みであること**。IE11端末が1台でも残っていれば着手しない
      （Vue 3 / Vite は IE11 で一切動作しない）。
- [ ] 現行リリース（Vue 2版バイナリ）のバックアップを保管しておく。

## 1. 依存関係の入れ替え

`frontend/` で実施:

```bash
npm remove @vue/cli-service @vue/cli-plugin-babel @vue/cli-plugin-eslint \
  vue-template-compiler @babel/core @babel/eslint-parser whatwg-fetch core-js
npm install vue@^3
npm install -D vite @vitejs/plugin-vue eslint eslint-plugin-vue
```

`package.json` の変更:

- `scripts` を以下に変更（`--no-module` はVite では不要・廃止）:
  ```json
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint src --ext .js,.vue"
  }
  ```
- `eslintConfig.extends` の `plugin:vue/essential` → `plugin:vue/vue3-essential`
- `browserslist` ブロックは削除（`ie 11` 指定ごと不要になる）
- `babel.config.js` は削除

## 2. 設定ファイルの置き換え

- `frontend/vue.config.js` を削除し、`frontend/vite.config.js` を新規作成:

  ```js
  import { defineConfig } from 'vite'
  import vue from '@vitejs/plugin-vue'

  export default defineConfig({
    plugins: [vue()],
    server: {
      port: 8080,
      proxy: {
        '/api': { target: 'http://localhost:8080' } // backend は別ポートにするか dev 時のみ 8081 等に変更
      }
    }
  })
  ```

  ※ dev サーバーとbackendが同じ8080を取り合わないよう、dev時はViteを8081にする
  （`server.port: 8081`、compose.yaml のポートマッピングはそのままでOK）。

- `frontend/public/index.html` → `frontend/index.html` へ移動し、内容を修正:
  - `<%= BASE_URL %>` → `/`、`<%= htmlWebpackPlugin.options.title %>` → `denkarutools` に直書き
  - `<body>` 末尾に `<script type="module" src="/src/main.js"></script>` を追加
  - `<meta http-equiv="X-UA-Compatible">` は削除してよい

## 3. ソースコードの修正（差分は小さい）

- `src/main.js`:
  ```js
  import { createApp } from 'vue'
  import App from './App.vue'

  createApp(App).mount('#app')
  ```
  （`import 'whatwg-fetch'` と `Vue.config.productionTip` を削除）

- `src/components/TopMenu.vue` と `src/components/ChemoSchedule.vue` など
  `$emit` を使うコンポーネント: `emits: ['changeView']` を export default に追加（警告対策）。

- `src/components/DrugHoldChecker.vue`: `<template v-for>` の `:key` は Vue 3 では
  `<template>` 側に付けるのが正式。v-if 分岐があるため現状のままでも動くが、
  警告が出たら `<template v-for="(res, i) in results" :key="i">` に移す。

- `src/utils/clipboard.js`: そのまま残す。`http://localhost` は secure context 扱い
  なので Edge では `navigator.clipboard` が標準経路になり、フォールバックは保険になる。

- それ以外の Options API コード（data / computed / methods / mounted）は無変更で動く。

## 4. Docker・ビルド基盤の更新

- `compose.yaml`: frontend の `image: node:16-slim` → `node:22-slim`（Vite は Node 18+ 必須）
- `scripts/frontend-entrypoint.sh`: 最終行を
  `exec npm run dev -- --host 0.0.0.0 --port 8080` に変更
- `scripts/build-release.sh`: `node:16-slim` → `node:22-slim` に変更。
  それ以外（dist → `backend/static` コピー → go:embed → クロスコンパイル）は変更不要。
  Vite の出力先はデフォルトで `dist/` なのでスクリプトはそのまま動く。

## 5. 任意のクリーンアップ（動作に必須ではない・別作業でよい）

IE11制約のために入れた回避策は、Edge移行後は戻してよい:

- CSS変数（`--jsgo-*`）の復活（現在は実値カラーを直書き。`App.vue` のコメントにパレットあり）
- flex `gap` / CSS grid の利用再開（現在は margin / flex で代替）
- `drugHoldRules.js` の `String.prototype.normalize` ガード除去
- `ChemoSchedule.vue` の開始日テキスト形式バリデーション（Edgeではカレンダー選択になるため簡略化可）

残置推奨:
- バックエンドの `Cache-Control: no-store`（害がなく、データの鮮度保証になる）
- `clipboard.js` フォールバック

## 6. 検証手順

1. `docker compose up` → 5画面すべての表示・API疎通を確認
   （患者呼び出し・レジメン読込・スケジュール編集・保存・休薬チェック・印刷プレビュー）
2. `cd frontend && npm run lint && npm run build`
3. `sh scripts/build-release.sh` → 生成された `release/denkarutools.exe` を実行し、
   `http://localhost:8080` で同梱UIとカレンダー入力（`<input type="date">`）を確認
4. Edge実機でスケジュール用紙の印刷確認
