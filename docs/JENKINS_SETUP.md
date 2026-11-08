# Jenkins CI/CD Setup & Operations Guide

This guide walks you through setting up, configuring, and operating the automated production CI/CD pipeline for **VideoChat AI** using Jenkins, Docker, Trivy, Docker Hub, and AWS EC2.

---

## Architecture Overview

```
                                      CI/CD Automation Pipeline
 ┌───────────────┐     ┌────────────────────────────────────────────────────────────────────────┐     ┌─────────────────────┐
 │ Git Push / PR │ ──> │ Jenkinsfile (Declarative Pipeline)                                     │ ──> │ Production EC2      │
 └───────────────┘     │                                                                        │     │ (100.53.110.63)     │
                       │ 1. Checkout SCM                                                        │     │                     │
                       │ 2. Linting (Parallel: Hadolint + Ruff)                                │     │ 1. SCP Compose &    │
                       │ 3. Automated Tests (pytest with mocked Groq & YouTube APIs)            │     │    deploy.sh        │
                       │ 4. Build Images (Tagged with build-${BUILD_NUMBER}-${GIT_SHA})         │     │ 2. Run deploy.sh    │
                       │ 5. Trivy Security Scan (Vulnerability audit for CVEs)                  │     │ 3. Poll /api/health │
                       │ 6. Push to Docker Hub (Tagged + :latest)                               │     │ 4. Auto-rollback if │
                       │ 7. Production Approval Gate (Manual confirmation in Jenkins UI)        │     │    healthcheck fails│
                       │ 8. SSH Deployment to EC2 with Automated Rollback                      │     └─────────────────────┘
                       └────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Quickstart: Launch Jenkins in Docker

We provide a pre-configured Docker Compose file that runs Jenkins LTS with Docker-in-Docker socket mounting:

```bash
# Start Jenkins in the background
docker compose -f docker-compose.jenkins.yml up -d

# Check startup status
docker compose -f docker-compose.jenkins.yml ps
```

### Retrieve Initial Administrator Password
```bash
docker exec videochat-jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

Open your browser to: **`http://localhost:8080`** and enter the password when prompted.

---

## 2. Required Jenkins Plugins

During the initial setup wizard, select **"Install suggested plugins"**. Afterwards, navigate to **Manage Jenkins > Plugins > Available plugins** and install:

1. **Pipeline** (`workflow-aggregator`) — Declarative pipeline support.
2. **SSH Agent Plugin** (`ssh-agent`) — Provides SSH key injection for EC2 deployment.
3. **Credentials Binding Plugin** (`credentials-binding`) — Binds Docker Hub tokens safely without leaking.
4. **AnsiColor** (`ansicolor`) — Formats colored console logs in the pipeline output.
5. **Docker Pipeline** (`docker-workflow`) — Enables native Docker execution within stages.

---

## 3. Configure Pipeline Credentials

Go to **Manage Jenkins > Credentials > System > Global credentials > Add Credentials**:

