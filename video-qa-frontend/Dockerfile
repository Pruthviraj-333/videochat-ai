# =============================================================================
# Frontend Dockerfile — React 19 + Vite  →  Nginx static server
# =============================================================================
# Multi-stage build:
#   Stage 1 (builder): Node.js compiles the React app with `vite build`.
#   Stage 2 (runtime): Nginx serves ONLY the compiled static files.
#
# Why multi-stage?
#   The final image contains zero Node.js, zero npm packages, zero source code.
#   This makes it tiny (~25 MB vs ~400 MB for a Node image) and far more secure.
# =============================================================================

# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

# Copy package manifests first so npm ci is cached unless deps change
COPY package.json package-lock.json ./

# `npm ci` installs exactly what is in the lockfile — reproducible builds
RUN npm ci

# Copy source code and build
COPY . .

# VITE_API_URL is intentionally NOT set here — the default /api relative
# path in App.jsx works with the Nginx proxy at runtime without rebuilding.
RUN npm run build
# After this step, /app/dist/ contains the compiled static files.


# ── Stage 2: Runtime (Nginx) ──────────────────────────────────────────────────
FROM nginx:1.27-alpine

# Remove the default Nginx config and replace with ours
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the compiled React app from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx listens on port 80
EXPOSE 80

# Nginx foreground mode (required for Docker — daemons are not allowed)
CMD ["nginx", "-g", "daemon off;"]

