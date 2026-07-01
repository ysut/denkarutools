package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
)

// FibroidShape is one ellipsoid (a sphere when Rx=Ry=Rz) placed around the
// uterus in the 3D simulation. Positions and radii are in millimeters.
type FibroidShape struct {
	Label string  `json:"label"`
	Cx    float64 `json:"cx"`
	Cy    float64 `json:"cy"`
	Cz    float64 `json:"cz"`
	Rx    float64 `json:"rx"`
	Ry    float64 `json:"ry"`
	Rz    float64 `json:"rz"`
	Color string  `json:"color"`
}

// FibroidSim is a per-patient fibroid layout, persisted as fibroidsim_<ID>.json.
type FibroidSim struct {
	ID     string         `json:"id"`
	Shapes []FibroidShape `json:"shapes"`
}

// handleFibroidSim serves the per-patient fibroid 3D simulation layout.
//
//	GET  ?id=<ID>  → saved layout (404 when none, so the frontend starts fresh)
//	POST {id,...}  → overwrites the patient's layout file
func handleFibroidSim(w http.ResponseWriter, req *http.Request) {
	switch req.Method {
	case http.MethodGet:
		id := req.URL.Query().Get("id")
		if id == "" {
			http.Error(w, "Missing id", http.StatusBadRequest)
			return
		}
		// Path-traversal guard: keep only the filename portion of id.
		safeID := filepath.Base(id)
		filename := dataPath(fmt.Sprintf("fibroidsim_%s.json", safeID))

		fileMu.Lock()
		data, err := os.ReadFile(filename)
		fileMu.Unlock()
		if err != nil {
			http.Error(w, "Simulation not found", http.StatusNotFound)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write(data)

	case http.MethodPost:
		var sim FibroidSim
		if err := json.NewDecoder(req.Body).Decode(&sim); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		if sim.ID == "" {
			http.Error(w, "Missing ID", http.StatusBadRequest)
			return
		}
		safeID := filepath.Base(sim.ID)
		filename := dataPath(fmt.Sprintf("fibroidsim_%s.json", safeID))

		updatedData, err := json.MarshalIndent(sim, "", "  ")
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

	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}
