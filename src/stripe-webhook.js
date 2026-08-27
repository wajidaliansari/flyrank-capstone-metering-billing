const db = require('./database');
const { v4: uuidv4 } = require('uuid');

async function handleWebhook(event) {
  try {
    // Prevent duplicate processing
    const existing = db.prepare(
      'SELECT * FROM webhook_events WHERE stripe_event_id = ?'
    ).get(event.id);

    if (existing) {
      console.log('✓ Webhook already processed, ignoring duplicate');
      return { processed: false, reason: 'duplicate' };
    }

    let processed = false;

    // Handle checkout.session.completed (Free → Pro upgrade)
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      console.log('✓ Processing checkout.session.completed');

      // Find tenant by checking subscriptions table
      // For now, use metadata.tenantId or find by stripe customer
      const tenantId = session.metadata?.tenantId || session.client_reference_id;

      if (tenantId) {
        db.prepare(
          'UPDATE tenants SET plan = ? WHERE id = ?'
        ).run('pro', tenantId);
        console.log(`✓ Upgraded tenant ${tenantId} to pro`);
      }

      processed = true;
    }

    // Handle customer.subscription.updated
    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object;
      console.log('✓ Processing customer.subscription.updated');

      // Find tenant by stripe customer
      const sub = db.prepare(
        'SELECT tenant_id FROM subscriptions WHERE stripe_customer_id = ?'
      ).get(subscription.customer);

      if (sub) {
        db.prepare(
          'UPDATE subscriptions SET status = ? WHERE stripe_customer_id = ?'
        ).run('active', subscription.customer);
      }

      processed = true;
    }

    // Handle customer.subscription.deleted (Pro → Free downgrade)
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      console.log('✓ Processing customer.subscription.deleted');

      // Find tenant and downgrade to Free
      const sub = db.prepare(
        'SELECT tenant_id FROM subscriptions WHERE stripe_customer_id = ?'
      ).get(subscription.customer);

      if (sub) {
        db.prepare(
          'UPDATE tenants SET plan = ? WHERE id = ?'
        ).run('free', sub.tenant_id);
      }

      processed = true;
    }

    // Mark event as processed
    if (processed) {
      db.prepare(
        'INSERT INTO webhook_events (id, stripe_event_id) VALUES (?, ?)'
      ).run(uuidv4(), event.id);

      console.log(`✓ Webhook processed: ${event.type}`);
      return { processed: true };
    }

    return { processed: false, reason: 'event_type_not_handled' };
  } catch (err) {
    console.error('Error handling webhook:', err);
    throw err;
  }
}

module.exports = { handleWebhook };