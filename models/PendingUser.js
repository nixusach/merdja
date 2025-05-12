const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const PendingUserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Please provide a username'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters']
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  phone: {
    type: String,
    required: [true, 'Please provide a phone number'],
    trim: true,
    match: [
      /^[0-9]{10,15}$/,
      'Please provide a valid phone number (10-15 digits)'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { collection: 'myPendingUsers' });

// Remove the pre-save hook for hashing - we'll handle this in User.js only
// Just export the model as is
module.exports = mongoose.model('PendingUser', PendingUserSchema);