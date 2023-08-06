const express = require('express');
const { body, query } = require('express-validator');
const Product = require('../models/Product');
const Review = require('../models/Review');
const cache = require('../services/redis');
const validate = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

const listKey = (category, q, page) =>
  `products:list:${category || 'all'}:${q || '-'}:${page}`;
const detailKey = (id) => `product:${id}`;

// GET /api/products?category=&q=&page= — cached list
router.get(
  '/',
  query('page').optional().isInt({ min: 1 }),
  validate,
  async (req, res, next) => {
    try {
      const { category, q } = req.query;
      const page = parseInt(req.query.page || '1', 10);
      const limit = 20;
      const key = listKey(category, q, page);

      const cached = await cache.getJSON(key);
      if (cached) {
        res.set('X-Cache', 'HIT');
        return res.json(cached);
      }

      const filter = {};
      if (category) filter.category = category;
      if (q) filter.$text = { $search: q };

      const [items, total] = await Promise.all([
        Product.find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        Product.countDocuments(filter),
      ]);

      const payload = { items, total, page, pages: Math.ceil(total / limit) };
      await cache.setJSON(key, payload);
      res.set('X-Cache', 'MISS');
      return res.json(payload);
    } catch (err) {
      return next(err);
    }
  }
);

// GET /api/products/:id — cached detail
router.get('/:id', async (req, res, next) => {
  try {
    const key = detailKey(req.params.id);
    const cached = await cache.getJSON(key);
    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.json(cached);
    }

    const product = await Product.findById(req.params.id).lean();
    if (!product) return res.status(404).json({ error: 'Product not found' });

    await cache.setJSON(key, product);
    res.set('X-Cache', 'MISS');
    return res.json(product);
  } catch (err) {
    return next(err);
  }
});

// POST /api/products — any authenticated user may add an item
router.post(
  '/',
  requireAuth,
  body('name').trim().isLength({ min: 2, max: 160 }),
  body('category').isIn(Product.CATEGORIES),
  body('description').optional().isLength({ max: 2000 }),
  body('imageUrl').optional().isURL().withMessage('imageUrl must be a URL'),
  validate,
  async (req, res, next) => {
    try {
      const product = await Product.create({
        name: req.body.name,
        category: req.body.category,
        description: req.body.description || '',
        imageUrl: req.body.imageUrl || '',
        createdBy: req.user.id,
      });

      // New product changes every list page — drop the list cache.
      await cache.invalidate('products:list:*');
      return res.status(201).json(product);
    } catch (err) {
      return next(err);
    }
  }
);

// DELETE /api/products/:id — admin only (RBAC)
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    await Review.deleteMany({ product: product._id });
    await cache.invalidate([
      detailKey(product._id),
      `summary:${product._id}`,
      'products:list:*',
    ]);
    return res.json({ deleted: product._id });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
