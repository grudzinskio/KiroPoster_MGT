# Multi-stage Docker build for production optimization

# Build stage for backend
FROM node:18-alpine AS backend-builder

WORKDIR /app/backend

# Copy package files
COPY backend/package*.json ./
COPY backend/tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY backend/src ./src
COPY backend/knexfile.ts ./

# Build the application
RUN npm run build

# Build stage for frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files
COPY frontend/package*.json ./
COPY frontend/tsconfig*.json ./
COPY frontend/vite.config.ts ./
COPY frontend/tailwind.config.js ./
COPY frontend/postcss.config.js ./
COPY frontend/index.html ./

# Install dependencies
RUN npm ci && npm cache clean --force

# Copy source code
COPY frontend/src ./src
COPY frontend/public ./public

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy backend build and dependencies
COPY --from=backend-builder --chown=nodejs:nodejs /app/backend/dist ./backend/dist
COPY --from=backend-builder --chown=nodejs:nodejs /app/backend/node_modules ./backend/node_modules
COPY --from=backend-builder --chown=nodejs:nodejs /app/backend/package.json ./backend/
COPY --from=backend-builder --chown=nodejs:nodejs /app/backend/knexfile.js ./backend/

# Copy frontend build
COPY --from=frontend-builder --chown=nodejs:nodejs /app/frontend/dist ./frontend/dist

# Create necessary directories
RUN mkdir -p /var/lib/poster-campaign/uploads && \
    mkdir -p /var/log/poster-campaign && \
    chown -R nodejs:nodejs /var/lib/poster-campaign && \
    chown -R nodejs:nodejs /var/log/poster-campaign

# Switch to non-root user
USER nodejs

# Expose ports
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Set environment
ENV NODE_ENV=production
ENV PORT=3001

# Start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "backend/dist/index.js"]