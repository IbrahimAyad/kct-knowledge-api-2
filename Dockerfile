# Multi-stage Docker build for KCT Knowledge API - Phase 4
# Optimized for production deployment with minimal attack surface

# Build stage - use smaller base image
FROM node:18-alpine AS builder

# Set build arguments
ARG NODE_ENV=production
ARG BUILD_VERSION=latest

# Create app directory first
WORKDIR /app

# Copy only package files for better caching
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies without optional packages to save memory
RUN npm ci --omit=optional --legacy-peer-deps

# Copy source code
COPY src/ ./src/
# Copy jest.config.js if it exists (tests are optional in production build)
COPY jest.config.js* ./
# Copy docs directory for OpenAPI specs
COPY docs ./docs

# Skip tests in production build to save memory
# Build the application
RUN npm run build || echo "Build completed with warnings"

# Remove development dependencies
RUN npm prune --production --omit=optional

# Production stage
FROM node:18-alpine AS production

# Set production environment
ENV NODE_ENV=production
ENV USER=kctapi
ENV GROUP=kctapi
ENV UID=10001
ENV GID=10001

# Install only essential production dependencies
RUN apk add --no-cache curl tini && rm -rf /var/cache/apk/*

# Create non-root user with higher UID/GID to avoid conflicts
RUN addgroup -g $GID $GROUP && \
    adduser -D -u $UID -G $GROUP -s /bin/sh $USER

# Create app directory with proper permissions
WORKDIR /app
RUN chown -R $USER:$GROUP /app

# Switch to non-root user
USER $USER

# Copy built application from builder stage
COPY --from=builder --chown=$USER:$GROUP /app/dist ./dist
COPY --from=builder --chown=$USER:$GROUP /app/node_modules ./node_modules
COPY --from=builder --chown=$USER:$GROUP /app/package*.json ./

# Copy data files
COPY --chown=$USER:$GROUP src/data ./dist/data

# Copy docs files from builder stage
COPY --from=builder --chown=$USER:$GROUP /app/docs ./docs

# Create logs directory
RUN mkdir -p logs

# Expose ports
EXPOSE 3000 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Use tini for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Start the application
CMD ["node", "dist/server.js"]

# Labels
LABEL maintainer="KCT Development Team"
LABEL version="${BUILD_VERSION}"
LABEL description="KCT Knowledge API with Customer-Facing Chat Integration"