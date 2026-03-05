#!/bin/bash
# GrantFlow - Quick Setup Script
# Run this after cloning the repository

echo "🚀 GrantFlow Quick Setup"
echo "========================"

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose not found. Please install Docker Compose"
    exit 1
fi

echo "✅ Prerequisites check passed"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Setup environment
echo "🔧 Setting up environment..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created .env file from template"
    echo "⚠️  Please edit .env and add your API keys"
else
    echo "✅ .env file already exists"
fi

# Start database and search
echo "🐳 Starting infrastructure..."
docker-compose up -d db meilisearch

# Wait for services
echo "⏳ Waiting for services to be ready..."
sleep 10

# Setup database
echo "🗄️  Setting up database..."
npx prisma migrate dev --name init

# Seed data (optional)
read -p "🌱 Seed database with sample data? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npx prisma db seed
    echo "✅ Database seeded"
fi

# Build application
echo "🏗️  Building application..."
npm run build

# Start development server
echo "🚀 Starting development server..."
echo ""
echo "✨ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your API keys"
echo "2. Run: npm run dev"
echo "3. Open: http://localhost:3000"
echo ""
echo "Documentation: README.md"
echo ""
