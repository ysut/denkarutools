#!/bin/bash
set -e

if [ ! -f "package.json" ]; then
  echo "Initializing Vue.js 2 project..."
  echo y | npx -y -p @vue/cli vue create . --default --preset 'Default (Vue 2)'
fi

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

echo "✨ Starting Vue.js server..."
exec npm run serve -- --host 0.0.0.0 --port 8080