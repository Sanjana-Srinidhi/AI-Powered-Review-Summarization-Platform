const Redis = require('ioredis');
const config = require('../config');

// A single shared client for the process. ioredis reconnects on its own, so a
// transient Redis outage degrades to "cache miss" instead of crashing the API.
const client = new Redis(config.redis.url, {
  lazyConnect: false,
  maxRetriesPerRequest: 2,
});

let healthy = false;
client.on('ready', () => {
  healthy = true;
  console.log(`[redis] connected to ${config.redis.url}`);
});
client.on('error', (err) => {
  healthy = false;
  console.warn(`[redis] ${err.message}`);
});

/**
 * Read a JSON value from cache. Never throws — a Redis problem is treated as a
 * miss so the caller falls through to the database.
 */
async function getJSON(key) {
  try {
    const raw = await client.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.warn(`[redis] get ${key} failed: ${err.message}`);
    return null;
  }
}

/**
 * Write a JSON value with a TTL (defaults to the configured TTL).
 */
async function setJSON(key, value, ttl = config.redis.ttl) {
  try {
    await client.set(key, JSON.stringify(value), 'EX', ttl);
  } catch (err) {
    console.warn(`[redis] set ${key} failed: ${err.message}`);
  }
}

/**
 * Invalidate one or more keys / glob patterns. Called whenever the underlying
 * data changes so stale reads are never served after a write.
 */
async function invalidate(patterns) {
  const list = Array.isArray(patterns) ? patterns : [patterns];
  try {
    for (const pattern of list) {
      if (pattern.includes('*')) {
        const keys = await client.keys(pattern);
        if (keys.length) await client.del(keys);
      } else {
        await client.del(pattern);
      }
    }
  } catch (err) {
    console.warn(`[redis] invalidate failed: ${err.message}`);
  }
}

module.exports = {
  client,
  getJSON,
  setJSON,
  invalidate,
  isHealthy: () => healthy,
};
