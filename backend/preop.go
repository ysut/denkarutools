package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
)

// 術前サマリーの構造体定義
type PreopSummary struct {
	ID                      string `json:"id"`
	Age                     int    `json:"age"`
	Gravida                 string `json:"gravida"`
	Para                    string `json:"para"`
	ChiefComplaint          string `json:"chiefComplaint"`
	PastHistory             string `json:"pastHistory"`
	SurgicalHistory         string `json:"surgicalHistory"`
	CervicalCytologyDate    string `json:"cervicalCytologyDate"`
	CervicalCytology        string `json:"cervicalCytology"`
	CervicalBiopsyDate      string `json:"cervicalBiopsyDate"`
	CervicalBiopsy          string `json:"cervicalBiopsy"`
	EndometrialCytologyDate string `json:"endometrialCytologyDate"`
	EndometrialCytology     string `json:"endometrialCytology"`
	EndometrialBiopsyDate   string `json:"endometrialBiopsyDate"`
	EndometrialBiopsy       string `json:"endometrialBiopsy"`
	CtDate                  string `json:"ctDate"`
	CtFindings              string `json:"ctFindings"`
	MriDate                 string `json:"mriDate"`
	MriFindings             string `json:"mriFindings"`
	PetDate                 string `json:"petDate"`
	PetFindings             string `json:"petFindings"`
}

// サマリー用ハンドラ
func handlePreopSummary(w http.ResponseWriter, req *http.Request) {
	// GET: 読み込み (?id=P001)
	if req.Method == http.MethodGet {
		id := req.URL.Query().Get("id")
		if id == "" {
			http.Error(w, "Missing id", http.StatusBadRequest)
			return
		}

		// 安全対策: id に「../」などが含まれていてもファイル名部分だけを抽出する
		safeID := filepath.Base(id)
		filename := fmt.Sprintf("summary_%s.json", safeID)

		fileMu.Lock()
		data, err := os.ReadFile(filename)
		fileMu.Unlock()
		if err != nil {
			// ファイルがない場合はVue側が「新規作成モード」に切り替えられるよう 404 を返す
			http.Error(w, "Summary not found", http.StatusNotFound)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.Write(data)
		return
	}

	// POST: 保存
	if req.Method == http.MethodPost {
		var summary PreopSummary
		if err := json.NewDecoder(req.Body).Decode(&summary); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		if summary.ID == "" {
			http.Error(w, "Missing ID", http.StatusBadRequest)
			return
		}

		// 安全対策: IDのパストラバーサル防御
		safeID := filepath.Base(summary.ID)
		filename := fmt.Sprintf("summary_%s.json", safeID)

		updatedData, err := json.MarshalIndent(summary, "", "  ")
		if err != nil {
			http.Error(w, "Failed to generate JSON", http.StatusInternalServerError)
			return
		}

		fileMu.Lock()
		err = os.WriteFile(filename, updatedData, 0644)
		fileMu.Unlock()
		if err != nil {
			fmt.Fprintf(os.Stderr, "【エラー】ファイル書き込みに失敗: %v\n", err)
			http.Error(w, "Failed to write file to NAS", http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusOK)
		return
	}

	// GET/POST 以外が来た場合
	http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
}