### Credential 1: Docker Hub Token
* **Kind:** Username with password
* **Scope:** Global
* **Username:** Your Docker Hub username (e.g. `mayur5942`)
* **Password:** Your Docker Hub Personal Access Token (create one at [hub.docker.com/settings/security](https://hub.docker.com/settings/security))
* **ID:** `docker-hub-credentials` *(Must match exactly)*
* **Description:** Docker Hub Registry Access Token

### Credential 2: EC2 SSH Private Key
* **Kind:** SSH Username with private key
* **Scope:** Global
* **ID:** `ec2-ssh-key` *(Must match exactly)*
* **Username:** `ubuntu`
* **Private Key:** Select **Enter directly** and paste the full contents of your `KEY-PAIR-VIRGINIA.pem` file.
* **Description:** AWS EC2 SSH Access Key for production deployment

---

## 4. Create the Pipeline Job

1. On the Jenkins home screen, click **New Item**.
2. Enter item name: `videochat-ai-pipeline`.
3. Select **Pipeline** and click **OK**.
4. Scroll down to the **Pipeline** configuration section:
   * **Definition:** *Pipeline script from SCM*
   * **SCM:** *Git*
   * **Repository URL:** `https://github.com/<YOUR_USER>/videochat-ai.git`
   * **Branch Specifier:** `*/main`
   * **Script Path:** `Jenkinsfile`
5. Click **Save**.

---

## 5. Pipeline Stages & Execution

Click **Build with Parameters** and inspect the configurable options:

| Parameter | Default | Description |
| :--- | :--- | :--- |
| `DOCKERHUB_USER` | `mayur5942` | Docker Hub username or organization namespace. |
| `EC2_HOST` | `100.53.43.88` | Public IP of the target EC2 instance. |
| `EC2_USER` | `ubuntu` | Remote SSH user. |
| `RUN_SECURITY_SCAN` | `true` | Run Trivy vulnerability audit on built container images. |
| `REQUIRE_MANUAL_APPROVAL` | `true` | Prompt for user confirmation in Jenkins UI before deploying to production. |

### Stage Breakdown:
1. **Checkout:** Checks out source code from Git and calculates short commit SHA.
2. **Lint & Static Analysis:** Runs Hadolint on Dockerfiles and Ruff on Python backend in parallel.
3. **Unit & Integration Tests:** Runs pytest inside an isolated container with mocked Groq and YouTube APIs. Archives test results as JUnit XML.
4. **Build Docker Images:** Builds backend and frontend images tagged with `build-<BUILD_NUMBER>-<SHA>` and `latest`.
5. **Security Scan (Trivy):** Scans images for HIGH and CRITICAL vulnerabilities.
6. **Push to Registry:** Authenticates with Docker Hub and pushes the versioned and latest images.
7. **Production Approval Gate:** If enabled, pauses pipeline and prompts: *"Promote release 'build-XX-xxxx' to Production EC2?"*.
8. **Deploy to Production EC2:**
   - Securely SSHs into the EC2 instance using `sshagent`.
   - Copies `docker-compose.yml` and `scripts/deploy.sh` to `/opt/videochat`.
   - Executes `./scripts/deploy.sh <TAG>`.
   - The script restarts containers and polls `http://localhost/api/health` for 60s.
   - If health checks fail, the script **automatically rolls back** to the previous version and fails the pipeline.

---

## 6. One-Time Setup on Production EC2

Before the first Jenkins run, ensure your target EC2 instance has the `.env` file configured with your secret Groq API key:

```bash
# SSH into your EC2 instance
ssh -i ~/.ssh/KEY-PAIR-VIRGINIA.pem ubuntu@100.53.43.88

# Create project directory and configure .env
sudo mkdir -p /opt/videochat
sudo chown -R ubuntu:ubuntu /opt/videochat
cd /opt/videochat

cat << 'EOF' > .env
GROQ_API_KEY=your_actual_groq_api_key_here
GROQ_MODEL=qwen/qwen3.8-27b
FRONTEND_PORT=80
EOF

chmod 600 .env
```

Now Jenkins can deploy continuously without needing to transmit your sensitive Groq API key over the network during CI/CD builds!

---

## 7. Troubleshooting FAQ

### Q: Docker socket permission denied inside Jenkins container
**Symptom:** `Got permission denied while trying to connect to the Docker daemon socket`.  
**Fix:** Ensure the Jenkins container runs as root or with access to the docker socket:
```bash
docker exec -u 0 videochat-jenkins chmod 666 /var/run/docker.sock
```

### Q: Host key verification failed during SSH deployment
**Fix:** The pipeline runs with `-o StrictHostKeyChecking=no` to prevent interactive prompts for dynamic cloud IP addresses.

### Q: Jenkins build fails with OOM (Out Of Memory)
**Fix:** Increase Docker Desktop memory limit to at least 4 GB to accommodate building the FastEmbed Python image and running Trivy scans simultaneously.

