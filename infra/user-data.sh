#!/usr/bin/env bash
# =============================================================================
# user-data.sh — EC2 Cloud-Init Boot Script
# =============================================================================
# Runs automatically as root on the first launch of the EC2 instance.
# Performs three critical production tasks:
# 1. Allocates a 2 GB swap file (essential for 1 GB RAM t3.micro free tier)
# 2. Installs Docker CE & Docker Compose plugin from official Docker repo
# 3. Configures AWS Systems Manager (SSM) and directory structure
# =============================================================================
set -euo pipefail

# Redirect stdout and stderr to syslog and user-data.log for debugging
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1

echo "==> [1/5] Starting EC2 initialization..."
export DEBIAN_FRONTEND=noninteractive

# -----------------------------------------------------------------------------
# 1. Create 2 GB Swap File
# -----------------------------------------------------------------------------
# WHY SWAP IS MANDATORY:
# AWS Free Tier t3.micro has only 1 GB RAM. When running Python with
# FastEmbed (embedding model) + Qdrant + React Nginx, memory spikes above 1 GB.
# Without swap, the Linux kernel OOM (Out Of Memory) killer kills Docker.
# 2 GB swap prevents crashes and guarantees stability.
# -----------------------------------------------------------------------------
echo "==> [2/5] Creating 2 GB swap file..."
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    # Persist swap across reboots
    echo '/swapfile none swap sw 0 0' >> /etc/fstab

    # Set swappiness low (10) so RAM is preferred, swap only used under pressure
    sysctl vm.swappiness=10
    echo 'vm.swappiness=10' >> /etc/sysctl.conf
    echo "Swap space created and enabled successfully:"
    free -h
fi

# -----------------------------------------------------------------------------
# 2. Install Docker CE and Docker Compose
# -----------------------------------------------------------------------------
echo "==> [3/5] Installing Docker and Docker Compose plugin..."
apt-get update -y
apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    jq

# Add Docker's official GPG key
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

# Add Docker repository to Apt sources
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update -y
apt-get install -y --no-install-recommends \
    docker-ce \
    docker-ce-cli \
    containerd.io \
    docker-buildx-plugin \
    docker-compose-plugin

# Enable and start Docker service
systemctl enable docker
systemctl start docker

# Allow 'ubuntu' default user to run Docker commands without sudo
usermod -aG docker ubuntu

# -----------------------------------------------------------------------------
# 3. AWS Systems Manager (SSM) Agent Check
# -----------------------------------------------------------------------------
# SSM allows managing the EC2 instance via AWS Console/CLI without open SSH ports
# -----------------------------------------------------------------------------
echo "==> [4/5] Ensuring Amazon SSM Agent is active..."
if command -v snap >/dev/null 2>&1; then
    snap install amazon-ssm-agent --classic || true
    systemctl enable snap.amazon-ssm-agent.amazon-ssm-agent.service || true
    systemctl start snap.amazon-ssm-agent.amazon-ssm-agent.service || true
fi

# -----------------------------------------------------------------------------
# 4. Create Application Workspace Directory
# -----------------------------------------------------------------------------
echo "==> [5/5] Creating application workspace at /opt/videochat..."
mkdir -p /opt/videochat
chown -R ubuntu:ubuntu /opt/videochat

echo "==> EC2 User Data initialization completed successfully at $(date)!"

