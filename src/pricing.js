const db = require('./database');
const { PRICING } = require('./config');

function calculateCost(tenantId) {
  try {
    // Get all usage events for current month
    const usage = db.prepare(`
      SELECT type, SUM(quantity) as total
      FROM usage_events
      WHERE tenant_id = ?
      AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
      GROUP BY type
    `).all(tenantId);

    let totalCost = 0;
    const breakdown = {};

    // Calculate cost for each usage type
    for (const row of usage) {
      let costForType = 0;

      if (row.type === 'api_call') {
        costForType = row.total * PRICING.apiCall;
        breakdown.apiCalls = {
          quantity: row.total,
          unitPrice: PRICING.apiCall,
          cost: costForType,
        };
      } else if (row.type === 'input_token') {
        costForType = row.total * PRICING.inputToken;
        breakdown.inputTokens = {
          quantity: row.total,
          unitPrice: PRICING.inputToken,
          cost: costForType,
        };
      } else if (row.type === 'cached_input_token') {
        costForType = row.total * PRICING.cachedInputToken;
        breakdown.cachedInputTokens = {
          quantity: row.total,
          unitPrice: PRICING.cachedInputToken,
          cost: costForType,
        };
      } else if (row.type === 'output_token') {
        costForType = row.total * PRICING.outputToken;
        breakdown.outputTokens = {
          quantity: row.total,
          unitPrice: PRICING.outputToken,
          cost: costForType,
        };
      } else if (row.type === 'reasoning_token') {
        // Reasoning tokens count as output tokens
        costForType = row.total * PRICING.reasoningToken;
        breakdown.reasoningTokens = {
          quantity: row.total,
          unitPrice: PRICING.reasoningToken,
          cost: costForType,
        };
      }

      totalCost += costForType;
    }

    return {
      totalCost: parseFloat(totalCost.toFixed(2)),
      breakdown,
    };
  } catch (err) {
    console.error('Error calculating cost:', err);
    throw err;
  }
}

module.exports = { calculateCost };