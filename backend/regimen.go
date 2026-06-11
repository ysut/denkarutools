package main

import (
	"encoding/json"
	"net/http"
	"os"
)

// handleRegimens serves the chemotherapy regimen definitions.
// The TOML file is re-read on every request so that edits to regimens.toml
// take effect without restarting the backend.
func handleRegimens(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	data, err := os.ReadFile("regimens.toml")
	if err != nil {
		http.Error(w, "regimens.toml not found", http.StatusNotFound)
		return
	}

	parsed, err := ParseTOML(string(data))
	if err != nil {
		http.Error(w, "Failed to parse regimens.toml: "+err.Error(), http.StatusInternalServerError)
		return
	}

	regimens, ok := parsed["regimens"]
	if !ok {
		regimens = []interface{}{}
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(regimens); err != nil {
		http.Error(w, "Failed to encode JSON", http.StatusInternalServerError)
	}
}
