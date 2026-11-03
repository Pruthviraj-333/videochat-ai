#!/usr/bin/env bash
# =============================================================================
# scripts/deploy.sh — Automated Deployment & Zero-Downtime Rollback Script
# =============================================================================
# Usage:
#   ./scripts/deploy.sh [IMAGE_TAG]
#
# Examples:
#   ./scripts/deploy.sh 1.0.4
#   ./scripts/deploy.sh b4f2e91
#
# Process:
# 1. Saves previous version tag for instant rollback
# 2. Deploys target IMAGE_TAG via Docker Compose
# 3. Polls /api/health for up to 60 seconds (12 retries x 5 seconds)
# 4. If healthy: updates state file, prunes old images, exits 0
# 5. If unhealthy: rolls back to PREVIOUS_TAG, verifies health, exits 1
# =============================================================================
set -euo pipefail

# -----------------------------------------------------------------------------
# 1. Configuration & Argument Parsing
# -----------------------------------------------------------------------------
NEW_TAG="${1:-${IMAGE_TAG:-latest}}"

# Locate workspace root directory (works on EC2 /opt/videochat or local repo)
if [ -d "/opt/videochat" ]; then
    APP_DIR="/opt/videochat"
else
    APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fi

cd "$APP_DIR"

STATE_FILE="${APP_DIR}/.current_version"
MAX_RETRIES="${MAX_RETRIES:-12}"
RETRY_INTERVAL="${RETRY_INTERVAL:-5}"

# Determine frontend port from environment or .env file
if [ -f "${APP_DIR}/.env" ]; then
    # Load environment variables without overriding already-exported ones
    set -a
    # shellcheck disable=SC1091
    source "${APP_DIR}/.env" 2>/dev/null || true
    set +a
fi

PORT="${FRONTEND_PORT:-80}"
HEALTH_URL="${HEALTH_URL:-http://localhost:${PORT}/api/health}"

# Determine Compose command (Compose v2 'docker compose' or v1 'docker-compose')
if docker compose version >/dev/null 2>&1; then
    COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE="docker-compose"
else
    echo "ERROR: Neither 'docker compose' nor 'docker-compose' was found." >&2
    exit 1
fi

# -----------------------------------------------------------------------------
# 2. Read Previous Stable Version
# -----------------------------------------------------------------------------
if [ -f "$STATE_FILE" ]; then
    PREVIOUS_TAG="$(cat "$STATE_FILE" | tr -d '[:space:]')"
else
    PREVIOUS_TAG="latest"
fi

echo "========================================================================"
echo " VideoChat AI — Automated Deployment"
echo "========================================================================"
echo " Timestamp      : $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
echo " Target Version : ${NEW_TAG}"
echo " Previous Stable: ${PREVIOUS_TAG}"
echo " Workspace Dir  : ${APP_DIR}"
echo " Health Endpoint: ${HEALTH_URL}"
echo " Max Retries    : ${MAX_RETRIES} attempts (${RETRY_INTERVAL}s interval)"
echo "========================================================================"

# -----------------------------------------------------------------------------
# 3. Pull / Prepare Images and Deploy
# -----------------------------------------------------------------------------
export IMAGE_TAG="${NEW_TAG}"

echo "==> [1/4] Attempting to pull images for tag: ${NEW_TAG}..."
$COMPOSE pull --ignore-pull-failures 2>/dev/null || echo "Note: Using local images if registry pull skipped."

echo "==> [2/4] Starting service containers..."
$COMPOSE up -d --remove-orphans

# -----------------------------------------------------------------------------
# 4. Health Check Polling
# -----------------------------------------------------------------------------
echo "==> [3/4] Verifying application health at ${HEALTH_URL}..."
HEALTHY=false

for attempt in $(seq 1 "$MAX_RETRIES"); do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 --max-time 4 "$HEALTH_URL" 2>/dev/null || echo "000")
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo "==> [Attempt ${attempt}/${MAX_RETRIES}] SUCCESS: Health check passed (HTTP 200)!"
        HEALTHY=true
        break
    else
        echo "==> [Attempt ${attempt}/${MAX_RETRIES}] Status: ${HTTP_CODE} (waiting ${RETRY_INTERVAL}s)..."
        sleep "$RETRY_INTERVAL"
    fi
done

# -----------------------------------------------------------------------------
# 5. Rollback or Finalize
# -----------------------------------------------------------------------------
if [ "$HEALTHY" = "false" ]; then
    echo "========================================================================"
    echo " ALERT: Health check failed after $((MAX_RETRIES * RETRY_INTERVAL)) seconds!"
    echo " Initiating AUTOMATED ROLLBACK to previous stable tag: ${PREVIOUS_TAG}"
    echo "========================================================================"
    
    export IMAGE_TAG="${PREVIOUS_TAG}"
    $COMPOSE up -d --remove-orphans
    
    echo "==> Verifying rolled-back application health..."
    ROLLBACK_HEALTHY=false
    for r_attempt in $(seq 1 "$MAX_RETRIES"); do
        R_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 --max-time 4 "$HEALTH_URL" 2>/dev/null || echo "000")
        if [ "$R_CODE" = "200" ]; then
            echo "==> [Rollback Attempt ${r_attempt}/${MAX_RETRIES}] Rollback verified healthy (HTTP 200)!"
            ROLLBACK_HEALTHY=true
            break
        fi
        sleep "$RETRY_INTERVAL"
    done
    
    if [ "$ROLLBACK_HEALTHY" = "true" ]; then
        echo "==> Rollback to ${PREVIOUS_TAG} succeeded. Exiting with failure to alert CI/CD pipeline."
        echo "${PREVIOUS_TAG}" > "$STATE_FILE"
        exit 1
    else
        echo "CRITICAL: Rollback to ${PREVIOUS_TAG} also failed! Check container logs immediately."
        $COMPOSE logs --tail=50
        exit 2
    fi
fi

# -----------------------------------------------------------------------------
# 6. Deployment Finalized
# -----------------------------------------------------------------------------
echo "==> [4/4] Finalizing deployment..."
echo "${NEW_TAG}" > "$STATE_FILE"

# Clean up dangling images to prevent disk exhaustion on EC2
echo "==> Cleaning up unused/dangling Docker images..."
docker image prune -f >/dev/null 2>&1 || true

echo "========================================================================"
echo " DEPLOYMENT SUCCESSFUL: VideoChat AI is live with tag '${NEW_TAG}'"
echo " Completed at: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
echo "========================================================================"
exit 0

