const express = require('express');
const { body } = require('express-validator');
const User = require('../models/User');
const validate = require('../middleware/validate');
const { signToken, requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register
router.post(
  '/register',
  body('name').trim().isLength({ min: 2, max: 80 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  validate,
  async (req, res, next) => {
    try {
      const { name, email, password } = req.body;

      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      const user = new User({ name, email, role: 'user' });
      await user.setPassword(password);
      await user.save();

      const token = signToken(user);
      return res.status(201).json({ token, user: user.toSafeJSON() });
    } catch (err) {
      return next(err);
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  validate,
  async (req, res, next) => {
    try {
      const { email, password } = req.body;

      // passwordHash is select:false, so request it explicitly.
      const user = await User.findOne({ email }).select('+passwordHash');
      if (!user || !(await user.verifyPassword(password))) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const token = signToken(user);
      return res.json({ token, user: user.toSafeJSON() });
    } catch (err) {
      return next(err);
    }
  }
);

// GET /api/auth/me — current user from the token
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ user: user.toSafeJSON() });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
