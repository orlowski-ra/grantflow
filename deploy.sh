#!/bin/bash
# Auto-deployment script for GrantFlow
# Usage: ./deploy.sh [environment]
# Environments: staging, production

ENV=${1:-staging}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "🚀 GrantFlow Deployment"
echo "======================="
echo "Environment: $ENV"
echo "Timestamp: $TIMESTAMP"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Error handling
set -e
trap 'echo -e "${RED}❌ Deployment failed${NC}"' ERR

# Pre-deployment checks
echo "📋 Running pre-deployment checks..."

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}Error: docker-compose.yml not found${NC}"
    echo "Run this script from the grantflow directory"
    exit 1
fi

# Check environment file
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Warning: .env file not found${NC}"
    echo "Creating from template..."
    cp .env.example .env
    echo -e "${YELLOW}Please edit .env file before deploying${NC}"
    exit 1
fi

# Backup database
echo "💾 Creating database backup..."
if docker-compose ps | grep -q "db"; then
    docker-compose exec -T db pg_dump -U postgres grantflow > "backups/backup_${TIMESTAMP}.sql"
    echo -e "${GREEN}✅ Backup created: backups/backup_${TIMESTAMP}.sql${NC}"
else
    echo -e "${YELLOW}⚠️  Database not running, skipping backup${NC}"
fi

# Pull latest code
echo "📥 Pulling latest code..."
git pull origin main

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Run tests
echo "🧪 Running tests..."
npm test
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Tests failed. Deployment aborted.${NC}"
    exit 1
fi

# Build application
echo "🏗️  Building application..."
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed. Deployment aborted.${NC}"
    exit 1
fi

# Database migrations
echo "🗄️  Running database migrations..."
docker-compose run --rm app npx prisma migrate deploy

# Deploy
echo "🚀 Deploying..."
if [ "$ENV" = "production" ]; then
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
else
    docker-compose up -d --build
fi

# Health check
echo "🏥 Running health checks..."
sleep 10

HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health)
if [ "$HEALTH_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Application is healthy${NC}"
else
    echo -e "${RED}❌ Health check failed (status: $HEALTH_STATUS)${NC}"
    exit 1
fi

# Cleanup old backups (keep last 10)
echo "🧹 Cleaning up old backups..."
ls -t backups/backup_*.sql | tail -n +11 | xargs rm -f

# Post-deployment tasks
echo "📊 Running post-deployment tasks..."

# Reindex search if needed
docker-compose exec -T app node scripts/sync-search.js || true

# Clear cache
docker-compose exec -T app rm -rf .next/cache || true

# Send notification (optional)
if [ -n "$SLACK_WEBHOOK_URL" ]; then
    curl -X POST -H 'Content-type: application/json' \
        --data '{"text":"✅ GrantFlow deployed to '$ENV'"}' \
        $SLACK_WEBHOOK_URL
fi

echo ""
echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo ""
echo "Environment: $ENV"
echo "Timestamp: $TIMESTAMP"
echo "Health Check: http://localhost:3000/api/health"
echo ""
echo "Logs: docker-compose logs -f"
