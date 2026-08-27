const db = require('./database');
const { PLANS } = require('./config');

function checkQuota(tenantId, usageType, requestedQuantity) {
  try {
    const tenant = db.prepare('SELECT plan FROM tenants WHERE id = ?').get(tenantId);

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const planConfig = PLANS[tenant.plan];
    if (!planConfig) {
      throw new Error(`Invalid plan: ${tenant.plan}`);
    }

    let limit;
    if (usageType === 'api_call') {
      limit = planConfig.apiCalls;
    } else if (['input_token', 'output_token', 'cached_input_token', 'reasoning_token'].includes(usageType)) {
      limit = planConfig.aiTokens;
    } else {
      throw new Error(`Unknown usage type: ${usageType}`);
    }

    const usage = db.prepare(`
      SELECT COALESCE(SUM(quantity), 0) as total
      FROM usage_events
      WHERE tenant_id = ?
      AND type = ?
      AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
    `).get(tenantId, usageType);

    const currentUsage = usage.total;
    const newUsage = currentUsage + requestedQuantity;

    if (newUsage > limit) {
      console.log(`✗ Quota exceeded: ${currentUsage}/${limit} for ${usageType}`);
      return {
        allowed: false,
        statusCode: 429,
        message: 'Usage quota exceeded',
        details: {
          type: usageType,
          limit,
          current: currentUsage,
          requested: requestedQuantity,
          wouldExceed: newUsage,
        },
      };
    }

    console.log(`✓ Quota check passed: ${newUsage}/${limit} for ${usageType}`);
    return {
      allowed: true,
      statusCode: 200,
      message: 'OK',
    };
  } catch (err) {
    console.error('Error checking quota:', err);
    throw err;
  }
}

module.exports = { checkQuota };