#!/usr/bin/env bash
# =============================================================================
# scripts/test.sh — Runs pytest test suite
# =============================================================================
# Used locally and inside the Jenkins CI pipeline.
# =============================================================================
set -euo pipefail

echo "=========================================================="
echo " Running Unit & Integration Tests (pytest)"
echo "=========================================================="

# If pytest is available in host environment:
if command -v pytest >/dev/null 2>&1; then
    pytest -v Backend/tests
# Otherwise, if the backend container is running:
elif docker ps -q -f name=videochat-backend | grep -q .; then
    docker cp Backend/tests videochat-backend:/app/
    docker exec videochat-backend pytest -v /app/tests
# Fallback to an ephemeral Python container:
else
    echo "Running tests in ephemeral Docker container..."
    docker run --rm \
        -v "$(pwd)/Backend:/app" \
        -w /app \
        python:3.11-slim \
        sh -c "pip install -q --no-cache-dir -r requirements.txt -r requirements-dev.txt && pytest -v tests"
fi

echo "All tests passed successfully!"

