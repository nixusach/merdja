const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const PendingUser = require('../models/PendingUser');
const jwt = require('jsonwebtoken');

// Middleware admin
const requireAdmin = async (req, res, next) => {
    try {
        // Récupérer le token du header
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'Non autorisé' });
        }
        
        // Vérifier le token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Trouver l'utilisateur
        const user = await User.findById(decoded.user._id);
        
        if (!user || !user.isAdmin) {
            return res.status(403).json({ error: 'Accès admin requis' });
        }
        
        // Attacher l'utilisateur à la requête
        req.user = user;
        next();
    } catch (err) {
        console.error('Erreur auth admin:', err);
        res.status(401).json({ error: 'Non autorisé' });
    }
};

// Obtenir tous les utilisateurs
router.get('/', async (req, res) => {
    try {
        // Exclure les mots de passe de la réponse
        const users = await User.find().select('-password');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Rechercher des utilisateurs par nom d'utilisateur ou email
router.get('/search', async (req, res) => {
    try {
        const term = req.query.term;
        if (!term) {
            return res.status(400).json({ error: 'Un terme de recherche est requis' });
        }
        
        const users = await User.find({
            $or: [
                { username: { $regex: term, $options: 'i' } },
                { email: { $regex: term, $options: 'i' } }
            ]
        }).select('-password');
        
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/pending', async (req, res) => {
    try {
        const pendingUsers = await PendingUser.find().select('-password');
        res.json(pendingUsers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Utilisateurs en attente
router.post('/pending/:id/approve', async (req, res) => {
    try {
      const pendingUser = await PendingUser.findById(req.params.id);
      if (!pendingUser) {
        return res.status(404).json({ error: 'Utilisateur en attente non trouvé' });
      }
  
      // Vérifier si l'utilisateur existe déjà
      const existingUser = await User.findOne({ 
        email: { $regex: new RegExp(`^${pendingUser.email}$`, 'i') }
      });
      
      if (existingUser) {
        await PendingUser.findByIdAndDelete(req.params.id);
        return res.status(400).json({ error: 'L\'utilisateur existe déjà' });
      }
  
      // Créer un nouvel utilisateur
      const user = new User({
        username: pendingUser.username,
        email: pendingUser.email,
        phone: pendingUser.phone,
        password: pendingUser.password, // Serahaché par le pre-save hook de User
        isAdmin: false
      });
  
      await user.save();
      await PendingUser.findByIdAndDelete(req.params.id);
  
      res.json({ 
        success: true,
        message: 'Utilisateur approuvé avec succès',
        userId: user._id
      });
  
    } catch (err) {
      console.error('Erreur d\'approbation:', err);
      res.status(500).json({ 
        success: false,
        error: err.message,
        message: 'Erreur lors de l\'approbation de l\'utilisateur'
      });
    }
});

router.delete('/pending/:id/reject', async (req, res) => {
    try {
        const pendingUser = await PendingUser.findByIdAndDelete(req.params.id);
        if (!pendingUser) {
            return res.status(404).json({ error: 'Utilisateur en attente non trouvé' });
        }

        res.json({ message: 'Utilisateur rejeté avec succès' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Ajouter un utilisateur
router.post('/', async (req, res) => {
    try {
        const { username, email, phone, password, isAdmin } = req.body;
        
        // Vérifier si l'utilisateur existe déjà
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            return res.status(400).json({ error: 'Un utilisateur avec ce nom ou email existe déjà' });
        }
        
        // Hacher le mot de passe avant sauvegarde
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // Créer un nouvel utilisateur
        const user = new User({
            username,
            email,
            phone,
            password: hashedPassword,
            isAdmin: isAdmin || false
        });
        
        await user.save();
        
        // Ne pas renvoyer le mot de passe
        user.password = undefined;
        res.status(201).json(user);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Mettre à jour un utilisateur
router.put('/:id', async (req, res) => {
    try {
        const { username, email, phone, password, isAdmin } = req.body;
        const userId = req.params.id;
        
        // Trouver l'utilisateur
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }
        
        // Vérifier si le nouveau nom ou email est déjà pris
        if (username && username !== user.username) {
            const usernameExists = await User.findOne({ username, _id: { $ne: userId } });
            if (usernameExists) {
                return res.status(400).json({ error: 'Nom d\'utilisateur déjà pris' });
            }
            user.username = username;
        }
        
        if (email && email !== user.email) {
            const emailExists = await User.findOne({ email, _id: { $ne: userId } });
            if (emailExists) {
                return res.status(400).json({ error: 'Email déjà pris' });
            }
            user.email = email;
        }

        if (phone && phone !== user.phone) {
            user.phone = phone;
        }
        
        if (password) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
        }
        
        if (typeof isAdmin !== 'undefined') {
            user.isAdmin = isAdmin;
        }
        
        await user.save();
        
        // Ne pas renvoyer le mot de passe
        user.password = undefined;
        res.json(user);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Supprimer un utilisateur
router.delete('/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        
        const user = await User.findByIdAndDelete(userId);
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }
        
        res.json({ message: 'Utilisateur supprimé avec succès' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;