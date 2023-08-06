/**
 * Seed the database with an admin, a sample user, products, and reviews.
 * Usage: npm run seed   (or `docker compose exec server npm run seed`)
 */
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const Product = require('./models/Product');
const Review = require('./models/Review');

const PRODUCTS = [
  { name: 'Interstellar', category: 'movies', description: 'A team travels through a wormhole in search of a new home for humanity.' },
  { name: 'The Pragmatic Programmer', category: 'books', description: 'Classic software craftsmanship advice.' },
  { name: 'Sony WH-1000XM5', category: 'electronics', description: 'Noise-cancelling over-ear headphones.' },
  { name: 'Olive & Thyme Bistro', category: 'restaurants', description: 'Mediterranean small plates downtown.' },
];

const SAMPLE_REVIEWS = [
  { rating: 5, text: 'Absolutely loved it — would recommend to anyone.' },
  { rating: 4, text: 'Great overall, a couple of minor niggles but worth it.' },
  { rating: 2, text: 'Disappointed. Did not live up to the hype for me.' },
  { rating: 5, text: 'Exceeded my expectations. Fantastic value.' },
];

async function seed() {
  await connectDB();
  console.log('[seed] clearing existing data...');
  await Promise.all([User.deleteMany({}), Product.deleteMany({}), Review.deleteMany({})]);

  const admin = new User({ name: 'Admin', email: 'admin@example.com', role: 'admin' });
  await admin.setPassword('admin1234');
  await admin.save();

  const reviewers = [];
  for (let i = 1; i <= 4; i += 1) {
    const u = new User({ name: `Reviewer ${i}`, email: `reviewer${i}@example.com`, role: 'user' });
    await u.setPassword('password123');
    await u.save();
    reviewers.push(u);
  }

  for (const p of PRODUCTS) {
    const product = await Product.create({ ...p, createdBy: admin._id });
    for (let i = 0; i < SAMPLE_REVIEWS.length; i += 1) {
      await Review.create({
        product: product._id,
        author: reviewers[i]._id,
        rating: SAMPLE_REVIEWS[i].rating,
        text: SAMPLE_REVIEWS[i].text,
      });
    }
    const avg = SAMPLE_REVIEWS.reduce((s, r) => s + r.rating, 0) / SAMPLE_REVIEWS.length;
    product.ratingAvg = Math.round(avg * 10) / 10;
    product.reviewCount = SAMPLE_REVIEWS.length;
    await product.save();
  }

  console.log('[seed] done.');
  console.log('[seed] admin login: admin@example.com / admin1234');
  console.log('[seed] user login:  reviewer1@example.com / password123');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
