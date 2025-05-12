// server.js (updated)
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const adminRoutes = require('./routes/admin-products');
const cartRoutes = require('./routes/cart');
const adminOrdersRoutes = require('./routes/admin-orders');
const auth = require('./middleware/auth');
const categoriesRouter = require('./routes/categories');

// Then protect your cart routes like this:

// Add this with other route middleware
const path = require('path');
const cors = require('cors');

// Initialize Express app
const app = express();

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', auth, cartRoutes); // Protected routes
app.use('/admin-products', adminRoutes);
app.use('/admin-users', require('./routes/admin-users'));
app.use('/admin-orders', adminOrdersRoutes);
app.use('/api/categories', categoriesRouter);


// Database connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});