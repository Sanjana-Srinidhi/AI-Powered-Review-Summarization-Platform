require('dotenv').config();

const required = (key, fallback) => {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const config = {
  env: process.env.NODE_ENV || 'development',
  server: {
    port: parseInt(process.env.PORT || '5000', 10),
    clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  },
  mongo: {
    uri: required('MONGO_URI', 'mongodb://localhost:27017/review-platform'),
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    // Seconds that cached payloads live before expiring.
    ttl: parseInt(process.env.REDIS_TTL || '3600', 10),
  },
  jwt: {
    secret: required('JWT_SECRET', 'dev-only-insecure-secret-change-me'),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  },
};

module.exports = config;
