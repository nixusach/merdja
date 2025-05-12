const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const Product = require('../models/Product');
const auth = require('../middleware/auth');

// Fonction helper pour valider l'utilisateur et les champs requis
const validateRequest = (req) => {
    if (!req.user || !req.user._id) {
        console.error('Authentification utilisateur invalide - req.user:', req.user);
        throw new Error('Authentification utilisateur invalide');
    }
    return req.user._id;
};

// Ajouter un article au panier avec variantes
router.post('/', auth, async (req, res) => {
    try {
        const userId = validateRequest(req);
        const { productId, productName, variants, image } = req.body;

        // Valider les champs requis
        if (!productId) {
            return res.status(400).json({ message: 'L\'ID du produit est requis' });
        }
        if (!variants || !Array.isArray(variants) || variants.length === 0) {
            return res.status(400).json({ message: 'Au moins une variante est requise' });
        }

        // Valider chaque variante
        for (const variant of variants) {
            if (!variant.variantName || !variant.price || !variant.quantity) {
                return res.status(400).json({ message: 'Chaque variante doit avoir un nom, un prix et une quantité' });
            }
            if (variant.quantity < 1) {
                return res.status(400).json({ message: 'La quantité doit être d\'au moins 1' });
            }
            if (typeof variant.price !== 'number' || variant.price <= 0) {
                return res.status(400).json({ message: 'Le prix doit être un nombre positif' });
            }
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Produit non trouvé' });
        }

        let cart = await Cart.findOne({ userId });
        if (!cart) {
            cart = new Cart({ userId, items: [] });
        }

        // Vérifier si le produit existe déjà dans le panier
        const existingItemIndex = cart.items.findIndex(
            item => item.productId.toString() === productId
        );

        if (existingItemIndex >= 0) {
            // Produit existe dans le panier, mettre à jour les variantes
            const existingItem = cart.items[existingItemIndex];
            
            variants.forEach(newVariant => {
                const existingVariantIndex = existingItem.variants.findIndex(
                    v => v.variantName === newVariant.variantName
                );
                
                if (existingVariantIndex >= 0) {
                    // Variante existe, mettre à jour la quantité
                    existingItem.variants[existingVariantIndex].quantity += newVariant.quantity;
                } else {
                    // Nouvelle variante, ajouter au tableau
                    existingItem.variants.push({
                        variantName: newVariant.variantName,
                        price: newVariant.price,
                        quantity: newVariant.quantity
                    });
                }
            });
        } else {
            // Nouveau produit, ajouter au panier avec variantes
            cart.items.push({
                productId,
                productName: productName || product.name,
                variants: variants.map(v => ({
                    variantName: v.variantName,
                    price: v.price,
                    quantity: v.quantity
                })),
                image: image || product.images?.[0] || '',
                totalPrice: variants.reduce((total, v) => total + (v.price * v.quantity), 0)
            });
        }

        await cart.save();
        res.status(200).json({
            message: 'Produit ajouté au panier avec succès',
            cart
        });
    } catch (err) {
        console.error('Erreur d\'ajout au panier:', err);
        res.status(500).json({ 
            message: err.message || 'Échec de l\'ajout au panier' 
        });
    }
});

// Obtenir le panier de l'utilisateur avec variantes
router.get('/', auth, async (req, res) => {
    try {
        const userId = validateRequest(req);
        const cart = await Cart.findOne({ userId }).populate('items.productId');

        if (!cart) {
            return res.status(200).json({ items: [], total: 0, count: 0 });
        }

        // Calculer les totaux pour chaque article et variante
        const enhancedItems = cart.items.map(item => {
            const itemTotal = item.variants.reduce(
                (total, variant) => total + (variant.price * variant.quantity), 0
            );
            
            return {
                ...item.toObject(),
                total: itemTotal,
                variants: item.variants.map(variant => ({
                    ...variant.toObject(),
                    variantTotal: variant.price * variant.quantity
                }))
            };
        });

        // Calculer le total du panier
        const cartTotal = enhancedItems.reduce(
            (total, item) => total + item.total, 0
        );

        // Calculer le nombre total d'articles (somme de toutes les quantités)
        const itemCount = enhancedItems.reduce(
            (count, item) => count + item.variants.reduce(
                (sum, variant) => sum + variant.quantity, 0
            ), 0
        );

        res.status(200).json({
            items: enhancedItems,
            total: cartTotal,
            count: itemCount
        });
    } catch (err) {
        console.error('Erreur de récupération du panier:', err);
        res.status(500).json({ 
            message: err.message || 'Échec de la récupération du panier' 
        });
    }
});

// Mettre à jour la quantité d'une variante dans le panier
router.put('/:itemId/variants/:variantName', auth, async (req, res) => {
    try {
        const userId = validateRequest(req);
        const { quantity } = req.body;
        const { itemId, variantName } = req.params;

        if (!quantity || quantity < 1) {
            return res.status(400).json({ message: 'Une quantité valide est requise' });
        }

        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ message: 'Panier non trouvé' });
        }

        const itemIndex = cart.items.findIndex(
            item => item._id.toString() === itemId
        );

        if (itemIndex === -1) {
            return res.status(404).json({ message: 'Article non trouvé dans le panier' });
        }

        const variantIndex = cart.items[itemIndex].variants.findIndex(
            v => v.variantName === variantName
        );

        if (variantIndex === -1) {
            return res.status(404).json({ message: 'Variante non trouvée dans l\'article' });
        }

        cart.items[itemIndex].variants[variantIndex].quantity = quantity;
        await cart.save();

        res.status(200).json(cart);
    } catch (err) {
        console.error('Erreur de mise à jour de variante:', err);
        res.status(500).json({ 
            message: err.message || 'Échec de la mise à jour de la variante' 
        });
    }
});

