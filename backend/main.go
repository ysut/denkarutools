package main

import (
	"encoding/json" // 復活！
	"fmt"
	"net/http"
	"os"
)

type Patient struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Age       int    `json:"age"`
	LastVisit string `json:"last_visit"`
}

func main() {
	mux := http.NewServeMux()

	mux.HandleFunc("/api/patients", func(w http.ResponseWriter, r *http.Request) {
		// CORS許可設定（POSTやContent-Typeも許可するように拡張）
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		// プリフライトリクエスト（OPTIONS）への対応
		if r.Method == http.MethodOptions {
			return
		}

		if r.Method == http.MethodPost {
			// --- 保存処理 (WRITE) ---
			var newPatient Patient
			if err := json.NewDecoder(r.Body).Decode(&newPatient); err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}

			// 既存のデータを読み込む
			data, _ := os.ReadFile("patients.json")
			var patients []Patient
			json.Unmarshal(data, &patients)

			// 新しいデータを追加
			patients = append(patients, newPatient)

			// ファイルに保存
			updatedData, _ := json.MarshalIndent(patients, "", "  ")
			os.WriteFile("patients.json", updatedData, 0644)

			w.WriteHeader(http.StatusCreated)
			return
		}

		// --- 読み込み処理 (READ) ---
		data, err := os.ReadFile("patients.json")
		if err != nil {
			http.Error(w, "Failed to read data", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write(data)
	})

	fmt.Println("🚀 Backend starting on :8080")
	http.ListenAndServe(":8080", mux)
}