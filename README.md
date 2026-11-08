# VideoChat AI — Enterprise DevOps & Cloud Native RAG Platform

[![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![Terraform](https://img.shields.io/badge/Terraform-1.5+-844FBA?logo=terraform&logoColor=white)](https://www.terraform.io/)
[![AWS](https://img.shields.io/badge/AWS-Free--Tier-FF9900?logo=amazon-aws&logoColor=white)](https://aws.amazon.com/)
[![Jenkins](https://img.shields.io/badge/Jenkins-CI%2FCD-D24939?logo=jenkins&logoColor=white)](https://www.jenkins.io/)
[![Security](https://img.shields.io/badge/Security-Trivy--Gated-1904DA?logo=aquasec&logoColor=white)](https://trivy.dev/)
[![Code Quality](https://img.shields.io/badge/Linter-Ruff%20%7C%20Hadolint-brightgreen)](https://github.com/astral-sh/ruff)
[![Tests](https://img.shields.io/badge/Tests-10%20Passed-brightgreen)](https://docs.pytest.org/)

VideoChat AI is a production-grade, containerized Video Q&A platform powered by Retrieval-Augmented Generation (RAG). Users can ingest YouTube video URLs, paste raw transcripts directly, or upload audio recordings (`.mp3`, `.m4a`, `.wav`). The system automatically extracts, chunks, and indexes transcripts into a high-performance Qdrant vector database using pre-warmed FastEmbed embeddings, enabling context-grounded, low-latency conversational answers powered by Groq LLMs.

This repository features a complete, battle-tested DevOps engineering layer: multi-stage Docker builds, automated testing & linting gates (Ruff + Hadolint), Terraform AWS infrastructure, a declarative 8-stage Jenkins CI/CD pipeline with Trivy container security scanning, zero-downtime healthcheck rollback scripts, and dual HTTP/HTTPS Nginx reverse proxy routing.

---

## Live Production Deployment

* **Public Web URL (HTTP):** [http://100.53.110.63](http://100.53.110.63)
* **Public Web URL (HTTPS):** [https://100.53.110.63](https://100.53.110.63)
* **Mobile / Wildcard DNS:** [http://100.53.110.63.nip.io](http://100.53.110.63.nip.io)
* **Health Check API:** [http://100.53.110.63/api/health](http://100.53.110.63/api/health)

---

## Architecture

```mermaid
flowchart TD
    subgraph Client["External Users & Mobile Clients"]
        Browser["Desktop & Mobile Browsers (HTTP:80 & HTTPS:443)"]
    end

    subgraph AWS["AWS Cloud (us-east-1) — Dedicated VPC (10.0.0.0/16)"]
        subgraph PublicSubnet["Public Subnet (10.0.1.0/24)"]
            subgraph EC2["EC2 Instance (t3.micro — Free Tier + 2GB Swap)"]
                subgraph DockerStack["Docker Compose Isolated Bridge Network"]
                    Nginx["Nginx Reverse Proxy & Static Web (Port 80 & 443 SSL)"]
                    FastAPI["FastAPI Backend (Port 8000 — Non-Root appuser)"]
                    FastEmbed["FastEmbed ONNX Runtime (BAAI/bge-small-en-v1.5)"]
                    Qdrant["Qdrant Vector DB (v1.15.0 — Port 6333)"]
                    Volume[("Persistent Storage: videochat_qdrant_data")]
                end
            end
            SG["Security Group (Port 80 & 443: 0.0.0.0/0 | Port 22: Restricted)"]
        end
        CW["CloudWatch Alarms (CPU > 80% | Status Checks)"]
        IAM["IAM Instance Profile (SSM Session Manager)"]
    end

    subgraph Ingestion["Multi-Source Ingestion Pipeline"]
        Invidious["Free Invidious Rotating API Pool (Bypasses Cloud IP bans)"]
        GroqWhisper["Groq Whisper API (Speech-to-Text /process-audio)"]
        DirectPaste["Direct Text Paste (Instant Indexing)"]
    end

    subgraph ExternalServices["External Inference & APIs"]
        GroqLLM["Groq Cloud LLM (qwen/qwen3.8-27b)"]
    end

    subgraph CICD["CI/CD Automation Pipeline"]
        Git["GitHub Repository"] --> Jenkins["Jenkins CI/CD (Docker-in-Docker)"]
        Jenkins --> Tests["Pytest Suite (10 Tests) + Ruff + Hadolint"]
        Tests --> Build["Docker Build (Build ID & Git SHA)"]
        Build --> Trivy["Trivy Vulnerability Scan"]
        Trivy --> DockerHub["Docker Hub Registry"]
        DockerHub --> Approval["Manual Approval Gate"]
        Approval --> Deploy["SSH Deploy + Health Check + Auto-Rollback"]
        Deploy -.-> EC2
    end

    Browser -->|HTTP:80 & HTTPS:443| Nginx
    Nginx -->|Static React App & Assets| Browser
    Nginx -->|Proxy /api/*| FastAPI
    FastAPI <-->|Local ONNX Embeddings| FastEmbed
    FastAPI <-->|Vector Upsert & Cosine Retrieval| Qdrant
    Qdrant <--> Volume
    FastAPI --> Ingestion
    FastAPI -->|Query Context & Synthesize| GroqLLM
    EC2 --- IAM
    EC2 --- CW
```

---

## Tech Stack Overview

| Category | Technologies | Description & Production Highlights |
| :--- | :--- | :--- |
| **Frontend** | React 19, Vite, Tailwind CSS, Lucide | Modern 3-tab ingestion UI; dynamic 5-theme color grading engine; rich Markdown answer formatting; one-click copy actions; expandable Qdrant vector citation accordion. |
| **Backend** | Python 3.11, FastAPI, Uvicorn | High-throughput asynchronous REST API executing as unprivileged `appuser:appgroup`; models baked into container at build time. |
| **Multi-Source Ingestion** | Invidious Pool, Groq Whisper, Text Paste | Free rotating Invidious open-source API pool bypassing AWS/GCP datacenter IP blocks; Groq `whisper-large-v3` audio transcription pipeline; manual transcript paste. |
| **Vector DB** | Qdrant `v1.15.0` | Production vector database running on dedicated bridge network with persisted volume mounts and automated health checks. |
| **AI / RAG** | FastEmbed (`bge-small-en-v1.5`), Groq | Sub-15ms local ONNX vector embeddings coupled with high-token/sec Groq LLM inference (`qwen/qwen3.8-27b`). |
| **Containerization** | Docker, Docker Compose, Nginx | Multi-stage caching, non-root users, reverse proxy routing on ports 80 & 443 with SSL termination. |
| **Infrastructure** | Terraform (`>= 1.5.0`), AWS | Complete IaC setup: VPC, Subnet, IGW, Route Table, Security Group, IAM Role (SSM), EC2 `t3.micro`, CloudWatch alarms. |
| **CI / CD** | Jenkins (Declarative), Docker Hub | 8-stage automated pipeline: Checkout, Parallel Lint, Unit Tests, Image Build, Trivy Scan, Push, Approval, Deploy. |
| **Deployment** | Bash (`set -euo pipefail`), Docker Compose | Zero-downtime deployment script with automated 60s healthcheck polling and instant version rollback on failure. |
| **Quality & Security**| Ruff, Hadolint, pytest, Trivy | Zero-warning linting policy, container vulnerability gating, non-root execution, zero secrets in source. |

---

## Directory Structure

```text
videochat-ai/
├── .dockerignore                     # Root Docker build ignore exclusions
├── .env.example                      # Production environment template
├── .hadolint.yaml                    # Dockerfile linting configuration
├── docker-compose.yml                # Core multi-container application stack (Nginx, FastAPI, Qdrant)
├── docker-compose.jenkins.yml        # Self-hosted Jenkins automation server stack
├── Jenkinsfile                       # Declarative 8-stage CI/CD pipeline definition
├── Makefile                          # Unified build, test, lint, and deployment runner
├── ruff.toml                         # Python static analysis & linter configuration
│
├── Backend/                          # FastAPI Application & RAG Logic
│   ├── Dockerfile                    # Multi-stage hardened Python image with pre-warmed models
│   ├── main.py                       # REST API, Invidious pool, Whisper pipeline, Groq & Qdrant logic
│   ├── requirements.txt              # Production Python dependencies
│   ├── requirements-dev.txt          # Development, testing, and linting tools (pytest, ruff)
│   └── tests/                        # Comprehensive unit & integration test suite
│       └── test_api.py               # 10 automated test cases (health, validation, Invidious, RAG flow)
│
├── video-qa-frontend/                # React 19 Client
│   ├── Dockerfile                    # Multi-stage build (Node 20 builder -> Nginx Alpine runtime)
│   ├── nginx.conf                    # Nginx reverse proxy configuration for HTTP/HTTPS & SPA routing
│   ├── package.json                  # Frontend dependencies (React 19, Lucide, Tailwind)
│   └── src/                          # React application components & Theme Engine
│       ├── App.jsx                   # Main application, 3-tab ingestion, theme switcher, Markdown formatter
│       └── main.jsx                  # React DOM root entry point
│
├── infra/                            # Terraform Infrastructure as Code (AWS)
│   ├── main.tf                       # VPC, Subnet, IGW, Security Group, IAM Role, EC2, CloudWatch
│   ├── versions.tf                   # Terraform version locking & AWS provider configuration
│   ├── variables.tf                  # Parameterized configuration inputs
│   ├── outputs.tf                    # Operational outputs (IP, DNS, SSH string, App URL)
│   ├── user-data.sh                  # EC2 Cloud-Init (2GB swap, Docker CE, Compose, SSM Agent)
│   └── terraform.tfvars.example      # Example deployment overrides
│
├── jenkins/                          # Custom Jenkins Master Image
│   └── Dockerfile                    # Jenkins LTS with Docker CLI and socket permissions
│
├── scripts/                          # Automation & Operational Runbooks
│   ├── deploy.sh                     # Automated deployment with health polling & automatic rollback
│   ├── test.sh                       # Pytest execution script
│   ├── lint.sh                       # Linting runner for Ruff & Hadolint
│   └── run-checks.ps1                # Local Windows PowerShell quality gate runner
│
└── docs/                             # Engineering Runbooks & Interview Notes
    ├── JENKINS_SETUP.md              # Step-by-step Jenkins setup, credentials, and plugins guide
    └── INTERVIEW_NOTES.md            # Deep-dive DevOps architectural defense & decision logs
```

---

## Key Features & UI Capabilities

### 1. Multi-Source Ingestion Pipeline
* **YouTube Invidious Pool:** Automatically queries healthy open-source Invidious instances (`yt.chocolatemoo53.com`, `invidious.tiekoetter.com`) to extract clean WebVTT captions, completely bypassing AWS datacenter IP bans for free with zero API keys or cookies.
* **Direct Transcript Paste:** Instant indexing tab for arbitrary transcripts or lecture notes, completely offline and cloud-ban immune.
* **Audio Upload & Groq Whisper:** Dedicated tab allowing users to upload `.mp3`, `.m4a`, or `.wav` files (up to 25 MB). Transcribed using Groq `whisper-large-v3` API and indexed directly into Qdrant.

### 2. Interactive Theme Engine (5 Color Gradings)
Switch visual themes on the fly using the **Palette** switcher in the top navigation bar:
* 🟣 **Cyber Violet & Slate (Default):** High-tech dark mode inspired by Linear, Raycast, and Cursor.
* 🟢 **Emerald Matrix:** Deep obsidian with mint jade telemetry (Supabase / Bloomberg style).
* 🔵 **Nordic Frost & Royal Indigo:** Ultra-clean luxury light mode (Stripe / Vercel style).
* 🟠 **Sunset Espresso & Amber:** Warm charcoal obsidian with sunset amber highlights (Anthropic Claude style).
* 🌊 **Ocean Cyan:** Refreshing original cyan palette.

### 3. Structured Output & Context Citations
* **Markdown Formatting:** Headings (`#`, `##`, `###`), ordered numbered badge lists (`1`, `2`), custom bullet points, blockquotes, and inline monospace code chips.
* **Code Block Cards:** Syntax language indicators and dedicated one-click **"Copy code"** buttons.
* **One-Click Answer Copy:** Answer header includes a **"Copy"** button with animated `Copied!` feedback.
* **Qdrant Vector Citations Accordion:** Collapsible accordion displaying the exact text chunks and character lengths retrieved from Qdrant that grounded the LLM's response.

---

## Quickstart: Local Docker Deployment

### 1. Clone & Configure Environment
```bash
git clone https://github.com/Pruthviraj-333/videochat-ai.git
cd videochat-ai

# Copy environment template and insert your Groq API key
cp .env.example .env
```

Edit `.env`:
```ini
GROQ_API_KEY=gsk_your_groq_api_key_here
GROQ_MODEL=qwen/qwen3.8-27b
FRONTEND_PORT=3000
```

### 2. Launch Stack via Docker Compose
```bash
docker compose up -d --build
```

### 3. Verify Health & Access Application
```bash
# Verify running containers
docker compose ps

# Probe health endpoint
curl http://localhost:3000/api/health
```
Open **`http://localhost:3000`** in your browser.

---

## Testing & Quality Gates

This repository enforces strict, zero-warning quality standards across Python, Docker, and infrastructure.

```bash
# Run complete quality gate (linters + tests)
make check

# Or individually
make lint-python    # Ruff Python analysis (0 errors)
make lint-docker    # Hadolint Dockerfile analysis (0 warnings)
make test           # pytest suite (10/10 passed)
```

### Test Suite Summary (`Backend/tests/test_api.py`)
All 10 unit and integration tests run deterministically without external network dependencies:
1. `test_health_endpoint` — Validates health status, Qdrant connectivity, and FastEmbed loading.
2. `test_root_endpoint` — Validates root metadata endpoint.
3. `test_process_video_missing_payload` — Validates 422 HTTP validation on empty input.
4. `test_process_video_invalid_url` — Validates rejection of non-YouTube or malformed URLs.
5. `test_ask_missing_fields` — Validates schema rejection on missing question payloads.
6. `test_process_video_success_mocked` — Mocks direct YouTube transcript fetching, chunking, and Qdrant ingestion.
7. `test_process_video_with_custom_transcript` — Validates direct indexing of user-provided transcripts.
8. `test_process_video_invidious_success` — Validates automated Invidious proxy failover when YouTube blocks cloud IPs.
9. `test_process_video_ip_blocked_fallback` — Validates actionable user guidance prompt when all automated methods fail.
10. `test_ask_question_success_mocked` — Mocks Qdrant vector retrieval and Groq LLM completion.

---

## Infrastructure as Code (Terraform AWS)

The complete AWS infrastructure is defined in [`infra/`](file:///d:/videochat-ai/videochat-ai/infra) and strictly adheres to the **AWS Free Tier ($0/month)**.

### Provisioned Resources (13 Total)
1. **Networking:** Dedicated VPC (`10.0.0.0/16`), Internet Gateway, Public Subnet (`10.0.1.0/24`), Route Table.
2. **Security:** Security Group restricting SSH (Port 22) to developer workstation IP (`var.my_ip`), Port 80 (HTTP) and Port 443 (HTTPS) open publicly (`0.0.0.0/0`).
3. **Compute:** EC2 `t3.micro` instance (Ubuntu 22.04 LTS) with 30 GB encrypted `gp3` storage.
4. **Cloud-Init (`user-data.sh`):**
   * Allocates **2 GB swap file** (`vm.swappiness=10`) preventing OOM kernel panics on 1GB RAM instances.
   * Automatically installs Docker CE and the Docker Compose plugin.
   * Enables AWS Systems Manager (SSM) agent for zero-open-port management.
5. **IAM Role & Profile:** Grants `AmazonSSMManagedInstanceCore` and `CloudWatchAgentServerPolicy`.
6. **Observability:** 2 CloudWatch metric alarms monitoring high CPU (`>80%`) and hardware status checks.

### Deploying Infrastructure
```bash
cd infra
terraform init
terraform validate
terraform plan
terraform apply
```

To destroy resources and avoid charges when testing is finished:
```bash
terraform destroy -auto-approve
```

---

## Jenkins CI/CD Automation

A self-hosted Jenkins server definition is included to run the complete pipeline locally or on any server.

### 1. Launch Jenkins Server
```bash
make jenkins-up
```
Retrieve initial admin password:
```bash
docker exec videochat-jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```
Open **`http://localhost:8080`**.

### 2. Configure Credentials in Jenkins
* `docker-hub-credentials`: Username & Personal Access Token (Read & Write) for Docker Hub.
* `ec2-ssh-key`: SSH private key (`KEY-PAIR-VIRGINIA.pem`) with user `ubuntu`.

### 3. Pipeline Execution Flow
1. **Checkout SCM:** Pulls source code from GitHub `main`.
2. **Lint & Static Analysis:** Runs Hadolint and Ruff in parallel.
3. **Automated Tests:** Executes pytest suite inside `python:3.11-slim` and publishes JUnit reports.
4. **Build Images:** Tags images with `build-${BUILD_NUMBER}-${GIT_COMMIT}` and `latest`.
5. **Trivy Vulnerability Scan:** Scans images for HIGH and CRITICAL vulnerabilities.
6. **Push to Registry:** Authenticates with Docker Hub and pushes versioned images.
7. **Production Approval Gate:** Requires interactive confirmation in the Jenkins UI.
8. **Deploy to EC2:** Transfers compose files via SSH and executes `scripts/deploy.sh` with automated rollback.

*(For complete setup instructions, see [`docs/JENKINS_SETUP.md`](file:///d:/videochat-ai/videochat-ai/docs/JENKINS_SETUP.md))*

---

## Automated Deployment & Zero-Downtime Rollback

The production deployment runbook [`scripts/deploy.sh`](file:///d:/videochat-ai/videochat-ai/scripts/deploy.sh) features built-in health verification and automated rollback.

```bash
# Deploy a new release tag
./scripts/deploy.sh 1.0.4

# Or via Makefile
make deploy TAG=1.0.4
```

### Rollback Lifecycle:
1. **State Preservation:** Saves the previous stable version tag from `.current_version`.
2. **Atomic Up:** Exports `IMAGE_TAG` and restarts containers via `docker compose up -d --remove-orphans`.
3. **Health Check Polling:** Polls `http://localhost/api/health` every 5 seconds for up to 60 seconds (12 attempts).
4. **Success Path:** If health check returns HTTP 200, saves tag to `.current_version`, prunes dangling images, and exits 0.
5. **Automatic Rollback:** If health checks fail or time out after 60 seconds:
   * Reverts `IMAGE_TAG` to `PREVIOUS_TAG`.
   * Restarts containers with previous known-good images.
   * Verifies rolled-back health and exits with code 1, notifying Jenkins of deployment failure.

---

## Security & Hardening Highlights

* **Principle of Least Privilege:** Backend container drops root privileges and executes as non-root `appuser:appgroup`.
* **Zero Secrets in Code:** `GROQ_API_KEY` and AWS credentials are never committed; loaded strictly via environment variables.
* **IAM Instance Profiles:** EC2 accesses AWS services via STS temporary credentials; no long-lived AWS keys stored on the host.
* **AWS SSM Session Manager:** Instances can be managed with Port 22 completely closed.
* **Internal Network Isolation:** Database (Qdrant) and API (FastAPI) are not exposed to the public internet; accessible only internally via Nginx.
* **Continuous Vulnerability Auditing:** Trivy gates builds against critical OS and package vulnerabilities.
* **Dual Port HTTP/HTTPS:** Terminated at Nginx with TLS encryption, eliminating mobile browser `ERR_CONNECTION_TIMED_OUT` blocks.

---

## API Reference

### 1. Health Check
```http
GET /api/health
```
**Response (200 OK):**
```json
{
  "status": "healthy",
  "qdrant": "connected",
  "embedding_model": "loaded",
  "youtube_proxy_configured": false
}
```

### 2. Process Video or Paste Transcript
```http
POST /api/process-video
Content-Type: application/json

{
  "video_url": "https://www.youtube.com/watch?v=qAF1NjEVHhY",
  "transcript": "Optional user-pasted text..."
}
```
**Response (200 OK):**
```json
{
  "message": "Video processed successfully",
  "source_mode": "free_invidious_api",
  "video_id": "qAF1NjEVHhY",
  "chunks_created": 4,
  "transcript_length": 7417
}
```

### 3. Upload & Transcribe Audio (Groq Whisper)
```http
POST /api/process-audio
Content-Type: multipart/form-data

file: [binary audio file (.mp3, .m4a, .wav)]
video_url: "https://www.youtube.com/watch?v=..." (optional)
```
**Response (200 OK):**
```json
{
  "message": "Audio processed successfully",
  "video_id": "custom_audio_a1b2c3d4",
  "chunks_created": 3,
  "transcript_length": 4820
}
```

### 4. Ask Question
```http
POST /api/ask
Content-Type: application/json

{
  "video_url": "https://www.youtube.com/watch?v=qAF1NjEVHhY",
  "question": "What are the main concepts discussed?"
}
```
**Response (200 OK):**
```json
{
  "answer": "The video discusses ...",
  "relevant_chunks": [
    "Context chunk 1 from Qdrant vector retrieval...",
    "Context chunk 2 from Qdrant vector retrieval..."
  ]
}
```

---

## Engineering Runbooks & Interview Notes

For deep-dive architectural rationales, design trade-offs, and interview preparation notes, refer to:
* **[`docs/INTERVIEW_NOTES.md`](file:///d:/videochat-ai/videochat-ai/docs/INTERVIEW_NOTES.md)** — Architectural defense notes covering multi-stage caching, swap sizing, NAT gateway cost trade-offs, Invidious rotating proxy pool, Whisper audio pipelines, and mobile HTTPS timeouts.
* **[`docs/JENKINS_SETUP.md`](file:///d:/videochat-ai/videochat-ai/docs/JENKINS_SETUP.md)** — Complete guide for Jenkins automation, credentials configuration, and troubleshooting.
