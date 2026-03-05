# GrantFlow - API Documentation

## Base URL
```
https://api.grantflow.pl/v1
```

## Authentication

All requests require Bearer token:
```
Authorization: Bearer {your_jwt_token}
```

## Endpoints

### Grants

#### List Grants
```http
GET /grants
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 20, max: 100) |
| category | string | Filter by category |
| region | string | Filter by region |
| minAmount | number | Minimum grant amount |
| maxAmount | number | Maximum grant amount |
| search | string | Search query |
| sortBy | string | Sort field (deadline, amount, createdAt) |
| sortOrder | string | asc or desc |

**Response:**
```json
{
  "grants": [
    {
      "id": "uuid",
      "title": "Grant Title",
      "slug": "grant-title",
      "amountMin": 50000,
      "amountMax": 500000,
      "deadline": "2024-06-30T23:59:59Z",
      "category": "IT",
      "region": "Mazowieckie",
      "sourceName": "PARP"
    }
  ],
  "total": 150,
  "page": 1,
  "pages": 8
}
```

#### Get Grant Details
```http
GET /grants/{id}
```

**Response:**
```json
{
  "id": "uuid",
  "title": "Grant Title",
  "description": "Full description...",
  "amountMin": 50000,
  "amountMax": 500000,
  "fundingRate": 50,
  "deadline": "2024-06-30T23:59:59Z",
  "requirements": "Requirements...",
  "documents": [
    {
      "name": "Wniosek",
      "template": "https://..."
    }
  ],
  "sourceName": "PARP",
  "sourceUrl": "https://..."
}
```

### Budget

#### Validate Budget
```http
POST /budget/validate
```

**Request Body:**
```json
{
  "grantId": "uuid",
  "budget": {
    "items": [
      {
        "name": "Personnel",
        "cost": 100000,
        "category": "personnel",
        "eligible": true,
        "vatRate": 0
      }
    ],
    "totalCost": 200000,
    "eligibleCost": 200000,
    "grantAmount": 100000,
    "ownContribution": 100000
  }
}
```

**Response:**
```json
{
  "success": true,
  "validation": {
    "isValid": true,
    "errors": [],
    "warnings": [],
    "summary": {
      "totalChecks": 7,
      "passedChecks": 7,
      "failedChecks": 0
    }
  }
}
```

### Form Filler

#### Fill PDF Form
```http
POST /forms/fill
```

**Request Body:**
```json
{
  "grantId": "uuid",
  "companyData": {
    "companyName": "Firma Sp. z o.o.",
    "nip": "1234567890",
    "regon": "123456789",
    "street": "ul. Testowa 1",
    "city": "Warszawa",
    "postalCode": "00-001",
    "email": "kontakt@firma.pl",
    "phone": "123456789"
  }
}
```

**Response:**
```json
{
  "success": true,
  "pdfUrl": "https://storage.../filled-form.pdf",
  "filledFields": ["nazwa", "nip", "regon"],
  "skippedFields": [],
  "confidenceScore": 0.95
}
```

### AI Text Generation

#### Generate Project Description
```http
POST /ai/generate
```

**Request Body:**
```json
{
  "fieldType": "project_description",
  "grantId": "uuid",
  "tone": "formal"
}
```

**Response:**
```json
{
  "text": "Generated project description...",
  "costEstimate": 0.05,
  "variants": [
    "Variant 1...",
    "Variant 2...",
    "Variant 3..."
  ]
}
```

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Invalid or missing token |
| 404 | Not Found - Resource doesn't exist |
| 422 | Validation Error - Invalid data |
| 429 | Rate Limited - Too many requests |
| 500 | Server Error - Internal error |

## Rate Limits

- Free tier: 100 requests/hour
- Basic tier: 1000 requests/hour
- Pro tier: 10000 requests/hour

## SDKs

### JavaScript/TypeScript
```bash
npm install @grantflow/sdk
```

```typescript
import { GrantFlow } from '@grantflow/sdk'

const client = new GrantFlow({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.grantflow.pl/v1'
})

const grants = await client.grants.list({
  category: 'IT',
  region: 'Mazowieckie'
})
```

### Python
```bash
pip install grantflow
```

```python
from grantflow import GrantFlow

client = GrantFlow(api_key='your-api-key')

grants = client.grants.list(
    category='IT',
    region='Mazowieckie'
)
```

## Webhooks

Subscribe to events:

```http
POST /webhooks
{
  "url": "https://your-app.com/webhook",
  "events": ["grant.new", "order.completed"]
}
```

Events:
- `grant.new` - New grant added
- `grant.updated` - Grant information updated
- `order.created` - New order placed
- `order.completed` - Order fulfilled

## Support

- Documentation: https://docs.grantflow.pl
- Support: api@grantflow.pl
- Status: https://status.grantflow.pl
