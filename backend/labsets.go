package main

import (
	"encoding/json"
	"net/http"
)

// LabSet is a named list of lab item names the user wants to keep when pasting
// results into the karte. Stored as an array in lab_sets.json so every terminal
// shares the same sets.
type LabSet struct {
	Name  string   `json:"name"`
	Items []string `json:"items"`
}

// handleLabSets serves the lab item sets used by the LabFormatter tool.
// GET returns the whole array; POST replaces it with the posted array (the UI
// manages add / rename / delete and saves the full collection).
func handleLabSets(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		fileMu.Lock()
		defer fileMu.Unlock()
		serveJSONFile(w, "lab_sets.json")

	case http.MethodPost:
		var sets []LabSet
		if err := json.NewDecoder(r.Body).Decode(&sets); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		fileMu.Lock()
		defer fileMu.Unlock()

		if err := writeJSONFile("lab_sets.json", sets); err != nil {
			http.Error(w, "Failed to write file", http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusOK)

	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}
