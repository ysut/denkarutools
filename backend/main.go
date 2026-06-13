package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"sync"
)

// dataDir is the single directory where all runtime data files live
// (patients.json, summary_*.json, regimens.toml, lab_sets.json). Override with
// the DENKARU_DATA_DIR env var (e.g. point it at a shared NAS path in
// production); defaults to "data" relative to the working directory.
var dataDir = "data"

// dataPath joins a filename onto the configured data directory.
func dataPath(name string) string {
	return filepath.Join(dataDir, name)
}

// serveJSONFile writes the raw contents of a data file as JSON, falling back to
// an empty array when the file does not exist yet. Callers hold fileMu.
func serveJSONFile(w http.ResponseWriter, name string) {
	w.Header().Set("Content-Type", "application/json")
	data, err := os.ReadFile(dataPath(name))
	if err != nil {
		w.Write([]byte("[]"))
		return
	}
	w.Write(data)
}

// writeJSONFile marshals v with indentation and writes it to a data file.
// Callers hold fileMu.
func writeJSONFile(name string, v interface{}) error {
	data, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(dataPath(name), data, 0644)
}

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
	if d := os.Getenv("DENKARU_DATA_DIR"); d != "" {
		dataDir = d
	}
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		fmt.Printf("Failed to create data dir %q: %v\n", dataDir, err)
	}

	mux := http.NewServeMux()

	mux.HandleFunc("/api/patients", withCORS(handlePatients))
	mux.HandleFunc("/api/preop-summary", withCORS(handlePreopSummary))
	mux.HandleFunc("/api/regimens", withCORS(handleRegimens))
	mux.HandleFunc("/api/lab-sets", withCORS(handleLabSets))
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
	data, err := os.ReadFile(dataPath("patients.json"))
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
	return writeJSONFile("patients.json", patients)
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

	// --- GET: データの読み込み（未作成なら空配列） ---
	case http.MethodGet:
		fileMu.Lock()
		defer fileMu.Unlock()
		serveJSONFile(w, "patients.json")

	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}
