# Multi-stage build for CulturaFlow Backend
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY src ./src
COPY prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install system dependencies for sharp and other native modules
RUN apk add --no-cache \
    libc6-compat \
    dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S culturaflow -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=culturaflow:nodejs /app/dist ./dist
COPY --from=builder --chown=culturaflow:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=culturaflow:nodejs /app/prisma ./prisma

# Create logs directory
RUN mkdir -p logs && chown -R culturaflow:nodejs logs

# Switch to non-root user
USER culturaflow

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"]