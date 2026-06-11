package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"sync"
)

// 共通の患者管理データ用構造体
type Patient struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Age       int    `json:"age"`
	Disease   string `json:"disease"`
	LastVisit string `json:"last_visit"`
}

// fileMu serializes access to the JSON data files so that concurrent
// requests cannot interleave read-modify-write cycles.
var fileMu sync.Mutex

// withCORS wraps a handler with the shared CORS policy and short-circuits
// preflight (OPTIONS) requests. Cache-Control: no-store is required because
// IE11 aggressively caches GET XHR responses.
func withCORS(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.Header().Set("Cache-Control", "no-store")
		if r.Method == http.MethodOptions {
			return
		}
		next(w, r)
	}
}

func main() {
	mux := http.NewServeMux()

	mux.HandleFunc("/api/patients", withCORS(handlePatients))
	mux.HandleFunc("/api/preop-summary", withCORS(handlePreopSummary))
	mux.HandleFunc("/api/regimens", withCORS(handleRegimens))
	mux.Handle("/", staticHandler())

	addr := ":8080"
	if p := os.Getenv("PORT"); p != "" {
		addr = ":" + p
	}
	fmt.Printf("🚀 denkarutools server starting on %s (http://localhost%s)\n", addr, addr)
	if err := http.ListenAndServe(addr, mux); err != nil {
		fmt.Printf("Server failed to start: %v\n", err)
	}
}

func loadPatients() ([]Patient, error) {
	var patients []Patient
	data, err := os.ReadFile("patients.json")
	if err != nil {
		if os.IsNotExist(err) {
			return []Patient{}, nil
		}
		return nil, err
	}
	if len(data) > 0 {
		if err := json.Unmarshal(data, &patients); err != nil {
			return nil, err
		}
	}
	return patients, nil
}

func savePatients(patients []Patient) error {
	data, err := json.MarshalIndent(patients, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile("patients.json", data, 0644)
}

// 患者管理APIのコアロジック
func handlePatients(w http.ResponseWriter, r *http.Request) {
	switch r.Method {

	// --- POST: データの保存（同一IDは上書き更新） ---
	case http.MethodPost:
		var newPatient Patient
		if err := json.NewDecoder(r.Body).Decode(&newPatient); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		if newPatient.ID == "" {
			http.Error(w, "Missing id", http.StatusBadRequest)
			return
		}

		fileMu.Lock()
		defer fileMu.Unlock()

		patients, err := loadPatients()
		if err != nil {
			http.Error(w, "Failed to read patients file", http.StatusInternalServerError)
			return
		}

		updated := false
		for i := range patients {
			if patients[i].ID == newPatient.ID {
				patients[i] = newPatient
				updated = true
				break
			}
		}
		if !updated {
			patients = append(patients, newPatient)
		}

		if err := savePatients(patients); err != nil {
			http.Error(w, "Failed to write file", http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusCreated)

	// --- DELETE: ?id=P001 で削除 ---
	case http.MethodDelete:
		id := r.URL.Query().Get("id")
		if id == "" {
			http.Error(w, "Missing id", http.StatusBadRequest)
			return
		}

		fileMu.Lock()
		defer fileMu.Unlock()

		patients, err := loadPatients()
		if err != nil {
			http.Error(w, "Failed to read patients file", http.StatusInternalServerError)
			return
		}

		kept := patients[:0]
		for _, p := range patients {
			if p.ID != id {
				kept = append(kept, p)
			}
		}
		if len(kept) == len(patients) {
			http.Error(w, "Patient not found", http.StatusNotFound)
			return
		}

		if err := savePatients(kept); err != nil {
			http.Error(w, "Failed to write file", http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusOK)

	// --- GET: データの読み込み ---
	case http.MethodGet:
		fileMu.Lock()
		defer fileMu.Unlock()

		data, err := os.ReadFile("patients.json")
		if err != nil {
			// まだファイルが作られていない場合は空の配列を返す
			w.Header().Set("Content-Type", "application/json")
			w.Write([]byte("[]"))
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write(data)

	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}
