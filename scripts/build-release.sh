#!/bin/bash
# Build a self-contained release binary for offline hospital terminals.
# Everything is built inside Docker (node / golang bookworm images, no alpine).
#
# Usage:
#   sh scripts/build-release.sh            # Windows 64bit (hospital terminals)
#   sh scripts/build-release.sh linux      # Linux 64bit
#   sh scripts/build-release.sh mac        # macOS (Apple Silicon)
#
# Output: release/denkarutools.exe (or denkarutools-linux / denkarutools-mac)
# Deploy: copy the binary + regimens.toml (+ existing patients.json /
# summary_*.json if migrating) into one folder on the terminal, run the
# binary, then open http://localhost:8080 in the browser.

set -e
cd "$(dirname "$0")/.."

TARGET="${1:-windows}"
case "$TARGET" in
  windows) GOOS=windows; GOARCH=amd64; OUT=denkarutools.exe ;;
  linux)   GOOS=linux;   GOARCH=amd64; OUT=denkarutools-linux ;;
  mac)     GOOS=darwin;  GOARCH=arm64; OUT=denkarutools-mac ;;
  *) echo "Unknown target: $TARGET (use windows / linux / mac)"; exit 1 ;;
esac

echo "==> [1/3] Building frontend (node:16-slim)"
# A named volume shadows the host node_modules so host and container
# installs never mix platform-specific packages.
docker run --rm \
  -v "$PWD/frontend":/app \
  -v denkarutools-release-node-modules:/app/node_modules \
  -w /app node:16-slim \
  sh -c "npm install --no-audit --no-fund --loglevel=error && npm run build"

echo "==> [2/3] Embedding frontend into backend/static"
find backend/static -mindepth 1 ! -name placeholder.html -delete
cp -R frontend/dist/. backend/static/

echo "==> [3/3] Compiling Go binary for $TARGET (golang:1.24-bookworm)"
mkdir -p release
docker run --rm \
  -v "$PWD":/app -w /app \
  -e GOOS="$GOOS" -e GOARCH="$GOARCH" -e CGO_ENABLED=0 \
  golang:1.24-bookworm \
  go build -trimpath -ldflags "-s -w" -o "release/$OUT" ./backend

cp regimens.toml release/

echo ""
echo "✅ Done: release/$OUT"
echo "   配布物: release/$OUT と release/regimens.toml を同じフォルダに置いて実行し、"
echo "   ブラウザで http://localhost:8080 を開いてください。"
echo "   （patients.json などのデータファイルは実行フォルダに自動作成されます）"
