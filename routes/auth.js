const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const User = require('../models/User');
const PendingUser = require('../models/PendingUser');
require('dotenv').config();

// Route d'inscription
router.post('/register', async (req, res) => {
  const { username, email, password, phone } = req.body;

  if (!username || !email || !password || !phone) {
    return res.status(400).json({ success: false, message: 'Veuillez remplir tous les champs' });
  }

  try {
    // Vérification insensible à la casse des utilisateurs existants
    const existingUser = await User.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
    const existingPendingUser = await PendingUser.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
    
    if (existingUser || existingPendingUser) {
      return res.status(400).json({ 
        success: false,
        message: 'Un utilisateur existe déjà avec cet email'
      });
    }

    // Créer un utilisateur en attente avec mot de passe en clair (sera haché lors de l'approbation)
    const pendingUser = await PendingUser.create({
      username,
      email: email.toLowerCase(),
      phone,
      password // Stocker le mot de passe en clair - sera haché lors du transfert vers la collection User
    });

    res.status(201).json({ 
      success: true,
      message: 'Inscription soumise pour approbation. Vous serez notifié lorsque votre compte sera activé.'
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }
    console.error(err);
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur lors de l\'inscription'
    });
  }
});

// Route de connexion
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ 
      success: false,
      message: 'Veuillez fournir un email et un mot de passe' 
    });
  }

  try {
    // Recherche d'email insensible à la casse, inclure manuellement le champ password
    const user = await User.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } }).select('+password');

    if (!user) {
      const isPending = await PendingUser.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
      return res.status(401).json({ 
        success: false,
        message: isPending ? 
          'Votre compte est en attente d\'approbation. Veuillez attendre l\'approbation de l\'administrateur.' : 
          'Identifiants invalides' 
      });
    }

    // Utiliser la méthode matchPassword définie dans le modèle User
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ 
        success: false,
        message: 'Identifiants invalides' 
      });
    }

    // Créer un token
    const token = jwt.sign(
      {
        user: {
          _id: user._id,
          email: user.email,
          name: user.username,
          phone: user.phone
        }
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: '4h' }
    );

    // Déterminer le chemin de redirection en fonction du statut admin
    const redirectPath = user.isAdmin ? '/admin-users.html' : '/products.html';

    res.status(200).json({ 
      success: true,
      token,
      userId: user._id,
      username: user.username,
      isAdmin: user.isAdmin,
      redirectPath,
      message: 'Connexion réussie ! Bienvenue !'
    });
  } catch (err) {
    console.error('Erreur de connexion:', err);
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur lors de la connexion'
    });
  }
});

// Route de déconnexion
router.get('/logout', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Déconnexion réussie'
  });
});

// Vérification du statut admin
router.get('/check-admin', async (req, res) => {
  try {
      // Récupérer le token depuis le header
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
          return res.status(401).json({ isAdmin: false });
      }
      
      // Vérifier le token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Trouver l'utilisateur
      const user = await User.findById(decoded.user._id);
      
      if (!user) {
          return res.status(401).json({ isAdmin: false });
      }
      
      res.json({ isAdmin: user.isAdmin });
  } catch (err) {
      console.error('Erreur de vérification admin:', err);
      res.status(401).json({ isAdmin: false });
  }
});

module.exports = router;