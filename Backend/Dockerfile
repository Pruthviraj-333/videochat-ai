# =============================================================================
# Backend Dockerfile — FastAPI + FastEmbed + Groq + Qdrant client
# =============================================================================
# We use python:3.11-slim to keep the image small.
# A non-root user (appuser) is created for security.
# The FastEmbed model is downloaded at BUILD time so the container starts
# instantly — no model download on every cold start.
# =============================================================================

# ── Stage: final image ────────────────────────────────────────────────────────
FROM python:3.11-slim

# Metadata labels (good practice, helps in registries)
LABEL maintainer="videochat-ai" \
      description="VideoChat AI FastAPI backend"

# --------------------------------------------------------------------------
# System deps: curl is needed for the HEALTHCHECK; gcc/g++ are needed by
# some Python wheels (qdrant-client's grpc extras, etc.)
# --------------------------------------------------------------------------
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl \
        gcc \
        g++ \
    && rm -rf /var/lib/apt/lists/*

# --------------------------------------------------------------------------
# Create a non-root user so the process does not run as root inside the
# container. This is a security best practice.
# --------------------------------------------------------------------------
RUN groupadd --system appgroup && \
    useradd  --system --gid appgroup --create-home appuser

WORKDIR /app

# --------------------------------------------------------------------------
# Install Python dependencies first (before copying source) so Docker can
# cache this layer — rebuilds are faster when only source files change.
# --------------------------------------------------------------------------
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# --------------------------------------------------------------------------
# Pre-download the FastEmbed model at BUILD time.
# This embeds the model weights inside the image so startup is instant.
# The model is stored in the default FastEmbed cache directory
# (~/.cache/fastembed) which becomes /home/appuser/.cache/fastembed after
# we chown below.
# --------------------------------------------------------------------------
RUN python -c "from fastembed import TextEmbedding; list(TextEmbedding(model_name='BAAI/bge-small-en-v1.5').embed(['warmup']))"

# --------------------------------------------------------------------------
# Copy application source code and transfer ownership to appuser
# --------------------------------------------------------------------------
COPY . .
RUN chown -R appuser:appgroup /app /home/appuser

# Switch to the non-root user for all subsequent commands and the runtime
USER appuser

# Expose the port FastAPI listens on
EXPOSE 8000

# --------------------------------------------------------------------------
# HEALTHCHECK — Docker will poll /health every 30 s.
# After 3 consecutive failures the container is marked "unhealthy".
# start-period gives the app time to load the model before checks start.
# --------------------------------------------------------------------------
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD ["curl", "-f", "http://localhost:8000/health"]

# --------------------------------------------------------------------------
# Run the application with uvicorn.
# --host 0.0.0.0 binds to all interfaces inside the container.
# Do NOT use `--reload` in production.
# --------------------------------------------------------------------------
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

