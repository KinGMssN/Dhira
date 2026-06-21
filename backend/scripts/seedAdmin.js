/**
 * scripts/seedAdmin.js
 * Run once:  npm run seed-admin
 * Creates the admin user from .env ADMIN_USERNAME / ADMIN_PASSWORD.
 * Safe to run again — won't duplicate if username already exists.
 */

'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const Admin    = require('../models/Admin');

(async () => {
  if (!process.env.MONGODB_URI) {
    console.error('✗ MONGODB_URI not set in .env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✓ Connected to MongoDB');

  const username = (process.env.ADMIN_USERNAME || 'admin').toLowerCase().trim();
  const password =  process.env.ADMIN_PASSWORD || 'dhira2024';

  const existing = await Admin.findOne({ username });
  if (existing) {
    console.log(`ℹ  Admin "${username}" already exists — skipping.`);
    await mongoose.disconnect();
    return;
  }

  await Admin.create({ username, password });
  console.log(`✓ Admin user "${username}" created successfully.`);
  console.log('  → Log in at your admin panel and change your password immediately.');

  await mongoose.disconnect();
  process.exit(0);
})().catch(err => {
  console.error('✗ Seed failed:', err.message);
  process.exit(1);
});
