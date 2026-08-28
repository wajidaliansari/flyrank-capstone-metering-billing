# flyrank-capstone-metering-billing
Usage metering and billing engine for SaaS subscriptions


# Flyrank Capstone: Usage Metering & Billing Engine

A production-ready billing system that handles SaaS subscription management with idempotent metering, quota enforcement, Stripe integration, and accurate token-based pricing.

## Features

### ✅ Phase 1: Design
- Database schema with proper indexing
- Two subscription tiers (Free & Pro)
- API contract documentation

### ✅ Phase 2: Idempotent Metering & Quotas
- **Idempotent requests**: Same request + same key = same response, no duplicates
- **Quota enforcement**: Returns 429 when limit exceeded
- Separate limits for API calls and AI tokens
- Monthly rolling quotas

### ✅ Phase 3: Stripe Integration
- Mock Stripe checkout flow (ready for real Stripe keys)
- Webhook handlers for subscription events
- Webhook deduplication (no double-processing)
- Plan upgrades via webhooks (Free → Pro)

### ✅ Phase 4: Accurate Pricing
- Token-based cost calculation
- Support for 5 usage types:
  - API calls: $0.001 per call
  - Input tokens: $0.0001 per token
  - Cached input tokens: $0.00005 per token (50% discount)
  - Output tokens: $0.0003 per token
  - Reasoning tokens: $0.0003 per token
- Cost breakdown by type
- Monthly usage rollup

## Setup

### Requirements
- Node.js 18+
- SQLite 3

### Installation

```bash
# Clone repository
git clone https://github.com/wajidaliansari/flyrank-capstone-metering-billing.git
cd flyrank-capstone-metering-billing

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Initialize database
node -e "const db = require('better-sqlite3')('./billing.db'); const fs = require('fs'); const sql = fs.readFileSync('./migrations/001_initial_schema.sql', 'utf8'); db.exec(sql); console.log('✓ Database created');"

# Create test tenant
node -e "const db = require('better-sqlite3')('./billing.db'); db.prepare('INSERT INTO tenants (id, name, plan) VALUES (?, ?, ?)').run('test-tenant-1', 'Test Tenant', 'free'); console.log('✓ Test tenant created');"

# Start server
npm start
```

Server runs on `http://localhost:3000`

## API Endpoints

### Core Metering
- `POST /generate` - Record usage event (idempotent)
- `GET /usage/:tenant_id` - Get current month usage + cost

### Stripe
- `POST /checkout` - Create checkout session
- `POST /webhooks/stripe` - Webhook handler
- `GET /success` - Checkout success page
- `GET /cancel` - Checkout cancel page

## Usage Example

### Record API Call
```bash
curl -X POST http://localhost:3000/generate \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "test-tenant-1",
    "usage_type": "api_call",
    "quantity": 5,
    "idempotency_key": "unique-request-id"
  }'
```

### Check Usage & Cost
```bash
curl http://localhost:3000/usage/test-tenant-1
```

Response:
```json
{
  "plan": "free",
  "limits": {
    "apiCalls": 1000,
    "aiTokens": 100000,
    "costPerMonth": 0
  },
  "usage": [
    {"type": "api_call", "total": 100},
    {"type": "input_token", "total": 5000}
  ],
  "percentageUsed": {
    "apiCalls": 10,
    "aiTokens": 5
  },
  "cost": {
    "totalCost": 0.60,
    "breakdown": {
      "apiCalls": {
        "quantity": 100,
        "unitPrice": 0.001,
        "cost": 0.1
      },
      "inputTokens": {
        "quantity": 5000,
        "unitPrice": 0.0001,
        "cost": 0.5
      }
    }
  }
}
```

## Plans

| Feature | Free | Pro |
|---------|------|-----|
| API Calls/month | 1,000 | 100,000 |
| AI Tokens/month | 100,000 | 10,000,000 |
| Cost/month | $0 | $29.99 |

## Architecture

Client Request (API calls / AI tokens)
       │
       ▼
┌──────────────────────────────────────────┐
│          Express.js API Server           │
│                                          │
│  1. Metering (Idempotency Check)         │
│  2. Quota Check (Limits vs Usage)        │
│  3. Pricing Math (Cached vs Output)      │
└──────────────────────────────────────────┘
       │                           ▲
  Write / Read                     │
       ▼                           │ Stripe Webhooks
┌─────────────────┐       ┌─────────────────┐
│ SQLite Database │       │ Stripe API      │
│ - tenants       │◄──────┤ (Test Mode)     │
│ - usage_events  │       └─────────────────┘
│ - subscriptions │
└─────────────────┘

## Database

SQLite with 5 tables:
- `tenants` - Customer accounts
- `usage_events` - Metering events (with idempotency_key)
- `subscriptions` - Stripe subscription tracking
- `webhook_events` - Webhook deduplication
- `plans` - Plan configuration (reference data)

## Testing

All requirements verified in `EVIDENCE.md`:
- ✅ Idempotent metering (no duplicates)
- ✅ Quota boundary enforcement (429 at limit)
- ✅ Stripe webhook integration (plan upgrades)
- ✅ Token pricing rules (all 5 types)
- ✅ Data persistence (SQLite)

## Limitations

- **No invoice generation** - Use external tool for PDF invoices
- **No proration** - Mid-month upgrades charged full month
- **Test mode only** - Requires real Stripe keys for production
- **No usage forecasting** - No predictions/alerts
- **Single timezone** - Uses UTC only

## For Production

1. Replace mock Stripe with real API keys from dashboard
2. Replace SQLite with PostgreSQL for high scale
3. Add API authentication (JWT/OAuth)
4. Implement invoice generation
5. Add usage alerts and forecasting
6. Set up proper error logging and monitoring
7. Add webhook signature verification (Stripe CLI in test)

## Files


## Author

Built for Flyrank Capstone Project

## License

MIT