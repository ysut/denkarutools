# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

**denkarutools** is a Japanese medical tools web application targeting gynecology/obstetrics. It provides:
- **Chemocalc** (`化学療法計算`) — Carboplatin (Calvert formula) and BSA-based drug dose calculator
- **ChemoSchedule** (`化学療法スケジュール`) — Printable chemotherapy schedule sheets; regimens defined in `regimens.toml`
- **DrugHoldChecker** (`術前休薬チェッカー`) — Perioperative drug-hold/resume guidance from free-text drug input
- **LabFormatter** (`検査結果整形ツール`) — Cleans pasted EMR lab results, adds units, appends CTCAE v5.0 grades (frontend-only; logic in `src/data/labFormat.js`)
- **PatientManager** (`患者管理`) — Simple patient list with CRUD via JSON file
- **PreopSummary** (`術前サマリー`) — Pre-operative summary form (cytology, biopsy, imaging findings) per patient

## Running the App
- 院内電子カルテ端末で実行するアプリケーション
- オフラインの端末で動かす
- 各端末にはInternet Explorer 11が入っている
- goサーバーをローカルで立ち上げてアプリケーションを使う
- ログファイルやコンフィグは、利用者全員がアクセスできるNASに保存する

**Recommended — Docker Compose (both services):**
```bash
docker compose up
# Frontend: http://localhost:8081
# Backend:  http://localhost:8080
```

Dev loop: edits to `frontend/src` hot-reload via the Vue dev server; edits to
`backend/*.go` auto-rebuild via air (`.air.toml`, installed on first container
start into the `go-cache` volume); `regimens.toml` needs no restart at all
(re-read per request). Manual `go build` is only for releases.

## Production Release (offline terminals)

```bash
sh scripts/build-release.sh          # → release/denkarutools.exe (Windows 64bit)
sh scripts/build-release.sh linux    # → release/denkarutools-linux
sh scripts/build-release.sh mac      # → release/denkarutools-mac
```

- Builds run entirely in Docker (node:16-slim → golang:1.26-bookworm). The built
  frontend is copied into `backend/static/` and embedded into the binary via
  `go:embed`, so one binary serves both UI and API on port 8080 (`PORT` env to change).
- Deploy: put the binary and the `data/` folder (shipped with `regimens.toml` +
  `lab_sets.json` seeds) in one place and run it **with that folder as the working
  directory**. All data files live under `data/` (see Data files below). Point
  `DENKARU_DATA_DIR` at a shared NAS path to share data across terminals.
- On updates, replace only the binary and keep the existing `data/` (preserves
  patient data and saved sets).
- Open `http://localhost:8080` in the terminal's browser.

### IE11 compatibility (until terminals get Edge)

The frontend must stay IE11-compatible:
- `npm run build` uses `--no-module` (Vue CLI 5 defaults to modern/ESM builds otherwise — IE gets ES6 syntax errors without this flag).
- `browserslist` includes `ie 11`; `whatwg-fetch` is imported in `main.js`.
- Do NOT use: CSS custom properties (`var(--…)`), CSS grid, flex `gap`,
  `navigator.clipboard` (use `src/utils/clipboard.js`), `String.prototype.normalize`
  without a guard. API responses send `Cache-Control: no-store` because IE caches GET XHR.
- Once all terminals are replaced with Edge (planned within 2026), migrate to
  Vue 3 + Vite following `docs/VUE3_MIGRATION.md`.

## Architecture

### Frontend — Vue 2 SPA (`frontend/`)
- Single-page app; navigation is a `currentView` string in `App.vue` that swaps between the four components via `<component :is="...">`.
- No Vue Router or Vuex. All state is local to each component.
- API calls go to `/api/*` which `vue.config.js` proxies to `http://localhost:8080` in dev.

### Backend — Go stdlib HTTP (`backend/`)
- No external dependencies (`go.mod` has none). Pure `net/http`.
- `main.go` — registers routes and the `Patient` CRUD handler. `dataDir` (env
  `DENKARU_DATA_DIR`, default `data`) + `dataPath()` resolve every data file;
  `os.MkdirAll(dataDir)` runs on startup.
- `preop.go` — `PreopSummary` handler with GET `?id=<ID>` and POST.
- `labsets.go` — `/api/lab-sets` handler: GET returns the lab item sets array, POST replaces the whole array (used by LabFormatter to keep only chosen items).

### Data files
All runtime data lives in **one directory** (`data/`, or `$DENKARU_DATA_DIR`).
Every backend file read/write goes through `dataPath()`.
- `data/regimens.toml` — chemotherapy regimens (human-edited; **tracked** as initial config)
- `data/lab_sets.json` — named lab item sets for LabFormatter, `[{name, items[]}]` (**tracked** seed; overwritten at runtime via POST)
- `data/patients.json` — patient list (**gitignored** — patient data)
- `data/summary_<ID>.json` — per-patient preop summary (**gitignored**; path-traversal–safe via `filepath.Base`)
- `seed/` — committed sample patient data for local dev (copy into `data/` to populate a fresh checkout).

### Docker Compose
- `frontend` container: Node 16, mounts `./frontend`, serves on host port **8081** → container 8080.
- `backend` container: Go 1.26 (with air hot reload), mounts repo root `.` as `/app`, serves on host port **8080**.
- Backend reads/writes under `/app/data` (the default `dataDir` relative to the working directory `/app`).

## Key Conventions

- The frontend dev server proxy (`/api` → `http://localhost:8080`) is only active during `npm run serve`. The production build assumes the backend is co-hosted or similarly proxied.
- Carboplatin dosing uses the Calvert formula: `dose = AUC × (GFR + constant)`. Constant defaults to 25; switches to 15 when using Ando Ccr correction and GFR is 15–25.
- BSA uses Fujimoto formula by default: `0.008883 × weight^0.444 × height^0.663`.
- IBW formulas (Devine, Hamwi, Robinson, Miller) and weight-adjustment logic (AdjBW) are computed as Vue `computed` properties in `Chemocalc.vue`.
