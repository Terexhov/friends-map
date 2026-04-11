# ── Stage 1: build React frontend ─────────────────────────────────────────────
FROM node:22-alpine AS frontend-builder

WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ── Stage 2: production image ──────────────────────────────────────────────────
FROM node:22-alpine

WORKDIR /app

# Backend dependencies (production only)
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev

# Backend source
COPY backend/ ./backend/

# Built frontend
COPY --from=frontend-builder /build/frontend/dist ./frontend/dist

# Persistent volume will be mounted at /data by Fly
ENV DATA_DIR=/data
ENV NODE_ENV=production

EXPOSE 8080
ENV PORT=8080

CMD ["node", "backend/server.js"]
