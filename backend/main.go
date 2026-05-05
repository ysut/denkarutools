package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
)

// 患者データの構造体定義
type Patient struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Age       int    `json:"age"`
	LastVisit string `json:"last_visit"`
}

func main() {
	mux := http.NewServeMux()

	// 患者リストを返すAPI
	mux.HandleFunc("/api/patients", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Content-Type", "application/json")

		// ファイル（NAS想定）を読み込む
		data, err := os.ReadFile("patients.json")
		if err != nil {
			http.Error(w, "Failed to read data", http.StatusInternalServerError)
			return
		}

		w.Write(data)
	})

	fmt.Println("🚀 Backend starting on :8080")
	http.ListenAndServe(":8080", mux)
}