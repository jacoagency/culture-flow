#!/bin/bash

# CulturaFlow Production Deployment Script
set -e

echo "🚀 Starting CulturaFlow Production Deployment..."

# Check if required environment variables are set
if [[ -z "$DATABASE_URL" || -z "$REDIS_URL" || -z "$JWT_SECRET" ]]; then
  echo "❌ Error: Required environment variables are not set"
  echo "Please ensure DATABASE_URL, REDIS_URL, and JWT_SECRET are configured"
  exit 1
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p ./uploads ./logs ./ssl

# Set proper permissions
chmod 755 ./uploads ./logs
chmod 700 ./ssl

# Pull latest images if using external registry
echo "📦 Pulling latest images..."
docker-compose -f docker-compose.production.yml pull

# Stop existing containers gracefully
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.production.yml down --timeout 30

# Remove old volumes if needed (uncomment for fresh start)
# echo "🧹 Cleaning up old data..."
# docker volume prune -f

# Build and start services
echo "🏗️  Building and starting services..."
docker-compose -f docker-compose.production.yml up -d --build

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
timeout=60
counter=0
while ! docker-compose -f docker-compose.production.yml exec -T postgres pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB} >/dev/null 2>&1; do
  sleep 1
  counter=$((counter + 1))
  if [ $counter -eq $timeout ]; then
    echo "❌ Database failed to start within $timeout seconds"
    docker-compose -f docker-compose.production.yml logs postgres
    exit 1
  fi
done

# Run database migrations
echo "🗄️  Running database migrations..."
docker-compose -f docker-compose.production.yml exec -T app npm run migrate

# Run database seeding (optional)
if [ "$1" = "--seed" ]; then
  echo "🌱 Seeding database..."
  docker-compose -f docker-compose.production.yml exec -T app npm run seed
fi

# Health check
echo "🏥 Performing health checks..."
sleep 10
if curl -f http://localhost:3000/health >/dev/null 2>&1; then
  echo "✅ Backend health check passed"
else
  echo "❌ Backend health check failed"
  docker-compose -f docker-compose.production.yml logs app
  exit 1
fi

# Check all services status
echo "📊 Checking services status..."
docker-compose -f docker-compose.production.yml ps

# Display logs
echo "📝 Recent logs:"
docker-compose -f docker-compose.production.yml logs --tail=50

echo "🎉 Production deployment completed successfully!"
echo "🌐 Backend API: http://localhost:3000"
echo "🗄️  Database: localhost:5432"
echo "🔴 Redis: localhost:6379"
echo ""
echo "📋 Useful commands:"
echo "  View logs: docker-compose -f docker-compose.production.yml logs -f"
echo "  Stop services: docker-compose -f docker-compose.production.yml down"
echo "  Restart services: docker-compose -f docker-compose.production.yml restart"
echo "  Execute command: docker-compose -f docker-compose.production.yml exec app <command>"