#!/usr/bin/env bash
# =============================================================================
# scripts/lint.sh — Runs Python (Ruff) and Docker (Hadolint) linters
# =============================================================================
# Enforces code standards and Docker best practices before builds.
# =============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "=========================================================="
echo " 1. Running Dockerfile Linter (Hadolint)"
echo "=========================================================="
docker run --rm \
    -v "$ROOT_DIR/.hadolint.yaml:/.config/hadolint.yaml" \
    -v "$ROOT_DIR/Backend/Dockerfile:/Backend.Dockerfile" \
    -v "$ROOT_DIR/video-qa-frontend/Dockerfile:/Frontend.Dockerfile" \
    hadolint/hadolint hadolint /Backend.Dockerfile /Frontend.Dockerfile
echo "Hadolint: OK!"

echo ""
echo "=========================================================="
echo " 2. Running Python Linter (Ruff)"
echo "=========================================================="
if command -v ruff >/dev/null 2>&1; then
    ruff check Backend
elif docker ps -q -f name=videochat-backend | grep -q .; then
    docker cp Backend/main.py videochat-backend:/app/
    docker cp ruff.toml videochat-backend:/app/
    docker exec videochat-backend ruff check /app
else
    docker run --rm \
        -v "$ROOT_DIR:/workspace" \
        -w /workspace \
        python:3.11-slim \
        sh -c "pip install -q ruff && ruff check Backend"
fi
echo "Ruff: OK!"

echo ""
echo "All linting checks passed successfully!"

