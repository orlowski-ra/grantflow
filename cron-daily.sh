#!/bin/bash
# Daily cron job for GrantFlow maintenance
# Add to crontab: 0 2 * * * /path/to/grantflow/cron-daily.sh

LOG_FILE="logs/cron-$(date +%Y%m%d).log"
mkdir -p logs

echo "$(date): Starting daily maintenance" >> $LOG_FILE

# Backup database
echo "$(date): Backing up database..." >> $LOG_FILE
docker-compose exec -T db pg_dump -U postgres grantflow > "backups/backup_$(date +%Y%m%d).sql" 2>> $LOG_FILE

# Sync search index
echo "$(date): Syncing search index..." >> $LOG_FILE
docker-compose exec -T app node scripts/sync-search.js >> $LOG_FILE 2>>&1 || true

# Run scrapers
echo "$(date): Running scrapers..." >> $LOG_FILE
docker-compose --profile scraping run --rm scraper >> $LOG_FILE 2>>&1 || true

# Clean old logs (keep 30 days)
echo "$(date): Cleaning old logs..." >> $LOG_FILE
find logs -name "cron-*.log" -mtime +30 -delete

# Clean old backups (keep 14 days)
echo "$(date): Cleaning old backups..." >> $LOG_FILE
find backups -name "backup_*.sql" -mtime +14 -delete

# Update npm packages (check only)
echo "$(date): Checking for package updates..." >> $LOG_FILE
npm outdated >> $LOG_FILE 2>>&1 || true

echo "$(date): Daily maintenance completed" >> $LOG_FILE
