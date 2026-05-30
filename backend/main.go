package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
)

// 共通の患者管理データ用構造体
type Patient struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Age       int    `json:"age"`
	LastVisit string `json:"last_visit"`
}

func main() {
	mux := http.NewServeMux()

	// 1. 共通の患者管理API
	mux.HandleFunc("/api/patients", func(w http.ResponseWriter, r *http.Request) {
		// CORSポリシーの共通設定
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		// プリフライトリクエスト（OPTIONS）は内容を返さずに終了
		if r.Method == http.MethodOptions {
			return
		}

		handlePatients(w, r)
	})

	// 2. 術前サマリーAPI（ルーティング登録）
	mux.HandleFunc("/api/preop-summary", func(w http.ResponseWriter, r *http.Request) {
		// CORSポリシーの共通設定
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == http.MethodOptions {
			return
		}

		// preop.go で定義したハンドラへ処理を流す
		handlePreopSummary(w, r)
	})

	fmt.Println("🚀 Backend starting on :8080")
	if err := http.ListenAndServe(":8080", mux); err != nil {
		fmt.Printf("Server failed to start: %v\n", err)
	}
}

// 患者管理APIのコアロジック
func handlePatients(w http.ResponseWriter, r *http.Request) {
	// --- POST: データの保存 ---
	if r.Method == http.MethodPost {
		var newPatient Patient
		if err := json.NewDecoder(r.Body).Decode(&newPatient); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		// 既存のリストを読み込み（ファイルがなければ新規作成用空スライス）
		var patients []Patient
		data, err := os.ReadFile("patients.json")
		if err != nil && !os.IsNotExist(err) {
			http.Error(w, "Failed to read patients file", http.StatusInternalServerError)
			return
		}
		if len(data) > 0 {
			if err := json.Unmarshal(data, &patients); err != nil {
				http.Error(w, "Failed to parse patients file", http.StatusInternalServerError)
				return
			}
		}

		// 新しいデータを追加して保存
		patients = append(patients, newPatient)
		updatedData, err := json.MarshalIndent(patients, "", "  ")
		if err != nil {
			http.Error(w, "Failed to generate JSON", http.StatusInternalServerError)
			return
		}
		if err := os.WriteFile("patients.json", updatedData, 0644); err != nil {
			http.Error(w, "Failed to write file", http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusCreated)
		return
	}

	// --- GET: データの読み込み ---
	if r.Method == http.MethodGet {
		data, err := os.ReadFile("patients.json")
		if err != nil {
			// まだファイルが作られていない場合は空の配列を返す
			w.Header().Set("Content-Type", "application/json")
			w.Write([]byte("[]"))
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write(data)
		return
	}

	http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
}