const db = require('./database');
const { v4: uuidv4 } = require('uuid');

async function createCheckoutSession(tenantId, plan) {
  try {
    const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenantId);

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // For testing, generate a mock Stripe customer ID
    const stripeCustomerId = `cus_test_${uuidv4().slice(0, 8)}`;

    // Save subscription record
    db.prepare(
      'INSERT OR REPLACE INTO subscriptions (id, tenant_id, stripe_customer_id, status) VALUES (?, ?, ?, ?)'
    ).run(uuidv4(), tenantId, stripeCustomerId, 'inactive');

    // Create mock checkout session
    const sessionId = `cs_test_${uuidv4().slice(0, 16)}`;

    console.log(`✓ Mock checkout session created: ${sessionId}`);
    
    return {
      id: sessionId,
      url: `https://checkout.stripe.com/pay/${sessionId}`,
      customer: stripeCustomerId,
      status: 'open',
      mode: 'subscription',
      metadata: { tenantId, plan },
    };
  } catch (err) {
    console.error('Error creating checkout session:', err);
    throw err;
  }
}

module.exports = { createCheckoutSession };