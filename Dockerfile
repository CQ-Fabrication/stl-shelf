# Multi-stage build for STL Shelf
FROM oven/bun:1-alpine AS base
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache git git-lfs

# Copy package files
COPY package.json bun.lock* ./
COPY apps/server/package.json ./apps/server/
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN bun install --frozen-lockfile

# Build stage
FROM base AS build
WORKDIR /app

# Copy source code
COPY . .

# Build applications
RUN bun run build

# Production stage
FROM oven/bun:1-alpine AS production
WORKDIR /app

# Install system dependencies including Git LFS
RUN apk add --no-cache \
    git \
    git-lfs \
    ca-certificates \
    && git lfs install --system

# Create app user
RUN addgroup -g 1001 -S stlshelf && \
    adduser -S stlshelf -u 1001

# Copy built applications
COPY --from=build --chown=stlshelf:stlshelf /app/apps/server/dist ./apps/server/dist
COPY --from=build --chown=stlshelf:stlshelf /app/apps/web/dist ./apps/web/dist
COPY --from=build --chown=stlshelf:stlshelf /app/node_modules ./node_modules
COPY --from=build --chown=stlshelf:stlshelf /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=build --chown=stlshelf:stlshelf /app/package.json ./

# Create data directory
RUN mkdir -p /data && chown stlshelf:stlshelf /data

# Switch to non-root user
USER stlshelf

# Set environment variables
ENV NODE_ENV=production
ENV DATA_DIR=/data
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun --version || exit 1

# Start the application
CMD ["bun", "run", "apps/server/dist/index.js"]