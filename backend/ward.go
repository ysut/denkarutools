package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"time"
)

// WardRow is one inpatient line on the daily ward-round board. Day counts
// (術後日数 / 入院日数) are intentionally NOT stored — they are derived on the
// frontend from the dates relative to the board date being viewed.
type WardRow struct {
	PatientID     string `json:"patientId"`
	Name          string `json:"name"`
	Disease       string `json:"disease"`
	Category      string `json:"category"` // "surgery" | "RT" | "CCRT" | "other"
	SurgeryDate   string `json:"surgeryDate"`
	AdmissionDate string `json:"admissionDate"`
	AdmitToday    bool   `json:"admitToday"`
	Course        string `json:"course"`
	Todo          string `json:"todo"`
	DischargePlan string `json:"dischargePlan"`
	NextVisit     string `json:"nextVisit"`
	Room          string `json:"room"`
}

// WardBoard is a full board for a single date.
type WardBoard struct {
	Date    string    `json:"date"`
	Rows    []WardRow `json:"rows"`
	SavedAt string    `json:"savedAt"`
}

// wardDir is the subdirectory under dataDir holding the timestamped board files.
func wardDir() string {
	return dataPath("ward")
}

// dateRe guards the date params; mirrors the frontend regex.
var dateRe = regexp.MustCompile(`^\d{4}-\d{2}-\d{2}$`)

func validWardDate(s string) bool {
	return dateRe.MatchString(s)
}

// emptyBoardJSON returns the bytes for an empty board for the given (already
// validated) date. Used when no saved file exists for a date yet.
func emptyBoardJSON(date string) []byte {
	b, _ := json.Marshal(WardBoard{Date: date, Rows: []WardRow{}, SavedAt: ""})
	return b
}

// newestWardFile returns the lexically-greatest (newest save) file matching the
// given board date, or "" when none exists. Callers hold fileMu.
func newestWardFile(date string) string {
	// Path-traversal guard on the date param (mirrors preop.go).
	safe := filepath.Base(date)
	matches, err := filepath.Glob(filepath.Join(wardDir(), "ward_"+safe+"_*.json"))
	if err != nil || len(matches) == 0 {
		return ""
	}
	sort.Strings(matches)
	return matches[len(matches)-1]
}

// newestWardFileBefore returns the newest save file of the most recent board
// date strictly before the given date, or "" when none exists. Used by the
// "前日からコピー" feature. Callers hold fileMu.
func newestWardFileBefore(date string) string {
	matches, err := filepath.Glob(filepath.Join(wardDir(), "ward_*_*.json"))
	if err != nil || len(matches) == 0 {
		return ""
	}
	sort.Strings(matches)
	// Filenames sort lexically; the date segment is fixed-width (YYYY-MM-DD) so
	// the last file whose date is < the target wins. Scan from newest down.
	for i := len(matches) - 1; i >= 0; i-- {
		base := filepath.Base(matches[i]) // ward_<date>_<ts>.json
		if len(base) < len("ward_YYYY-MM-DD") {
			continue
		}
		fileDate := base[len("ward_") : len("ward_")+10]
		if fileDate < date {
			return matches[i]
		}
	}
	return ""
}

// handleWardBoard serves the inpatient daily-record board.
//
//	GET  ?date=YYYY-MM-DD   → newest board for that date (empty board if none)
//	GET  ?prior=YYYY-MM-DD  → newest board strictly before that date (carry-forward)
//	POST {date,rows,...}    → writes a new timestamped file (conflict-avoidance)
func handleWardBoard(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		if prior := r.URL.Query().Get("prior"); prior != "" {
			if !validWardDate(prior) {
				http.Error(w, "Invalid prior date", http.StatusBadRequest)
				return
			}
			fileMu.Lock()
			defer fileMu.Unlock()
			file := newestWardFileBefore(prior)
			w.Header().Set("Content-Type", "application/json")
			if file == "" {
				w.Write(emptyBoardJSON(""))
				return
			}
			data, err := os.ReadFile(file)
			if err != nil {
				w.Write(emptyBoardJSON(""))
				return
			}
			w.Write(data)
			return
		}

		date := r.URL.Query().Get("date")
		if !validWardDate(date) {
			http.Error(w, "Invalid date", http.StatusBadRequest)
			return
		}
		fileMu.Lock()
		defer fileMu.Unlock()
		w.Header().Set("Content-Type", "application/json")
		file := newestWardFile(date)
		if file == "" {
			w.Write(emptyBoardJSON(date))
			return
		}
		data, err := os.ReadFile(file)
		if err != nil {
			w.Write(emptyBoardJSON(date))
			return
		}
		w.Write(data)

	case http.MethodPost:
		var board WardBoard
		if err := json.NewDecoder(r.Body).Decode(&board); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		if !validWardDate(board.Date) {
			http.Error(w, "Invalid date", http.StatusBadRequest)
			return
		}

		now := time.Now()
		board.SavedAt = now.Format(time.RFC3339)
		ts := now.Format("20060102T150405")
		safe := filepath.Base(board.Date)
		filename := filepath.Join(wardDir(), fmt.Sprintf("ward_%s_%s.json", safe, ts))

		data, err := json.MarshalIndent(board, "", "  ")
		if err != nil {
			http.Error(w, "Failed to generate JSON", http.StatusInternalServerError)
			return
		}

		fileMu.Lock()
		defer fileMu.Unlock()
		if err := os.MkdirAll(wardDir(), 0755); err != nil {
			http.Error(w, "Failed to create ward dir", http.StatusInternalServerError)
			return
		}
		if err := os.WriteFile(filename, data, 0644); err != nil {
			fmt.Fprintf(os.Stderr, "【エラー】ボード書き込みに失敗: %v\n", err)
			http.Error(w, "Failed to write file to NAS", http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusCreated)

	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}
