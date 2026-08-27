const express = require('express');
require('dotenv').config();
const db = require('./database');
const { recordUsage } = require('./metering');
const { checkQuota } = require('./quota');

const app = express();
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ status: '✓ Billing engine running' });
});

// Core billing endpoint
app.post('/generate', (req, res) => {
  try {
    const { tenant_id, usage_type, quantity, idempotency_key } = req.body;

    if (!tenant_id || !usage_type || !quantity || !idempotency_key) {
      return res.status(400).json({
        error: 'Missing required fields',
      });
    }

    // FIRST: Check idempotency (if it's a retry, return cached result immediately)
    const cached = db.prepare(
      'SELECT * FROM usage_events WHERE idempotency_key = ?'
    ).get(idempotency_key);

    if (cached) {
      console.log('✓ Idempotent request - returning cached event');
      return res.status(200).json({
        success: true,
        event: cached,
        cached: true,
      });
    }

    // SECOND: Check quota (only for new requests)
    const quotaCheck = checkQuota(tenant_id, usage_type, quantity);
    if (!quotaCheck.allowed) {
      return res.status(quotaCheck.statusCode).json({
        error: quotaCheck.message,
        details: quotaCheck.details,
      });
    }

    // THIRD: Record usage
    const result = recordUsage(tenant_id, usage_type, quantity, idempotency_key);
    res.status(200).json(result);
  } catch (err) {
    console.error('Error in /generate:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: err.message,
    });
  }
});

// Get usage summary
app.get('/usage/:tenant_id', (req, res) => {
  try {
    const { tenant_id } = req.params;

    const tenant = db.prepare('SELECT plan FROM tenants WHERE id = ?').get(tenant_id);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const usage = db.prepare(`
      SELECT type, SUM(quantity) as total
      FROM usage_events
      WHERE tenant_id = ?
      AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
      GROUP BY type
    `).all(tenant_id);

    res.json({
      plan: tenant.plan,
      usage: usage || [],
      message: 'Usage summary for current month',
    });
  } catch (err) {
    console.error('Error in /usage:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: err.message,
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✓ Billing engine running on port ${PORT}`);
});

module.exports = app;