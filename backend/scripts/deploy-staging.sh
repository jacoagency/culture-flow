#!/bin/bash

# CulturaFlow Staging Deployment Script
set -e

echo "🚀 Starting CulturaFlow Staging Deployment..."

# Load staging environment variables
if [ -f .env.staging ]; then
  export $(cat .env.staging | xargs)
else
  echo "⚠️  Warning: .env.staging file not found"
fi

# Check if required environment variables are set
if [[ -z "$DATABASE_URL" || -z "$REDIS_URL" || -z "$JWT_SECRET" ]]; then
  echo "❌ Error: Required environment variables are not set"
  echo "Please ensure DATABASE_URL, REDIS_URL, and JWT_SECRET are configured"
  exit 1
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p ./uploads ./logs

# Stop existing containers gracefully
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.staging.yml down --timeout 30

# Build and start services
echo "🏗️  Building and starting services..."
docker-compose -f docker-compose.staging.yml up -d --build

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
timeout=60
counter=0
while ! docker-compose -f docker-compose.staging.yml exec -T postgres pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB} >/dev/null 2>&1; do
  sleep 1
  counter=$((counter + 1))
  if [ $counter -eq $timeout ]; then
    echo "❌ Database failed to start within $timeout seconds"
    docker-compose -f docker-compose.staging.yml logs postgres
    exit 1
  fi
done

# Run database migrations
echo "🗄️  Running database migrations..."
docker-compose -f docker-compose.staging.yml exec -T app npm run migrate

# Seed database with test data
echo "🌱 Seeding database with test data..."
docker-compose -f docker-compose.staging.yml exec -T app npm run seed

# Health check
echo "🏥 Performing health checks..."
sleep 10
if curl -f http://localhost:3001/health >/dev/null 2>&1; then
  echo "✅ Staging backend health check passed"
else
  echo "❌ Staging backend health check failed"
  docker-compose -f docker-compose.staging.yml logs app
  exit 1
fi

# Display services status
echo "📊 Checking services status..."
docker-compose -f docker-compose.staging.yml ps

echo "🎉 Staging deployment completed successfully!"
echo "🌐 Staging API: http://localhost:3001"
echo "🗄️  Database: localhost:5433"
echo "🔴 Redis: localhost:6380"
echo ""
echo "📋 Useful commands:"
echo "  View logs: docker-compose -f docker-compose.staging.yml logs -f"
echo "  Stop services: docker-compose -f docker-compose.staging.yml down"
echo "  Restart services: docker-compose -f docker-compose.staging.yml restart"