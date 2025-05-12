const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Category = require('../models/Category');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');

// Admin verification middleware
const verifyAdmin = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Non autorisé' });
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.user) return res.status(401).json({ message: 'Non autorisé' });
    
    next();
  } catch (err) {
    console.error('Admin verification error:', err);
    res.status(401).json({ message: 'Not authorized' });
  }
};
router.use(verifyAdmin);

// Configure multer for file uploads
const productStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../public/images/products');
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const productName = req.body.name || req.params.name;
    const ext = path.extname(file.originalname);
    cb(null, `${productName}_${Date.now()}${ext}`);
  }
});

const categoryStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../public/images/categories');
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const categoryName = req.body.name || req.params.name;
    const ext = path.extname(file.originalname);
    cb(null, `${categoryName}${ext}`);
  }
});

const productUpload = multer({ 
  storage: productStorage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

const categoryUpload = multer({ 
  storage: categoryStorage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});
// Categories routes
router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/categories', categoryUpload.single('image'), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !req.file) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Le nom et l\'image sont requis' });
    }

    const existing = await Category.findOne({ name });
    if (existing) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'La catégorie existe déjà' });
    }

    const category = new Category({ name, image: req.file.filename });
    const newCategory = await category.save();
    res.status(201).json(newCategory);
  } catch (err) {
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(400).json({ message: err.message });
  }
});

router.put('/categories/:id', categoryUpload.single('image'), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Le nom est requis' });

    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Non trouvé' });

    if (name !== category.name) {
      const existing = await Category.findOne({ name });
      if (existing) return res.status(400).json({ message: 'Ce nom existe déjà' });
    }

    if (req.file) {
      const oldPath = path.join(__dirname, '../public/images/categories', category.image);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      category.image = req.file.filename;
    }

    category.name = name;
    const updated = await category.save();
    res.json(updated);
  } catch (err) {
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(400).json({ message: err.message });
  }
});

router.delete('/categories/:id', async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ message: 'Non trouvé' });


    const imagePath = path.join(__dirname, '../public/images/categories', category.image);
    if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);

    await Product.updateMany(
      { category: category.name },
      { $set: { category: '' } }
    );

    res.json({ message: 'Catégorie supprimée' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Products routes
router.get('/products', async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/products/:name', async (req, res) => {
  try {
    const product = await Product.findOne({ name: req.params.name });
    if (!product) return res.status(404).json({ message: 'Non trouvé' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update the POST /products route
router.post('/products', productUpload.array('images', 10), async (req, res) => {
    try {
        const { name, category, description, variants, featured } = req.body;
        if (!category) return res.status(400).json({ message: 'La catégorie est requise' });

        const images = (req.files || []).map(file => file.filename);
        const product = new Product({
            name,
            category,
            featured: featured === 'true',
            variants: JSON.parse(variants),
            description,
            images
        });

        const newProduct = await product.save();
        res.status(201).json(newProduct);
    } catch (err) {
        if (req.files?.length > 0) {
            req.files.forEach(file => fs.unlinkSync(file.path));
        }
        res.status(400).json({ message: err.message });
    }
});

// Update the PUT /products/:name route
router.put('/products/:name', productUpload.array('images', 10), async (req, res) => {
    try {
        const { name, category, description, variants, featured } = req.body;
        if (!category) return res.status(400).json({ message: 'La catégorie est requise' });

        const product = await Product.findOne({ name: req.params.name });
        if (!product) return res.status(404).json({ message: 'Non trouvé' });
        

        const newImages = (req.files || []).map(file => file.filename);
        const updatedData = {
            name,
            category,
            featured: featured === 'true',
            variants: JSON.parse(variants),
            description,
            images: [...(product.images || []), ...newImages]
        };

        const updatedProduct = await Product.findOneAndUpdate(
            { name: req.params.name },
            updatedData,
            { new: true }
        );

        res.json(updatedProduct);
    } catch (err) {
        if (req.files?.length > 0) {
            req.files.forEach(file => fs.unlinkSync(file.path));
        }
        res.status(400).json({ message: err.message });
    }
});

router.delete('/products/:name', async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({ name: req.params.name });
    if (!product) return res.status(404).json({ message: 'Non trouvé' });

    if (product.images?.length > 0) {
      product.images.forEach(image => {
        const path = path.join(__dirname, '../public/images/products', image);
        if (fs.existsSync(path)) fs.unlinkSync(path);
      });
    }

    res.json({ message: 'Produit supprimé' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/products/:name/images/:image', async (req, res) => {
  try {
    const product = await Product.findOne({ name: req.params.name });
    if (!product) return res.status(404).json({ message: 'Produit non trouvé' });

    const index = product.images.indexOf(req.params.image);
    if (index === -1) return res.status(404).json({ message: 'Image non trouvé' });

    const imagePath = path.join(__dirname, '..', 'public', 'images', 'products', req.params.image);
    if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);

    product.images.splice(index, 1);
    await product.save();

    res.json({ message: 'Image supprimée' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Featured products
router.get('/products/featured', async (req, res) => {
  try {
    const featuredProducts = await Product.find({ featured: true });
    res.json(featuredProducts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// Excel Import Route
router.post('/import', async (req, res) => {
    try {
        const { products } = req.body;
        if (!products || !Array.isArray(products)) {
            return res.status(400).json({ message: 'Données de produits invalides' });
        }

        const results = [];
        let insertedCount = 0;

        for (const productData of products) {
            try {
                // Remove category requirement
                productData.category = ''; // Ensure category is empty
                
                // Check if product already exists
                const existingProduct = await Product.findOne({ name: productData.name });
                
                if (existingProduct) {
                    // Update existing product
                    const updated = await Product.findOneAndUpdate(
                        { name: productData.name },
                        { $set: productData },
                        { new: true }
                    );
                    results.push(updated);
                    insertedCount++;
                } else {
                    // Create new product
                    const product = new Product({
                        ...productData,
                        images: ['white.jpg'] // Default image
                    });
                    const newProduct = await product.save();
                    results.push(newProduct);
                    insertedCount++;
                }
            } catch (err) {
                console.error(`Erreur d\'importation ${productData.name}:`, err);
                // Continue with next product
            }
        }

        res.json({
            success: true,
            insertedCount,
            results
        });
    } catch (err) {
        console.error('Import error:', err);
        res.status(500).json({ message: err.message });
    }
});


// Add this new route
router.post('/update-quantities', async (req, res) => {
    try {
        const { updates } = req.body;
        if (!updates || !Array.isArray(updates)) {
            return res.status(400).json({ message: 'Données de mise à jour invalides' });
        }

        let updatedCount = 0;
        const bulkOps = [];

        updates.forEach(update => {
            bulkOps.push({
                updateOne: {
                    filter: { 
                        _id: update.productId,
                        'variants.name': update.variantName
                    },
                    update: {
                        $set: { 
                            'variants.$.quantity': update.newQuantity,
                            'variants.$.available': update.newQuantity > 0
                        }
                    }
                }
            });
        });

        if (bulkOps.length > 0) {
            const result = await Product.bulkWrite(bulkOps);
            updatedCount = result.modifiedCount;
        }

        res.json({
            success: true,
            updatedCount
        });
    } catch (err) {
        console.error('Erreur de mise à jour des quantités: ', err);
        res.status(500).json({ message: err.message });
    }
});


module.exports = router;