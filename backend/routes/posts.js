/**
 * routes/posts.js
 *
 * PUBLIC  (no auth needed):
 *   GET  /api/posts              — all published posts (with optional ?category=)
 *   GET  /api/posts/:id          — single published post
 *
 * ADMIN (JWT required):
 *   GET    /api/posts/admin/all  — all posts including drafts
 *   POST   /api/posts            — create post
 *   PUT    /api/posts/:id        — full update post
 *   PATCH  /api/posts/:id/publish — toggle published flag
 *   DELETE /api/posts/:id        — delete one post
 *   DELETE /api/posts            — delete ALL posts (danger)
 *   POST   /api/posts/import     — bulk import posts
 */

'use strict';

const express     = require('express');
const Post        = require('../models/Post');
const requireAuth = require('../middleware/auth');

const router = express.Router();

// ── PUBLIC: Get published posts ───────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const filter = { published: true };
    if (req.query.category) filter.category = req.query.category;

    const posts = await Post.find(filter).sort({ date: -1 }).lean();
    res.json(posts.map(toClient));
  } catch (err) {
    console.error('[Posts/GET]', err);
    res.status(500).json({ error: 'Failed to fetch posts.' });
  }
});

// ── ADMIN: Get ALL posts (including drafts) ───────────────────────────────────
router.get('/admin/all', requireAuth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.category) filter.category = req.query.category;
    if (req.query.published !== undefined) filter.published = req.query.published === 'true';

    const posts = await Post.find(filter).sort({ date: -1 }).lean();
    res.json(posts.map(toClient));
  } catch (err) {
    console.error('[Posts/admin/all]', err);
    res.status(500).json({ error: 'Failed to fetch posts.' });
  }
});

// ── PUBLIC: Get single published post ────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, published: true }).lean();
    if (!post) return res.status(404).json({ error: 'Post not found.' });
    res.json(toClient(post));
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ error: 'Post not found.' });
    res.status(500).json({ error: 'Failed to fetch post.' });
  }
});

// ── ADMIN: Create post ────────────────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, body, excerpt, tag, category, published, date } = req.body;

    const post = await Post.create({
      title, body, excerpt, tag, category,
      published: !!published,
      date: date ? new Date(date) : new Date(),
    });

    res.status(201).json(toClient(post.toJSON()));
  } catch (err) {
    console.error('[Posts/POST]', err);
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    res.status(500).json({ error: 'Failed to create post.' });
  }
});

// ── ADMIN: Update post (full) ─────────────────────────────────────────────────
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { title, body, excerpt, tag, category, published, date } = req.body;

    const post = await Post.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          title, body, excerpt, tag, category,
          published: !!published,
          date: date ? new Date(date) : undefined,
        },
      },
      { new: true, runValidators: true }
    ).lean();

    if (!post) return res.status(404).json({ error: 'Post not found.' });
    res.json(toClient(post));
  } catch (err) {
    console.error('[Posts/PUT]', err);
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    if (err.name === 'CastError') return res.status(404).json({ error: 'Post not found.' });
    res.status(500).json({ error: 'Failed to update post.' });
  }
});

// ── ADMIN: Toggle publish ─────────────────────────────────────────────────────
router.patch('/:id/publish', requireAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    post.published = !post.published;
    await post.save();

    res.json({ id: post._id.toString(), published: post.published });
  } catch (err) {
    console.error('[Posts/PATCH publish]', err);
    if (err.name === 'CastError') return res.status(404).json({ error: 'Post not found.' });
    res.status(500).json({ error: 'Failed to toggle publish status.' });
  }
});

// ── ADMIN: Delete one post ────────────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const post = await Post.findByIdAndDelete(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found.' });
    res.json({ message: 'Post deleted.', id: req.params.id });
  } catch (err) {
    console.error('[Posts/DELETE one]', err);
    if (err.name === 'CastError') return res.status(404).json({ error: 'Post not found.' });
    res.status(500).json({ error: 'Failed to delete post.' });
  }
});

// ── ADMIN: Delete ALL posts ───────────────────────────────────────────────────
router.delete('/', requireAuth, async (req, res) => {
  try {
    const result = await Post.deleteMany({});
    res.json({ message: 'All posts deleted.', count: result.deletedCount });
  } catch (err) {
    console.error('[Posts/DELETE all]', err);
    res.status(500).json({ error: 'Failed to delete all posts.' });
  }
});

// ── ADMIN: Bulk import ────────────────────────────────────────────────────────
router.post('/import', requireAuth, async (req, res) => {
  try {
    const posts = req.body;
    if (!Array.isArray(posts)) return res.status(400).json({ error: 'Expected an array of posts.' });

    let imported = 0;
    for (const p of posts) {
      // Skip if _id already exists in DB
      const exists = p._id || p.id
        ? await Post.exists({ _id: p._id || p.id }).catch(() => false)
        : false;
      if (exists) continue;
      await Post.create({
        title: p.title, body: p.body, excerpt: p.excerpt, tag: p.tag,
        category: p.category || 'personal',
        published: !!p.published,
        date: p.date ? new Date(p.date) : new Date(),
      });
      imported++;
    }

    res.json({ message: `Imported ${imported} posts.`, imported });
  } catch (err) {
    console.error('[Posts/import]', err);
    res.status(500).json({ error: 'Failed to import posts.' });
  }
});

// ── Helper: normalise Mongoose doc for client ─────────────────────────────────
function toClient(doc) {
  return {
    id:        (doc._id || doc.id).toString(),
    title:     doc.title,
    body:      doc.body,
    excerpt:   doc.excerpt || '',
    tag:       doc.tag || '',
    category:  doc.category,
    published: doc.published,
    date:      doc.date,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

module.exports = router;
