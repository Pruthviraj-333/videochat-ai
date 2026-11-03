# =============================================================================
# jenkins/Dockerfile — Custom Jenkins Master with Docker CLI Support
# =============================================================================
# Extends official Jenkins LTS image to include the Docker CLI client.
# When /var/run/docker.sock is mounted, Jenkins can build, run, and push
# containers directly on the host Docker daemon.
# =============================================================================
FROM jenkins/jenkins:lts-jdk17

USER root

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# Install Docker CLI dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    && install -m 0755 -d /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg \
    && chmod a+r /etc/apt/keyrings/docker.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null \
    && apt-get update \
    && apt-get install -y --no-install-recommends docker-ce-cli \
    && rm -rf /var/lib/apt/lists/*

# Add jenkins user to docker group
RUN groupadd -f docker && usermod -aG docker jenkins

USER jenkins
