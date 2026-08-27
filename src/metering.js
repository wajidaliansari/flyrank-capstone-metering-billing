const { v4: uuidv4 } = require('uuid');
const db = require('./database');

function recordUsage(tenantId, usageType, quantity, idempotencyKey) {
  try {
    const eventId = uuidv4();
    db.prepare(`
      INSERT INTO usage_events (id, tenant_id, type, quantity, idempotency_key)
      VALUES (?, ?, ?, ?, ?)
    `).run(eventId, tenantId, usageType, quantity, idempotencyKey);

    const event = db.prepare('SELECT * FROM usage_events WHERE id = ?').get(eventId);

    console.log(`✓ Usage recorded: ${usageType} x${quantity} for tenant ${tenantId}`);
    return {
      success: true,
      event,
      cached: false,
    };
  } catch (err) {
    console.error('Error recording usage:', err);
    throw err;
  }
}

module.exports = { recordUsage };