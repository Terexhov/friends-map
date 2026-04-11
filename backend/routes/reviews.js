const express = require('express');
const { getDB } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Add a review
router.post('/', authMiddleware, (req, res) => {
  const { place_id, rating, text } = req.body;

  if (!place_id || !rating)
    return res.status(400).json({ error: 'place_id and rating are required' });

  const ratingNum = parseInt(rating);
  if (ratingNum < 1 || ratingNum > 5)
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });

  const db = getDB();

  const existing = db
    .prepare('SELECT id FROM reviews WHERE place_id = ? AND user_id = ?')
    .get(place_id, req.user.id);
  if (existing)
    return res.status(400).json({ error: 'You have already reviewed this place' });

  const result = db
    .prepare('INSERT INTO reviews (place_id, user_id, rating, text) VALUES (?, ?, ?, ?)')
    .run(place_id, req.user.id, ratingNum, text?.trim() || null);

  const review = db
    .prepare(`
      SELECT r.*, u.username, u.avatar, 0 as likes_count, 0 as user_liked
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.id = ?
    `)
    .get(result.lastInsertRowid);

  res.json(review);
});

// Toggle like on a review
router.post('/:id/like', authMiddleware, (req, res) => {
  const db = getDB();
  const review = db.prepare('SELECT id FROM reviews WHERE id = ?').get(req.params.id);
  if (!review) return res.status(404).json({ error: 'Review not found' });

  const existing = db
    .prepare('SELECT id FROM review_likes WHERE review_id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);

  if (existing) {
    db.prepare('DELETE FROM review_likes WHERE review_id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ liked: false });
  } else {
    db.prepare('INSERT INTO review_likes (review_id, user_id) VALUES (?, ?)').run(req.params.id, req.user.id);
    res.json({ liked: true });
  }
});

// Delete a review (owner only)
router.delete('/:id', authMiddleware, (req, res) => {
  const db = getDB();
  const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(req.params.id);
  if (!review) return res.status(404).json({ error: 'Review not found' });
  if (review.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

  db.prepare('DELETE FROM reviews WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
