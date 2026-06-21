/**
 * routes/auth.js
 * POST /api/auth/login
 * PUT  /api/auth/credentials  (protected)
 */

'use strict';

const express    = require('express');
const jwt        = require('jsonwebtoken');
const Admin      = require('../models/Admin');
const requireAuth = require('../middleware/auth');

const router = express.Router();

// ── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    // Find admin — explicitly select password (it's hidden by default)
    const admin = await Admin.findOne({ username: username.trim().toLowerCase() }).select('+password');
    if (!admin) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const match = await admin.comparePassword(password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const token = jwt.sign(
      { id: admin._id, username: admin.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      token,
      admin: { id: admin._id, username: admin.username },
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
  } catch (err) {
    console.error('[Auth/login]', err);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// ── PUT /api/auth/credentials (protected) ───────────────────────────────────
// Change username and/or password
router.put('/credentials', requireAuth, async (req, res) => {
  try {
    const { username, password, currentPassword } = req.body;

    if (!currentPassword) {
      return res.status(400).json({ error: 'Current password is required to update credentials.' });
    }

    const admin = await Admin.findById(req.admin.id).select('+password');
    if (!admin) return res.status(404).json({ error: 'Admin not found.' });

    const match = await admin.comparePassword(currentPassword);
    if (!match) return res.status(401).json({ error: 'Current password is incorrect.' });

    if (username) admin.username = username.trim().toLowerCase();
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters.' });
      }
      admin.password = password; // pre-save hook will hash it
    }

    await admin.save();

    // Issue fresh token with possibly new username
    const token = jwt.sign(
      { id: admin._id, username: admin.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({ message: 'Credentials updated.', token, admin: { username: admin.username } });
  } catch (err) {
    console.error('[Auth/credentials]', err);
    res.status(500).json({ error: 'Server error while updating credentials.' });
  }
});

// ── GET /api/auth/verify (protected) ────────────────────────────────────────
// Client calls this on load to check if stored token is still valid
router.get('/verify', requireAuth, (req, res) => {
  res.json({ valid: true, admin: req.admin });
});

module.exports = router;
