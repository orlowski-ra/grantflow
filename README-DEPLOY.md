# GrantFlow - Deployment Guide

## 🎯 Quick Start (5 minutes)

```bash
# 1. Clone and enter directory
cd grantflow

# 2. Configure environment
cp .env.example .env
nano .env  # Fill in your values

# 3. Deploy
chmod +x deploy.sh
./deploy.sh
```

## 📋 Pre-deployment Checklist

- [ ] VPS with Ubuntu 22.04 LTS (Hetzner CX21 recommended: 2vCPU, 4GB RAM)
- [ ] Domain pointed to VPS IP
- [ ] Docker & Docker Compose installed
- [ ] Ports 80, 443 open in firewall

## 🔧 Infrastructure Requirements

### Minimum (1000 users/month)
- **CPU**: 2 cores
- **RAM**: 4GB
- **Storage**: 40GB SSD
- **Bandwidth**: 2TB/month
- **Cost**: ~45 PLN/month (Hetzner)

### Recommended (10k users/month)
- **CPU**: 4 cores
- **RAM**: 8GB
- **Storage**: 80GB SSD
- **Bandwidth**: 5TB/month
- **Cost**: ~120 PLN/month

## 🗂️ Project Structure

```
grantflow/
├── docker-compose.yml      # Infrastructure definition
├── deploy.sh               # One-command deployment
├── .env.example            # Configuration template
├── prisma/
│   └── schema.prisma       # Database schema
├── src/
│   ├── app/                # Next.js 14 App Router
│   │   ├── api/            # API Routes
│   │   │   ├── grants/     # Grant search API
│   │   │   ├── orders/     # Orders & Payments
│   │   │   └── auth/       # Authentication
│   │   ├── page.tsx        # Landing page
│   │   └── grants/         # Grant pages
│   ├── components/         # React components
│   │   ├── grants/         # GrantCard, GrantList
│   │   ├── ui/             # shadcn/ui components
│   │   └── payments/       # Payment forms
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utilities
│   │   ├── api/            # API clients
│   │   ├── payments/       # P24, Open Banking
│   │   ├── search/         # Meilisearch
│   │   └── scraping/       # Data extraction
│   └── types/              # TypeScript types
├── scrapers/               # Python Scrapy spiders
│   └── spiders/
│       ├── parp_spider.py
│       ├── eu_funds_spider.py
│       └── regional_spiders.py
└── nginx/                  # Nginx configuration
    └── nginx.conf
```

## 💳 Payment Configuration

### Option 1: Przelewy24 (Traditional)
1. Register at https://www.przelewy24.pl/
2. Get Merchant ID, API Key, CRC
3. Add to `.env`
4. Configure webhook URL: `https://yourdomain.com/api/payments/webhook`

### Option 2: Open Banking (AIS/PIS)
1. Register with PolishAPI provider (e.g., KIR, ING)
2. Get OAuth2 credentials
3. Add to `.env`
4. Test with sandbox first

## 🔍 Search Engine Setup

Meilisearch is included in docker-compose. After first deploy:

```bash
# Create indexes
docker-compose exec app node scripts/setup-meilisearch.js

# Sync existing grants
docker-compose exec app node scripts/sync-search.js
```

## 📊 Database Migrations

```bash
# Create migration after schema change
docker-compose run --rm app npx prisma migrate dev --name add_feature

# Deploy to production
docker-compose run --rm app npx prisma migrate deploy

# View database
docker-compose exec db psql -U postgres -d grantflow
```

## 🕷️ Scraping Data

```bash
# Run all spiders
docker-compose --profile scraping run --rm scraper

# Run specific spider
docker-compose --profile scraping run --rm scraper scrapy crawl parp

# Schedule daily scraping (add to crontab)
0 2 * * * cd /path/to/grantflow && docker-compose --profile scraping run --rm scraper
```

## 🔒 SSL Certificate (Let's Encrypt)

```bash
# Install certbot
apt install certbot

# Generate certificate
certbot certonly --webroot -w ./certbot/www -d grantflow.pl -d www.grantflow.pl

# Certificates will be at:
# /etc/letsencrypt/live/grantflow.pl/

# Auto-renewal is handled by certbot timer
```

## 📈 Monitoring

### Logs
```bash
# View all logs
docker-compose logs -f

# View specific service
docker-compose logs -f app

# View errors only
docker-compose logs -f app | grep ERROR
```

### Health Checks
- App: `https://grantflow.pl/api/health`
- Database: `docker-compose exec db pg_isready`
- Search: `curl http://localhost:7700/health`

## 🚨 Troubleshooting

### Database connection failed
```bash
# Check if database is running
docker-compose ps

# Check logs
docker-compose logs db

# Reset database (WARNING: deletes data!)
docker-compose down -v
docker-compose up -d db
```

### Payment webhook not working
1. Check URL is publicly accessible
2. Verify webhook signature in logs
3. Ensure `PRZELEWY24_CRC` matches P24 panel

### Search not returning results
```bash
# Reindex
docker-compose exec app node scripts/sync-search.js

# Check Meilisearch
curl http://localhost:7700/indexes/grants/stats
```

## 🔄 Updates

```bash
# Pull latest code
git pull origin main

# Rebuild and deploy
docker-compose build app
docker-compose up -d app

# Run migrations if needed
docker-compose run --rm app npx prisma migrate deploy
```

## 📞 Support

For issues:
1. Check logs: `docker-compose logs -f`
2. Review documentation: `/docs`
3. Contact: dev@grantflow.pl

## 📜 License

Proprietary - All rights reserved.