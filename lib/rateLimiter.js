// Token bucket rate limiter.
// Each client gets a "bucket" that holds up to `capacity` tokens.
// Every request consumes 1 token. Tokens refill over time at `refillRate` per second.
// If a client has no tokens left, the request is blocked.

class RateLimiter {
  constructor() {
    // clientId -> { capacity, refillRate, tokens, lastRefill }
    this.buckets = new Map();
    // Keep a running log of simulated requests for the dashboard
    this.log = [];
  }

  // Register or update a rule for a client
  addRule(clientId, capacity, refillRate) {
    if (!clientId || capacity <= 0 || refillRate <= 0) {
      throw new Error('Invalid rule: clientId, capacity and refillRate must be positive');
    }
    this.buckets.set(clientId, {
      capacity,
      refillRate,
      tokens: capacity,
      lastRefill: Date.now(),
    });
  }

  getRules() {
    return Array.from(this.buckets.entries()).map(([clientId, b]) => ({
      clientId,
      capacity: b.capacity,
      refillRate: b.refillRate,
      tokensAvailable: Math.floor(this._currentTokens(b)),
    }));
  }

  _currentTokens(bucket) {
    const now = Date.now();
    const elapsedSeconds = (now - bucket.lastRefill) / 1000;
    const refilled = elapsedSeconds * bucket.refillRate;
    return Math.min(bucket.capacity, bucket.tokens + refilled);
  }

  // Attempt a request for a client. Returns { allowed, tokensAvailable }
  allow(clientId) {
    const bucket = this.buckets.get(clientId);
    if (!bucket) {
      throw new Error(`Unknown client: ${clientId}`);
    }

    const now = Date.now();
    bucket.tokens = this._currentTokens(bucket);
    bucket.lastRefill = now;

    let allowed;
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      allowed = true;
    } else {
      allowed = false;
    }

    const entry = {
      clientId,
      allowed,
      timestamp: new Date(now).toISOString(),
      tokensAvailable: Math.floor(bucket.tokens),
    };
    this.log.unshift(entry);
    this.log = this.log.slice(0, 50); // keep last 50 entries

    return entry;
  }

  getLog() {
    return this.log;
  }
}

module.exports = RateLimiter;
