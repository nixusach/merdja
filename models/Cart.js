const mongoose = require('mongoose');

const CartItemVariantSchema = new mongoose.Schema({
    variantName: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
        default: 1
    }
});

const CartItemSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    productName: {
        type: String,
        required: true
    },
    variants: [CartItemVariantSchema],
    totalPrice: {
        type: Number,
        required: true,
        default: 0
    },
    image: {
        type: String
    },
    addedAt: {
        type: Date,
        default: Date.now
    }
});

const CartSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        unique: true
    },
    items: [CartItemSchema],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, { collection: 'carts' });

// Middleware to calculate total price before saving
CartSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    
    // Calculate total price for each item
    this.items.forEach(item => {
        item.totalPrice = item.variants.reduce((total, variant) => {
            return total + (variant.price * variant.quantity);
        }, 0);
    });
    
    next();
});

// Add a method to find existing cart item with same product and variants
CartSchema.methods.findExistingCartItem = function(productId, variants) {
    return this.items.find(item => {
        if (!item.productId.equals(productId)) return false;
        
        // Check if all variants match
        if (item.variants.length !== variants.length) return false;
        
        const variantNames = new Set(variants.map(v => v.variantName));
        return item.variants.every(v => variantNames.has(v.variantName));
    });
};

module.exports = mongoose.model('Cart', CartSchema);