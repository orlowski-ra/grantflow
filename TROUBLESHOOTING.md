# GrantFlow - Troubleshooting Guide

## Common Issues & Solutions

### 1. Database Connection Errors

**Symptom:**
```
Error: P1001: Can't reach database server
```

**Solutions:**

```bash
# Check if database is running
docker-compose ps

# Check database logs
docker-compose logs db

# Restart database
docker-compose restart db

# If all fails, reset (WARNING: data loss)
docker-compose down -v
docker-compose up -d db
npx prisma migrate deploy
```

### 2. Build Failures

**Symptom:**
```
Module not found
TypeScript compilation error
```

**Solutions:**

```bash
# Clear build cache
rm -rf .next
rm -rf node_modules
npm install
npm run build

# Or with Docker
docker-compose down
docker system prune -a
docker-compose up -d --build
```

### 3. PDF Generation Errors

**Symptom:**
```
Error filling PDF field
Invalid PDF structure
```

**Solutions:**

1. Verify PDF is not corrupted:
```bash
file document.pdf
```

2. Check field names match template
3. Ensure field is PDFTextField (not checkbox/button)
4. Try regenerating PDF from source

**Debug script:**
```typescript
// Add to your code temporarily
const form = pdfDoc.getForm()
const fields = form.getFields()
fields.forEach(field => {
  console.log(`${field.getName()}: ${field.constructor.name}`)
})
```

### 4. AI Generation Fails

**Symptom:**
```
Gemini API error: 429
AI Generation failed
```

**Solutions:**

1. Check API key is valid:
```bash
curl -H "Authorization: Bearer $GEMINI_API_KEY" \
  https://generativelanguage.googleapis.com/v1beta/models
```

2. Check rate limits (Gemini: 60 requests/min)
3. Verify budget in AICostTracker
4. Use fallback template:

```typescript
// In ai-generator.ts
private generateFallbackDescription(request): string {
  // Simple template-based fallback
  return `Projekt realizowany przez ${request.companyData.companyName} 
ma na celu rozwój w obszarze ${request.grantContext.category}.`
}
```

### 5. Search Not Working

**Symptom:**
Empty search results or timeout

**Solutions:**

```bash
# Check Meilisearch is running
curl http://localhost:7700/health

# Reindex grants
docker-compose exec app node scripts/sync-search.js

# Check index exists
curl http://localhost:7700/indexes/grants

# Reset search index (WARNING: requires reindex)
docker-compose restart meilisearch
docker-compose exec app node scripts/setup-meilisearch.js
docker-compose exec app node scripts/sync-search.js
```

### 6. Budget Validation Always Fails

**Symptom:**
All budget validations return errors

**Solutions:**

1. Check grant requirements are loaded:
```typescript
console.log('Grant:', await prisma.grant.findUnique({ where: { id } }))
```

2. Verify budget data structure:
```typescript
console.log('Budget:', JSON.stringify(budget, null, 2))
```

3. Check validation rules are not too strict

### 7. Environment Variables Not Loading

**Symptom:**
```
GEMINI_API_KEY is undefined
```

**Solutions:**

1. Check .env file exists:
```bash
ls -la .env
```

2. Verify variables are set:
```bash
cat .env | grep GEMINI
```

3. Restart dev server after changes
4. In Docker, rebuild after .env changes:
```bash
docker-compose down
docker-compose up -d --build
```

### 8. Payment Webhook Not Working

**Symptom:**
Payments not updating order status

**Solutions:**

1. Check webhook URL is publicly accessible:
```bash
curl -I https://your-domain.com/api/payments/webhook
```

2. Verify webhook signature in P24 panel
3. Check `PRZELEWY24_CRC` matches
4. Review webhook logs:
```bash
docker-compose logs app | grep webhook
```

### 9. Slow Performance

**Symptom:**
Page load > 3 seconds

**Solutions:**

1. Enable caching:
```typescript
// In API routes
export const revalidate = 60 // seconds
```

2. Check database queries:
```bash
# Enable query logging in Prisma
# Add to .env: DEBUG="prisma:query"
```

3. Optimize images:
```typescript
// Use Next.js Image component
import Image from 'next/image'
```

4. Check server resources:
```bash
htop
docker stats
```

### 10. Docker Issues

**Symptom:**
Containers won't start

**Solutions:**

```bash
# Reset everything
docker-compose down -v
docker system prune -a

# Rebuild from scratch
docker-compose up -d --build

# Check logs
docker-compose logs -f
```

## Getting Help

1. **Check logs first:**
```bash
docker-compose logs -f app
```

2. **Enable debug mode:**
```bash
DEBUG=* npm run dev
```

3. **Check documentation:**
- README.md
- API_DOCUMENTATION.md
- DEPLOYMENT_CHECKLIST.md

4. **Contact support:**
Email: dev@grantflow.pl

## Prevention

- Always backup before major changes
- Test in staging first
- Monitor logs regularly
- Keep dependencies updated
- Use strong passwords
- Enable 2FA where possible
