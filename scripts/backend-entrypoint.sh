#!/bin/bash
set -e

go mod tidy

# Hot reload: rebuild & restart automatically when backend/*.go changes.
# air is cached in the go-cache volume; reinstalled only when the pinned
# version below changes.
AIR_VERSION=v1.65.3

if ! command -v air > /dev/null 2>&1 || ! air -v 2> /dev/null | grep -q "$AIR_VERSION"; then
  echo "Installing air $AIR_VERSION (hot reload)..."
  go install "github.com/air-verse/air@$AIR_VERSION" || true
fi

if command -v air > /dev/null 2>&1; then
  echo "Starting Go backend with hot reload (air)..."
  exec air -c .air.toml
fi

echo "air unavailable — starting Go backend without hot reload..."
exec go run ./backend
