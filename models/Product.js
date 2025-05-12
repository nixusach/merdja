const mongoose = require('mongoose');

const VariantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  available: {
    type: Boolean,
    default: function() {
      return this.quantity > 0;
    }
  },
  sku: String
});

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a product name'],
    unique: true,
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  category: {
    type: String,
    trim: true
  },
  variants: [VariantSchema],
  featured: {
    type: Boolean,
    default: false
  },
  description: {
    type: String,
    required: false, // Change from true to false
    default: ""     // Optional: Set a default empty string
  },
  images: [{
    type: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { collection: 'myProducts' });

ProductSchema.pre('save', function(next) {
  // Product is available if ANY variant is available
  this.available = this.variants.some(variant => variant.quantity > 0);
  
  // Update each variant's availability
  this.variants.forEach(variant => {
    variant.available = variant.quantity > 0;
  });
  next();
});
module.exports = mongoose.model('Product', ProductSchema);