const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    password: { type: String, required: true },

    // Password recovery
    resetToken: { type: String, default: null },
    resetTokenExpiry: { type: Date, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
