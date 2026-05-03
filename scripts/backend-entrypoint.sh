#!/bin/bash
set -e

mkdir -p backend

# 1. main.goの自動生成
if [ ! -f "backend/main.go" ]; then
  echo "📄 Creating main.go for modern Go..."
  cat <<EOF > backend/main.go
package main

import (
	"fmt"
	"net/http"
)

func main() {
	// 最新のGo標準ルーターを使用
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprint(w, \`{"status":"ok", "version":"1.24+"}\`)
	})

	fmt.Println("🚀 denkarutools backend (Go 1.24+) starting on :8080")
	http.ListenAndServe(":8080", mux)
}
EOF
fi

# 2. go.modの初期化と整理
if [ ! -f "go.mod" ]; then
  echo "🚀 Initializing Go module..."
  go mod init denkarutools
fi
# 依存関係を最新に整理
go mod tidy

# 3. 実行
echo "✨ Starting Go backend..."
exec go run backend/main.go