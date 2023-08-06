const mongoose = require('mongoose');

const CATEGORIES = ['movies', 'books', 'electronics', 'restaurants'];

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    category: { type: String, required: true, enum: CATEGORIES, index: true },
    description: { type: String, default: '', maxlength: 2000 },
    imageUrl: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // Denormalized aggregates kept in sync as reviews are added/removed.
    ratingAvg: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

productSchema.index({ name: 'text', description: 'text' });

const Product = mongoose.model('Product', productSchema);
Product.CATEGORIES = CATEGORIES;

module.exports = Product;