// Supprimer une variante du panier
router.delete('/:itemId/variants/:variantName', auth, async (req, res) => {
    try {
        const userId = validateRequest(req);
        const { itemId, variantName } = req.params;

        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ message: 'Panier non trouvé' });
        }

        const itemIndex = cart.items.findIndex(
            item => item._id.toString() === itemId
        );

        if (itemIndex === -1) {
            return res.status(404).json({ message: 'Article non trouvé dans le panier' });
        }

        const variantIndex = cart.items[itemIndex].variants.findIndex(
            v => v.variantName === variantName
        );

        if (variantIndex === -1) {
            return res.status(404).json({ message: 'Variante non trouvée dans l\'article' });
        }

        // Supprimer la variante
        cart.items[itemIndex].variants.splice(variantIndex, 1);

        // Si aucune variante restante, supprimer tout l'article
        if (cart.items[itemIndex].variants.length === 0) {
            cart.items.splice(itemIndex, 1);
        }

        await cart.save();
        res.status(200).json(cart);
    } catch (err) {
        console.error('Erreur de suppression de variante:', err);
        res.status(500).json({ 
            message: err.message || 'Échec de la suppression de la variante' 
        });
    }
});

// Supprimer un article complet du panier
router.delete('/items/:itemId', auth, async (req, res) => {
    try {
        const userId = validateRequest(req);
        const { itemId } = req.params;

        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ message: 'Panier non trouvé' });
        }

        const itemIndex = cart.items.findIndex(
            item => item._id.toString() === itemId
        );

        if (itemIndex === -1) {
            return res.status(404).json({ message: 'Article non trouvé dans le panier' });
        }

        cart.items.splice(itemIndex, 1);
        await cart.save();
        
        res.status(200).json(cart);
    } catch (err) {
        console.error('Erreur de suppression du panier:', err);
        res.status(500).json({ 
            message: err.message || 'Échec de la suppression de l\'article' 
        });
    }
});

// Vider complètement le panier
router.delete('/', auth, async (req, res) => {
    try {
        const userId = validateRequest(req);
        await Cart.deleteOne({ userId });
        res.status(200).json({ message: 'Panier vidé avec succès' });
    } catch (err) {
        console.error('Erreur de vidage du panier:', err);
        res.status(500).json({ 
            message: err.message || 'Échec du vidage du panier' 
        });
    }
});

// Passer la commande et créer une commande (mis à jour pour les variantes)
router.post('/checkout', auth, async (req, res) => {
    try {
        const userId = validateRequest(req);
        const { cartItems } = req.body;

        if (!cartItems || cartItems.length === 0) {
            return res.status(400).json({ message: 'Le panier est vide' });
        }

        const user = await User.findById(userId).select('email username phone');
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        // Vérifier les produits et variantes
        for (const item of cartItems) {
            const product = await Product.findById(item.productId);
            if (!product) {
                return res.status(400).json({ 
                    message: `Le produit ${item.productName} n'existe plus` 
                });
            }

            // Vérifier si toutes les variantes existent encore
            for (const variant of item.variants) {
                const productVariant = product.variants.find(v => v.name === variant.variantName);
                if (!productVariant) {
                    return res.status(400).json({ 
                        message: `La variante ${variant.variantName} pour le produit ${item.productName} n'existe plus` 
                    });
                }
                if (!productVariant.available) {
                    return res.status(400).json({ 
                        message: `La variante ${variant.variantName} pour le produit ${item.productName} n'est plus disponible` 
                    });
                }
            }
        }

        // Calculer le montant total
        const totalAmount = cartItems.reduce(
            (total, item) => total + item.variants.reduce(
                (sum, variant) => sum + (variant.price * variant.quantity), 0
            ), 0
        );

        // Créer la commande avec variantes
        const order = new Order({
            userId,
            userEmail: user.email,
            userName: user.username,
            userPhone: user.phone,
            items: cartItems.map(item => ({
                productId: item.productId,
                productName: item.productName,
                variants: item.variants.map(variant => ({
                    variantName: variant.variantName,
                    quantity: variant.quantity,
                    price: variant.price
                })),
                image: item.image,
                totalPrice: item.variants.reduce(
                    (sum, variant) => sum + (variant.price * variant.quantity), 0
                )
            })),
            totalAmount,
            status: 'pending'
        });

        await order.save();
        
        // Vider le panier après création de la commande
        await Cart.deleteOne({ userId });

        res.status(201).json({
            message: 'Commande créée avec succès. Notre équipe vous contactera bientôt.',
            orderId: order._id,
            total: order.totalAmount
        });
    } catch (err) {
        console.error('Erreur de commande:', err);
        res.status(500).json({ 
            message: err.message || 'Échec du traitement de la commande' 
        });
    }
});

// Route de test (conserver telle quelle)
router.get('/test-user/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('email username phone');
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;