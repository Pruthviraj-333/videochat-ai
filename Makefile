# =============================================================================
# Makefile — Local & CI Automation for VideoChat AI
# =============================================================================
# Provides standardized targets for testing, linting, and running checks.
# Works in local terminal, Docker, or Jenkins pipeline steps.
# =============================================================================

.PHONY: help test lint lint-python lint-docker check build up down deploy tf-init tf-fmt tf-validate tf-plan jenkins-up jenkins-down jenkins-logs

# Default target
all: check

help:
	@echo "Available commands:"
	@echo "  make test          Run pytest suite"
	@echo "  make lint-python   Run Ruff Python linter"
	@echo "  make lint-docker   Run Hadolint Dockerfile linter"
	@echo "  make lint          Run all linters"
	@echo "  make check         Run linters and tests (CI gate)"
	@echo "  make build         Build Docker containers"
	@echo "  make up            Start Docker Compose stack"
	@echo "  make down          Stop Docker Compose stack"
	@echo "  make deploy        Deploy new version with automated rollback (e.g. make deploy TAG=1.0.0)"
	@echo "  make jenkins-up    Start self-hosted Jenkins in Docker"
	@echo "  make jenkins-down  Stop self-hosted Jenkins"
	@echo "  make tf-init       Initialize Terraform in infra/"
	@echo "  make tf-fmt        Check Terraform code formatting"
	@echo "  make tf-validate   Validate Terraform syntax and configuration"
	@echo "  make tf-plan       Run dry-run Terraform execution plan"

# -----------------------------------------------------------------------------
# Testing
# -----------------------------------------------------------------------------
test:
	@echo "==> Running pytest suite..."
	@if command -v pytest >/dev/null 2>&1; then \
		pytest -v Backend/tests; \
	elif docker ps -q -f name=videochat-backend | grep -q .; then \
		docker exec videochat-backend pytest -v /app/tests; \
	else \
		docker run --rm -v $(CURDIR)/Backend:/app -w /app python:3.11-slim sh -c \
			"pip install -q -r requirements.txt -r requirements-dev.txt && pytest -v tests"; \
	fi

# -----------------------------------------------------------------------------
# Linting
# -----------------------------------------------------------------------------
lint-python:
	@echo "==> Running Ruff Python linter..."
	@if command -v ruff >/dev/null 2>&1; then \
		ruff check Backend; \
	elif docker ps -q -f name=videochat-backend | grep -q .; then \
		docker exec videochat-backend ruff check /app; \
	else \
		docker run --rm -v $(CURDIR):/workspace -w /workspace python:3.11-slim sh -c \
			"pip install -q ruff && ruff check Backend"; \
	fi

lint-docker:
	@echo "==> Running Hadolint Dockerfile linter..."
	@docker run --rm \
		-v $(CURDIR)/.hadolint.yaml:/.config/hadolint.yaml \
		-v $(CURDIR)/Backend/Dockerfile:/Backend.Dockerfile \
		-v $(CURDIR)/video-qa-frontend/Dockerfile:/Frontend.Dockerfile \
		hadolint/hadolint hadolint /Backend.Dockerfile /Frontend.Dockerfile

lint: lint-python lint-docker
	@echo "==> All linters passed!"

# Full quality gate (runs tests and linters)
check: lint test
	@echo "==> All quality checks passed successfully!"

# -----------------------------------------------------------------------------
# Docker Compose Helpers
# -----------------------------------------------------------------------------
build:
	docker compose build

up:
	docker compose up -d

down:
	docker compose down -v

deploy:
	@bash scripts/deploy.sh $(or $(TAG),latest)

# -----------------------------------------------------------------------------
# Terraform Infrastructure Helpers
# -----------------------------------------------------------------------------
tf-init:
	cd infra && terraform init

tf-fmt:
	cd infra && terraform fmt -check

tf-validate:
	cd infra && terraform validate

tf-plan:
	cd infra && terraform plan

# -----------------------------------------------------------------------------
# Jenkins Automation Server Helpers
# -----------------------------------------------------------------------------
jenkins-up:
	docker compose -f docker-compose.jenkins.yml up -d --build

jenkins-down:
	docker compose -f docker-compose.jenkins.yml down

jenkins-logs:
	docker compose -f docker-compose.jenkins.yml logs -f

