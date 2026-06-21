/**
 * models/Admin.js
 * Mongoose schema for admin user (single-user CMS)
 */

'use strict';

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const AdminSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [50, 'Username cannot exceed 50 characters'],
    },
    password: {
      type: String,
      required: true,
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Never returned in queries by default
    },
  },
  { timestamps: true }
);

// Hash password before saving
AdminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Instance method: compare plain password with hash
AdminSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('Admin', AdminSchema);
