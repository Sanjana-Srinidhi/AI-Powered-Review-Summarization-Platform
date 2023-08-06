const express = require('express');
const { body } = require('express-validator');
const mongoose = require('mongoose');
const Review = require('../models/Review');
const Product = require('../models/Product');
const cache = require('../services/redis');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { summarizeReviews } = require('../services/openai');

// mergeParams lets this router read :productId from the parent mount path.
const router = express.Router({ mergeParams: true });

const summaryKey = (id) => `summary:${id}`;

/**
 * Recompute a product's denormalized rating aggregates and drop every cache
 * entry that depends on this product's reviews.
 */
async function refreshProductAndCache(productId) {
  const stats = await Review.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId) } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);

  const { avg = 0, count = 0 } = stats[0] || {};
  await Product.findByIdAndUpdate(productId, {
    ratingAvg: Math.round(avg * 10) / 10,
    reviewCount: count,
  });

  await cache.invalidate([
    summaryKey(productId),
    `product:${productId}`,
    'products:list:*',
  ]);
}

// GET /api/products/:productId/reviews
router.get('/', async (req, res, next) => {
  try {
    const reviews = await Review.find({ product: req.params.productId })
      .populate('author', 'name')
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ reviews });
  } catch (err) {
    return next(err);
  }
});

// POST /api/products/:productId/reviews — authenticated users only
router.post(
  '/',
  requireAuth,
  body('rating').isInt({ min: 1, max: 5 }),
  body('text').trim().isLength({ min: 3, max: 2000 }),
  validate,
  async (req, res, next) => {
    try {
      const product = await Product.findById(req.params.productId);
      if (!product) return res.status(404).json({ error: 'Product not found' });

      const review = await Review.create({
        product: product._id,
        author: req.user.id,
        rating: req.body.rating,
        text: req.body.text,
      });

      // A new review invalidates the cached summary + product reads.
      await refreshProductAndCache(product._id);
      return res.status(201).json(review);
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({ error: 'You already reviewed this product' });
      }
      return next(err);
    }
  }
);

// DELETE /api/products/:productId/reviews/:reviewId — author or admin
router.delete('/:reviewId', requireAuth, async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.reviewId);
    if (!review) return res.status(404).json({ error: 'Review not found' });

    const isOwner = review.author.toString() === req.user.id;
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    await review.deleteOne();
    await refreshProductAndCache(review.product);
    return res.json({ deleted: review._id });
  } catch (err) {
    return next(err);
  }
});

// GET /api/products/:productId/reviews/summary — cached AI pros/cons
router.get('/summary', async (req, res, next) => {
  try {
    const key = summaryKey(req.params.productId);

    const cached = await cache.getJSON(key);
    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.json(cached);
    }

    const product = await Product.findById(req.params.productId).lean();
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const reviews = await Review.find({ product: product._id })
      .select('rating text')
      .lean();

    const summary = await summarizeReviews({
      productName: product.name,
      reviews,
    });

    // AI calls are expensive — cache the result until a review changes.
    await cache.setJSON(key, summary);
    res.set('X-Cache', 'MISS');
    return res.json(summary);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
