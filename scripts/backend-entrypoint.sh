#!/bin/bash
set -e

mkdir -p backend

if [ ! -f "backend/main.go" ]; then
  echo "Creating default main.go..."
  cat <<EOF > backend/main.go
package main
import (
	"fmt"
	"net/http"
)
func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		fmt.Fprint(w, \`{"status":"ok", "version":"1.24"}\`)
	})
	fmt.Println("Backend starting on :8080")
	http.ListenAndServe(":8080", mux)
}
EOF
fi

if [ ! -f "go.mod" ]; then
  go mod init denkarutools
fi

go mod tidy
echo "✨ Starting Go backend..."
exec go run backend/main.go