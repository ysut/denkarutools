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
		fmt.Fprint(w, `{"status":"ok", "version":"1.24+"}`)
	})

	fmt.Println("🚀 denkarutools backend (Go 1.24+) starting on :8080")
	http.ListenAndServe(":8080", mux)
}
