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

// Edit a review (owner only)
router.put('/:id', authMiddleware, (req, res) => {
  const { rating, text } = req.body;
  const db = getDB();
  const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(req.params.id);
  if (!review) return res.status(404).json({ error: 'Review not found' });
  if (review.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

  const ratingNum = rating ? parseInt(rating) : review.rating;
  if (ratingNum < 1 || ratingNum > 5)
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });

  db.prepare('UPDATE reviews SET rating = ?, text = ? WHERE id = ?')
    .run(ratingNum, text?.trim() ?? review.text, req.params.id);

  const updated = db.prepare(`
    SELECT r.*, u.username, u.avatar,
      (SELECT COUNT(*) FROM review_likes WHERE review_id = r.id) as likes_count
    FROM reviews r JOIN users u ON r.user_id = u.id
    WHERE r.id = ?
  `).get(req.params.id);
  res.json(updated);
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

// Get comments for a review
router.get('/:id/comments', (req, res) => {
  const db = getDB();
  const comments = db.prepare(`
    SELECT rc.*, u.username, u.avatar
    FROM review_comments rc
    JOIN users u ON rc.user_id = u.id
    WHERE rc.review_id = ?
    ORDER BY rc.created_at ASC
  `).all(req.params.id);
  res.json(comments);
});

// Add a comment to a review
router.post('/:id/comments', authMiddleware, (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'Text is required' });

  const db = getDB();
  const review = db.prepare('SELECT id FROM reviews WHERE id = ?').get(req.params.id);
  if (!review) return res.status(404).json({ error: 'Review not found' });

  const result = db.prepare('INSERT INTO review_comments (review_id, user_id, text) VALUES (?, ?, ?)')
    .run(req.params.id, req.user.id, text.trim());

  const comment = db.prepare(`
    SELECT rc.*, u.username, u.avatar
    FROM review_comments rc
    JOIN users u ON rc.user_id = u.id
    WHERE rc.id = ?
  `).get(result.lastInsertRowid);

  res.json(comment);
});

// Delete own comment
router.delete('/:id/comments/:commentId', authMiddleware, (req, res) => {
  const db = getDB();
  const comment = db.prepare('SELECT * FROM review_comments WHERE id = ?').get(req.params.commentId);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });
  if (comment.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

  db.prepare('DELETE FROM review_comments WHERE id = ?').run(req.params.commentId);
  res.json({ success: true });
});

module.exports = router;
