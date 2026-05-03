#!/bin/bash
set -e

# frontendディレクトリが空、またはpackage.jsonがない場合に初期化
if [ ! -f "package.json" ]; then
  echo "Initializing Vue.js 2 project..."
  # --default で Vue 2 を強制、--skip-get-started で不要な出力を抑制
  npx -y -p @vue/cli vue create . --default --preset 'Default ([Vue 2] babel, eslint)'
fi

# 依存関係のインストール（node_modulesがない場合）
if [ ! -d "node_modules" ]; then
  npm install
fi

echo "Starting Vue.js development server..."
exec npm run serve