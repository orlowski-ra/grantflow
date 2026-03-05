# GrantFlow - Deployment Checklist

## Pre-Deployment (Local)

- [ ] All tests passing (`npm test`)
- [ ] TypeScript compilation (`npm run build`)
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] Seed data prepared

## Environment Setup

### Required Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/grantflow"

# Authentication (NextAuth)
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="https://your-domain.com"

# AI Services
GEMINI_API_KEY="AIzaSyBsqWZJZInQ3HRJ0VBflWLTrkypelXityc"

# Payments
PRZELEWY24_MERCHANT_ID=""
PRZELEWY24_API_KEY=""
PRZELEWY24_CRC=""

# Search
MEILISEARCH_HOST="http://localhost:7700"
MEILISEARCH_API_KEY=""

# Email
SENDGRID_API_KEY=""
EMAIL_FROM="noreply@grantflow.pl"

# Storage (optional)
AWS_S3_BUCKET=""
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
```

## VPS Setup

### 1. Server Requirements
- Ubuntu 22.04 LTS
- 2 vCPU, 4GB RAM (minimum)
- 40GB SSD
- Docker & Docker Compose installed

### 2. Initial Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin

# Install nginx
sudo apt install nginx

# Configure firewall
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### 3. SSL Certificate (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx

sudo certbot --nginx -d grantflow.pl -d www.grantflow.pl

# Auto-renewal test
sudo certbot renew --dry-run
```

## Deployment Steps

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/grantflow.git
cd grantflow
```

### 2. Configure Environment

```bash
cp .env.example .env
nano .env
# Fill in all required variables
```

### 3. Start Services

```bash
# Start database and search
docker-compose up -d db meilisearch

# Wait for services to be ready
sleep 10

# Run migrations
docker-compose run --rm app npx prisma migrate deploy

# Seed data (optional)
docker-compose run --rm app npx prisma db seed

# Build and start app
docker-compose up -d --build
```

### 4. Verify Deployment

```bash
# Check all services running
docker-compose ps

# Check logs
docker-compose logs -f app

# Test health endpoints
curl https://grantflow.pl/api/health
curl http://localhost:7700/health
```

## Post-Deployment

### 1. Initial Data Setup

```bash
# Create admin user
docker-compose exec app node scripts/create-admin.js

# Index grants in search
docker-compose exec app node scripts/sync-search.js

# Run initial scraping
docker-compose --profile scraping run --rm scraper
```

### 2. Monitoring Setup

```bash
# Install monitoring tools
sudo apt install htop iotop

# Set up log rotation
sudo nano /etc/logrotate.d/grantflow
```

### 3. Backup Configuration

```bash
# Database backup script
sudo nano /usr/local/bin/backup-grantflow.sh

# Add to crontab
crontab -e
# 0 2 * * * /usr/local/bin/backup-grantflow.sh
```

## Rollback Plan

If deployment fails:

```bash
# Stop services
docker-compose down

# Restore database from backup
docker-compose exec db psql -U postgres -d grantflow < backup.sql

# Start previous version
git checkout previous-tag
docker-compose up -d --build
```

## Troubleshooting

### Database connection issues
```bash
docker-compose logs db
docker-compose exec db pg_isready
```

### Build failures
```bash
# Clear build cache
docker-compose down
docker system prune -a
docker-compose up -d --build
```

### Performance issues
```bash
# Check resource usage
docker stats
htop
```

## Security Checklist

- [ ] Environment variables not in repository
- [ ] Database passwords strong and unique
- [ ] SSL certificates configured
- [ ] Firewall enabled
- [ ] Automatic security updates enabled
- [ ] Regular backups configured
- [ ] Admin panel protected
- [ ] Rate limiting enabled
- [ ] Input validation on all forms
- [ ] XSS protection enabled

## Maintenance Schedule

### Daily
- Check error logs
- Monitor uptime
- Review user registrations

### Weekly
- Update dependencies
- Review security alerts
- Backup verification

### Monthly
- Performance optimization
- Database cleanup
- User feedback review

### Quarterly
- Security audit
- Disaster recovery test
- Feature planning
