CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS plans (
  name TEXT PRIMARY KEY,
  api_calls_limit INTEGER,
  ai_tokens_limit INTEGER,
  cost_per_month REAL
);

INSERT OR IGNORE INTO plans (name, api_calls_limit, ai_tokens_limit, cost_per_month)
VALUES ('free', 1000, 100000, 0.00);

INSERT OR IGNORE INTO plans (name, api_calls_limit, ai_tokens_limit, cost_per_month)
VALUES ('pro', 100000, 10000000, 29.99);

CREATE TABLE IF NOT EXISTS usage_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  idempotency_key TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_usage_events_tenant_id ON usage_events(tenant_id);

CREATE INDEX IF NOT EXISTS idx_usage_events_idempotency ON usage_events(idempotency_key);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY,
  stripe_event_id TEXT UNIQUE NOT NULL,
  processed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_stripe_id ON webhook_events(stripe_event_id);