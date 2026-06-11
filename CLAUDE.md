# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

**denkarutools** is a Japanese medical tools web application targeting gynecology/obstetrics. It provides:
- **Chemocalc** (`化学療法計算`) — Carboplatin (Calvert formula) and BSA-based drug dose calculator
- **ChemoSchedule** (`化学療法スケジュール`) — Printable chemotherapy schedule sheets; regimens defined in `regimens.toml`
- **DrugHoldChecker** (`術前休薬チェッカー`) — Perioperative drug-hold/resume guidance from free-text drug input
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

## Production Release (offline terminals)

```bash
sh scripts/build-release.sh          # → release/denkarutools.exe (Windows 64bit)
sh scripts/build-release.sh linux    # → release/denkarutools-linux
sh scripts/build-release.sh mac      # → release/denkarutools-mac
```

- Builds run entirely in Docker (node:16-slim → golang:1.24-bookworm). The built
  frontend is copied into `backend/static/` and embedded into the binary via
  `go:embed`, so one binary serves both UI and API on port 8080 (`PORT` env to change).
- Deploy: put the binary and `regimens.toml` in one folder (e.g. on the shared NAS)
  and run it **with that folder as the working directory** — all data files
  (`patients.json`, `summary_*.json`) are read/written relative to the CWD.
- Open `http://localhost:8080` in the terminal's browser.

### IE11 compatibility (until terminals get Edge)

The frontend must stay IE11-compatible:
- `npm run build` uses `--no-module` (Vue CLI 5 defaults to modern/ESM builds otherwise — IE gets ES6 syntax errors without this flag).
- `browserslist` includes `ie 11`; `whatwg-fetch` is imported in `main.js`.
- Do NOT use: CSS custom properties (`var(--…)`), CSS grid, flex `gap`,
  `navigator.clipboard` (use `src/utils/clipboard.js`), `String.prototype.normalize`
  without a guard. API responses send `Cache-Control: no-store` because IE caches GET XHR.

## Architecture

### Frontend — Vue 2 SPA (`frontend/`)
- Single-page app; navigation is a `currentView` string in `App.vue` that swaps between the four components via `<component :is="...">`.
- No Vue Router or Vuex. All state is local to each component.
- API calls go to `/api/*` which `vue.config.js` proxies to `http://localhost:8080` in dev.

### Backend — Go stdlib HTTP (`backend/`)
- No external dependencies (`go.mod` has none). Pure `net/http`.
- `main.go` — registers routes and the `Patient` CRUD handler.
- `preop.go` — `PreopSummary` handler with GET `?id=<ID>` and POST.
- All data persisted as flat JSON files in the working directory:
  - `patients.json` — array of all patients
  - `summary_<ID>.json` — one file per patient preop summary (path-traversal–safe via `filepath.Base`)

### Docker Compose
- `frontend` container: Node 16, mounts `./frontend`, serves on host port **8081** → container 8080.
- `backend` container: Go 1.24, mounts repo root `.` as `/app`, serves on host port **8080**.
- Backend reads/writes JSON files relative to `/app` (the repo root), so `patients.json` and `summary_*.json` are committed/present at the repo root.

## Key Conventions

- The frontend dev server proxy (`/api` → `http://localhost:8080`) is only active during `npm run serve`. The production build assumes the backend is co-hosted or similarly proxied.
- Carboplatin dosing uses the Calvert formula: `dose = AUC × (GFR + constant)`. Constant defaults to 25; switches to 15 when using Ando Ccr correction and GFR is 15–25.
- BSA uses Fujimoto formula by default: `0.008883 × weight^0.444 × height^0.663`.
- IBW formulas (Devine, Hamwi, Robinson, Miller) and weight-adjustment logic (AdjBW) are computed as Vue `computed` properties in `Chemocalc.vue`.
