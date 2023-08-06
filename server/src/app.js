const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const cache = require('./services/redis');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const reviewRoutes = require('./routes/reviews');
const errorHandler = require('./middleware/error');

function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: config.server.clientOrigin }));
  app.use(express.json());
  if (config.env !== 'test') app.use(morgan('tiny'));

  // Throttle auth endpoints to blunt credential-stuffing.
  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50 });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', redis: cache.isHealthy() ? 'up' : 'down' });
  });

  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/products', productRoutes);
  // Reviews live under a product so the product id is always in scope.
  app.use('/api/products/:productId/reviews', reviewRoutes);

  app.use((req, res) => res.status(404).json({ error: 'Not found' }));
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
