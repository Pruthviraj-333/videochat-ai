# =============================================================================
# scripts/run-checks.ps1 — Windows PowerShell Quality Gate Runner
# =============================================================================
# Runs Hadolint, Ruff, and pytest locally on Windows.
# =============================================================================
$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent $PSScriptRoot
Set-Location $RootDir

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " 1. Running Hadolint (Dockerfile Linter)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
docker run --rm `
    -v "${RootDir}\.hadolint.yaml:/.config/hadolint.yaml" `
    -v "${RootDir}\Backend\Dockerfile:/Backend.Dockerfile" `
    -v "${RootDir}\video-qa-frontend\Dockerfile:/Frontend.Dockerfile" `
    hadolint/hadolint hadolint /Backend.Dockerfile /Frontend.Dockerfile
Write-Host "Hadolint checks passed!" -ForegroundColor Green

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host " 2. Running Ruff (Python Linter)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
docker cp "${RootDir}\Backend\main.py" videochat-backend:/app/
docker cp "${RootDir}\ruff.toml" videochat-backend:/app/
docker exec videochat-backend ruff check /app
Write-Host "Ruff checks passed!" -ForegroundColor Green

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host " 3. Running pytest (Unit & Integration Tests)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
docker cp "${RootDir}\Backend\tests" videochat-backend:/app/
docker exec videochat-backend pytest -v /app/tests
Write-Host "`nAll quality checks passed successfully!" -ForegroundColor Green

