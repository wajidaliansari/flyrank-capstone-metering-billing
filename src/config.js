const PLANS = {
  free: {
    name: 'Free',
    apiCalls: 1000,
    aiTokens: 100_000,
    costPerMonth: 0,
  },
  pro: {
    name: 'Pro',
    apiCalls: 100_000,
    aiTokens: 10_000_000,
    costPerMonth: 29.99,
  },
};

const PRICING = {
  apiCall: 0.001, // $0.001 per call
  inputToken: 0.0001, // $0.0001 per token
  cachedInputToken: 0.00005, // 50% cheaper
  outputToken: 0.0003, // $0.0003 per token
  reasoningToken: 0.0003, // Counts as output (not extra)
};

module.exports = { PLANS, PRICING };