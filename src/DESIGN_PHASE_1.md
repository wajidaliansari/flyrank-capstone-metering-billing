# Phase 1: Design & Schema

## Problem
Build a billing system that answers:
1. How much has this customer used?
2. What should they pay?
3. Have they hit their limit?

## Data Model

### Tenants
- One per customer organization
- Has a subscription plan (free or pro)
- Owns all usage events

### Plans
- Free: 1,000 API calls/month, 100k tokens/month, $0
- Pro: 100,000 API calls/month, 10M tokens/month, $29.99/month

### Usage Events
- Recorded atomically per action
- Idempotency key prevents double-counting
- Types: api_call, input_token, output_token, cached_input_token, reasoning_token

### Subscriptions
- Stripe subscription per tenant
- Status synced via webhooks
- Tracks plan changes

## API Contract

### POST /generate
Request:
```json
{
  "tenant_id": "uuid",
  "usage_type": "api_call|input_token|output_token",
  "quantity": 5,
  "idempotency_key": "unique-string"
}
```

Response (200):
```json
{
  "success": true,
  "event": {
    "id": "evt-123",
    "quantity": 5,
    "timestamp": "2024-01-15T10:00:00Z"
  }
}
```

Response (429 - quota exceeded):
```json
{
  "error": "Usage quota exceeded",
  "limit": 1000,
  "used": 1000
}
```

### GET /usage/:tenant_id
Returns current month's usage and cost

### POST /webhooks/stripe
Receives Stripe events, updates tenant plan

## Architecture Layers
1. HTTP (Express routes)
2. Business logic (metering, quota, pricing)
3. Data (PostgreSQL)

## Key Constraints
- Retries must create exactly one event (idempotency key)
- Money as integers (cents), never floats
- Stripe secrets in .env only, never committed
- Test mode only (no real charges)