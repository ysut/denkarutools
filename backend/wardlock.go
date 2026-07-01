package main

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// WardLock is one terminal's presence/heartbeat for a ward board date. Multiple
// terminals editing the same date each write their own file (keyed by hostname),
// so there is no single-file write contention on the shared NAS and concurrent
// editing is represented naturally.
type WardLock struct {
	Holder    string `json:"holder"`    // hostname of the editing terminal
	Since     string `json:"since"`     // RFC3339, when editing started
	Heartbeat string `json:"heartbeat"` // RFC3339, last refresh
}

// lockTTL is how long a presence file stays "active" without a heartbeat. The
// frontend refreshes every ~30s, so 120s tolerates a few missed beats while
// still letting a crashed/closed terminal's lock auto-expire.
const lockTTL = 120 * time.Second

// hostnameSanitizeRe-equivalent: keep only filename-safe chars.
func sanitizeHost(h string) string {
	var b strings.Builder
	for _, r := range h {
		if (r >= 'A' && r <= 'Z') || (r >= 'a' && r <= 'z') ||
			(r >= '0' && r <= '9') || r == '.' || r == '_' || r == '-' {
			b.WriteRune(r)
		} else {
			b.WriteRune('_')
		}
	}
	s := b.String()
	if s == "" {
		return "unknown"
	}
	return s
}

// selfHost returns this terminal's sanitized hostname (used as the lock holder).
func selfHost() string {
	h, err := os.Hostname()
	if err != nil || h == "" {
		return "unknown"
	}
	return sanitizeHost(h)
}

// lockFilePath returns the presence file path for a (validated) date + host.
func lockFilePath(date, host string) string {
	return filepath.Join(wardDir(), "wardlock_"+date+"_"+host+".json")
}

// activeOtherEditors scans the presence files for a date, deletes stale ones
// (best-effort cleanup), and returns the active locks held by terminals other
// than self. Callers hold fileMu.
func activeOtherEditors(date, self string) []WardLock {
	safe := filepath.Base(date)
	matches, err := filepath.Glob(filepath.Join(wardDir(), "wardlock_"+safe+"_*.json"))
	if err != nil {
		return []WardLock{}
	}
	now := time.Now()
	others := []WardLock{}
	for _, f := range matches {
		data, err := os.ReadFile(f)
		if err != nil {
			continue
		}
		var lk WardLock
		if json.Unmarshal(data, &lk) != nil {
			continue
		}
		hb, err := time.Parse(time.RFC3339, lk.Heartbeat)
		if err != nil || now.Sub(hb) > lockTTL {
			os.Remove(f) // stale: clean up
			continue
		}
		if lk.Holder == self {
			continue
		}
		others = append(others, lk)
	}
	return others
}

// handleWardLock manages soft, advisory edit locks for ward boards.
//
//	GET  ?date=YYYY-MM-DD             → active editors other than self
//	POST ?date=YYYY-MM-DD             → acquire/refresh my presence (heartbeat)
//	POST ?date=YYYY-MM-DD&release=1   → release my presence
func handleWardLock(w http.ResponseWriter, r *http.Request) {
	date := r.URL.Query().Get("date")
	if !validWardDate(date) {
		http.Error(w, "Invalid date", http.StatusBadRequest)
		return
	}
	self := selfHost()

	switch r.Method {
	case http.MethodGet:
		fileMu.Lock()
		defer fileMu.Unlock()
		writeLockJSON(w, activeOtherEditors(date, self))

	case http.MethodPost:
		fileMu.Lock()
		defer fileMu.Unlock()

		path := lockFilePath(filepath.Base(date), self)
		if r.URL.Query().Get("release") != "" {
			os.Remove(path) // best-effort; absence is success
			writeLockJSON(w, activeOtherEditors(date, self))
			return
		}

		if err := os.MkdirAll(wardDir(), 0755); err != nil {
			http.Error(w, "Failed to create ward dir", http.StatusInternalServerError)
			return
		}
		now := time.Now()
		since := now.Format(time.RFC3339)
		// Preserve the original "since" if we already hold the lock.
		if data, err := os.ReadFile(path); err == nil {
			var prev WardLock
			if json.Unmarshal(data, &prev) == nil && prev.Since != "" {
				since = prev.Since
			}
		}
		lk := WardLock{Holder: self, Since: since, Heartbeat: now.Format(time.RFC3339)}
		if data, err := json.MarshalIndent(lk, "", "  "); err == nil {
			os.WriteFile(path, data, 0644)
		}
		writeLockJSON(w, activeOtherEditors(date, self))

	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// writeLockJSON sends the {others:[...]} response.
func writeLockJSON(w http.ResponseWriter, others []WardLock) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string][]WardLock{"others": others})
}
