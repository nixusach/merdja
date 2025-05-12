const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const Order = require('../models/Order');

// Middleware de vérification d'administration
const verifyAdmin = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'Non autorisé' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Vous devriez également vérifier si l'utilisateur est admin dans votre base de données
        // Pour simplifier, nous allons juste vérifier le token ici
        // Dans une application réelle, vous devriez interroger la base de données pour vérifier le statut admin
        if (!decoded.user) {
            return res.status(401).json({ error: 'Non autorisé' });
        }
        
        next();
    } catch (err) {
        console.error('Erreur de vérification admin:', err);
        res.status(401).json({ error: 'Non autorisé' });
    }
};

// Appliquer le middleware à toutes les routes admin-orders
router.use(verifyAdmin);

// Obtenir toutes les commandes (avec filtre de statut optionnel)
router.get('/', async (req, res) => {
    try {
        let query = {};
        if (req.query.status) {
            query.status = req.query.status;
        }
        
        const orders = await Order.find(query)
            .sort({ createdAt: -1 })
            .populate('items.productId'); // Remplir les informations du produit
            
        res.json(orders);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Compléter une commande
router.put('/:id/complete', async (req, res) => {
    try {
        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { status: 'completed' },
            { new: true }
        );
        
        if (!order) {
            return res.status(404).json({ error: 'Commande non trouvée' });
        }
        
        res.json(order);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Supprimer une commande
router.delete('/:id', async (req, res) => {
    try {
        const order = await Order.findByIdAndDelete(req.params.id);
        
        if (!order) {
            return res.status(404).json({ error: 'Commande non trouvée' });
        }
        
        res.json({ message: 'Commande supprimée avec succès' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;