const express = require('express');
require('dotenv').config();
const db = require('./database');
const { recordUsage } = require('./metering');
const { checkQuota } = require('./quota');
const { createCheckoutSession } = require('./checkout');
const { handleWebhook } = require('./stripe-webhook');
const { calculateCost } = require('./pricing');
const { PLANS } = require('./config');

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: '✓ Billing engine running' });
});

app.post('/generate', (req, res) => {
  try {
    const { tenant_id, usage_type, quantity, idempotency_key } = req.body;
    if (!tenant_id || !usage_type || !quantity || !idempotency_key) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const cached = db.prepare('SELECT * FROM usage_events WHERE idempotency_key = ?').get(idempotency_key);
    if (cached) {
      console.log('✓ Idempotent request - returning cached event');
      return res.status(200).json({ success: true, event: cached, cached: true });
    }
    const quotaCheck = checkQuota(tenant_id, usage_type, quantity);
    if (!quotaCheck.allowed) {
      return res.status(quotaCheck.statusCode).json({ error: quotaCheck.message, details: quotaCheck.details });
    }
    const result = recordUsage(tenant_id, usage_type, quantity, idempotency_key);
    res.status(200).json(result);
  } catch (err) {
    console.error('Error in /generate:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

app.get('/usage/:tenant_id', (req, res) => {
  try {
    const { tenant_id } = req.params;
    const tenant = db.prepare('SELECT plan FROM tenants WHERE id = ?').get(tenant_id);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    const plan = PLANS[tenant.plan];
    const usage = db.prepare(`SELECT type, SUM(quantity) as total FROM usage_events WHERE tenant_id = ? AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now') GROUP BY type`).all(tenant_id);
    const costData = calculateCost(tenant_id);
    const percentageUsed = {};
    let apiCallsUsed = 0, aiTokensUsed = 0;
    for (const row of usage) {
      if (row.type === 'api_call') apiCallsUsed = row.total;
      else if (['input_token', 'output_token', 'cached_input_token', 'reasoning_token'].includes(row.type)) aiTokensUsed += row.total;
    }
    if (apiCallsUsed > 0) percentageUsed.apiCalls = parseFloat(((apiCallsUsed / plan.apiCalls) * 100).toFixed(2));
    if (aiTokensUsed > 0) percentageUsed.aiTokens = parseFloat(((aiTokensUsed / plan.aiTokens) * 100).toFixed(2));
    res.json({ plan: tenant.plan, limits: { apiCalls: plan.apiCalls, aiTokens: plan.aiTokens, costPerMonth: plan.costPerMonth }, usage: usage || [], percentageUsed, cost: { totalCost: costData.totalCost, breakdown: costData.breakdown }, message: 'Usage summary for current month' });
  } catch (err) {
    console.error('Error in /usage:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

app.post('/checkout', async (req, res) => {
  try {
    const { tenant_id, plan } = req.body;
    if (!tenant_id || !plan) return res.status(400).json({ error: 'Missing tenant_id or plan' });
    const session = await createCheckoutSession(tenant_id, plan);
    res.json({ checkoutUrl: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Error in /checkout:', err);
    res.status(500).json({ error: 'Failed to create checkout session', message: err.message });
  }
});

app.post('/webhooks/stripe', express.json(), async (req, res) => {
  try {
    const event = req.body;
    if (!event.type) return res.status(400).json({ error: 'Invalid webhook event' });
    const result = await handleWebhook(event);
    res.json({ received: true, processed: result.processed });
  } catch (err) {
    console.error('Error in /webhooks/stripe:', err);
    res.status(500).json({ error: 'Webhook handler error', message: err.message });
  }
});

app.get('/success', (req, res) => {
  res.json({ message: '✓ Subscription successful!', session_id: req.query.session_id });
});

app.get('/cancel', (req, res) => {
  res.json({ message: 'Subscription cancelled' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✓ Billing engine running on port ${PORT}`);
});

module.exports = app;