const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// Dans routes/products.js, modifier la route shop pour inclure les variantes :
router.get('/shop', async (req, res) => {
    try {
        const products = await Product.find({}, 'name category variants available images');
        res.json(products);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Obtenir un produit par son nom
router.get('/name/:name', async (req, res) => {
    try {
        const productName = decodeURIComponent(req.params.name);
        const product = await Product.findOne({ name: productName });
        
        if (!product) {
            return res.status(404).json({ message: 'Produit non trouvé' });
        }
        res.json(product);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Ajouter cette nouvelle route pour les produits en vedette
router.get('/featured', async (req, res) => {
    try {
        const featuredProducts = await Product.find({ featured: true })
            .select('name category variants available images');
        res.json(featuredProducts);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;