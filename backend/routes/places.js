const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getDB } = require('../db');
const { authMiddleware, optionalAuth } = require('../middleware/auth');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const base = process.env.DATA_DIR || path.join(__dirname, '../data');
    const dir = path.join(base, 'uploads/places');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `place-${Date.now()}-${Math.random().toString(36).slice(2, 9)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images are allowed'));
  },
});

// Get all places (for map markers)
router.get('/', optionalAuth, (req, res) => {
  const db = getDB();
  const places = db
    .prepare(`
      SELECT p.*, u.username, u.avatar,
        COALESCE((SELECT AVG(rating) FROM reviews WHERE place_id = p.id), 0) as avg_rating,
        (SELECT COUNT(*) FROM reviews WHERE place_id = p.id) as review_count,
        (SELECT COUNT(*) FROM place_photos WHERE place_id = p.id) as photo_count,
        (SELECT COUNT(*) FROM place_likes WHERE place_id = p.id) as likes_count
      FROM places p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
    `)
    .all();

  if (req.user) {
    const liked = new Set(
      db.prepare('SELECT place_id FROM place_likes WHERE user_id = ?')
        .all(req.user.id).map(l => l.place_id)
    );
    places.forEach(p => { p.user_liked = liked.has(p.id) ? 1 : 0; });
  } else {
    places.forEach(p => { p.user_liked = 0; });
  }

  res.json(places);
});

// Get single place with photos and reviews
router.get('/:id', optionalAuth, (req, res) => {
  const db = getDB();
  const place = db
    .prepare(`
      SELECT p.*, u.username, u.avatar,
        COALESCE((SELECT AVG(rating) FROM reviews WHERE place_id = p.id), 0) as avg_rating,
        (SELECT COUNT(*) FROM reviews WHERE place_id = p.id) as review_count,
        (SELECT COUNT(*) FROM place_likes WHERE place_id = p.id) as likes_count
      FROM places p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `)
    .get(req.params.id);

  if (!place) return res.status(404).json({ error: 'Place not found' });

  const photos = db
    .prepare(`
      SELECT pp.*, u.username, u.avatar
      FROM place_photos pp
      JOIN users u ON pp.user_id = u.id
      WHERE pp.place_id = ?
      ORDER BY pp.created_at DESC
    `)
    .all(req.params.id);

  const reviews = db
    .prepare(`
      SELECT r.*, u.username, u.avatar,
        (SELECT COUNT(*) FROM review_likes WHERE review_id = r.id) as likes_count
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.place_id = ?
      ORDER BY r.created_at DESC
    `)
    .all(req.params.id);

  // Attach user_liked flag safely
  if (req.user) {
    const likedReviews = new Set(
      db.prepare('SELECT review_id FROM review_likes WHERE user_id = ?')
        .all(req.user.id).map(l => l.review_id)
    );
    reviews.forEach(r => { r.user_liked = likedReviews.has(r.id) ? 1 : 0; });
    const placeLiked = db.prepare('SELECT id FROM place_likes WHERE place_id = ? AND user_id = ?')
      .get(req.params.id, req.user.id);
    place.user_liked = placeLiked ? 1 : 0;
  } else {
    reviews.forEach(r => { r.user_liked = 0; });
    place.user_liked = 0;
  }

  res.json({ ...place, photos, reviews });
});

// Like / unlike a place
router.post('/:id/like', authMiddleware, (req, res) => {
  const db = getDB();
  const place = db.prepare('SELECT id FROM places WHERE id = ?').get(req.params.id);
  if (!place) return res.status(404).json({ error: 'Place not found' });
  const existing = db.prepare('SELECT id FROM place_likes WHERE place_id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);
  if (existing) {
    db.prepare('DELETE FROM place_likes WHERE place_id = ? AND user_id = ?').run(req.params.id, req.user.id);
    return res.json({ liked: false });
  }
  db.prepare('INSERT INTO place_likes (place_id, user_id) VALUES (?, ?)').run(req.params.id, req.user.id);
  res.json({ liked: true });
});

// Create a new place
router.post('/', authMiddleware, upload.array('photos', 10), (req, res) => {
  const { name, description, category, cuisine, price_level, website, hashtags, address, own_rating, lat, lng } = req.body;

  if (!name || !lat || !lng)
    return res.status(400).json({ error: 'name, lat and lng are required' });

  const db = getDB();
  const result = db
    .prepare('INSERT INTO places (user_id, name, description, category, cuisine, price_level, website, hashtags, address, own_rating, lat, lng) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(req.user.id, name.trim(), description || null, category || 'other', cuisine || null, price_level ? parseInt(price_level) : 0, website || null, hashtags || null, address || null, own_rating ? parseInt(own_rating) : null, parseFloat(lat), parseFloat(lng));

  const placeId = result.lastInsertRowid;

  if (req.files?.length) {
    const ins = db.prepare('INSERT INTO place_photos (place_id, user_id, filename) VALUES (?, ?, ?)');
    req.files.forEach((f) => ins.run(placeId, req.user.id, f.filename));
  }

  const place = db
    .prepare(`
      SELECT p.*, u.username, u.avatar, 0 as avg_rating, 0 as review_count, 0 as photo_count
      FROM places p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `)
    .get(placeId);

  res.json(place);
});

// Add photos to existing place
router.post('/:id/photos', authMiddleware, upload.array('photos', 10), (req, res) => {
  const db = getDB();
  const place = db.prepare('SELECT id FROM places WHERE id = ?').get(req.params.id);
  if (!place) return res.status(404).json({ error: 'Place not found' });

  if (!req.files?.length)
    return res.status(400).json({ error: 'No photos uploaded' });

  const ins = db.prepare('INSERT INTO place_photos (place_id, user_id, filename) VALUES (?, ?, ?)');
  req.files.forEach((f) => ins.run(req.params.id, req.user.id, f.filename));

  res.json({ added: req.files.length });
});

// Edit a place (owner only)
router.put('/:id', authMiddleware, (req, res) => {
  const db = getDB();
  const place = db.prepare('SELECT * FROM places WHERE id = ?').get(req.params.id);
  if (!place) return res.status(404).json({ error: 'Place not found' });
  if (place.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

  const { name, description, category, cuisine, price_level, website, hashtags, address, own_rating } = req.body;

  db.prepare(`
    UPDATE places SET
      name = ?, description = ?, category = ?, cuisine = ?,
      price_level = ?, website = ?, hashtags = ?, address = ?, own_rating = ?
    WHERE id = ?
  `).run(
    (name || place.name).trim(),
    description ?? place.description,
    category || place.category,
    cuisine ?? place.cuisine,
    price_level !== undefined ? parseInt(price_level) : place.price_level,
    website ?? place.website,
    hashtags ?? place.hashtags,
    address ?? place.address,
    own_rating !== undefined && own_rating !== '' ? parseInt(own_rating) : place.own_rating,
    req.params.id
  );

  const updated = db.prepare(`
    SELECT p.*, u.username, u.avatar,
      COALESCE((SELECT AVG(rating) FROM reviews WHERE place_id = p.id), 0) as avg_rating,
      (SELECT COUNT(*) FROM reviews WHERE place_id = p.id) as review_count,
      (SELECT COUNT(*) FROM place_photos WHERE place_id = p.id) as photo_count,
      (SELECT COUNT(*) FROM place_likes WHERE place_id = p.id) as likes_count
    FROM places p JOIN users u ON p.user_id = u.id
    WHERE p.id = ?
  `).get(req.params.id);
  res.json(updated);
});

// Toggle featured status (owner only)
router.post('/:id/feature', authMiddleware, (req, res) => {
  const db = getDB();
  const place = db.prepare('SELECT * FROM places WHERE id = ?').get(req.params.id);
  if (!place) return res.status(404).json({ error: 'Place not found' });
  if (place.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

  const newVal = place.is_featured ? 0 : 1;
  db.prepare('UPDATE places SET is_featured = ? WHERE id = ?').run(newVal, req.params.id);
  res.json({ is_featured: newVal });
});

// Delete a place (owner only)
router.delete('/:id', authMiddleware, (req, res) => {
  const db = getDB();
  const place = db.prepare('SELECT * FROM places WHERE id = ?').get(req.params.id);
  if (!place) return res.status(404).json({ error: 'Place not found' });
  if (place.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

  db.prepare('DELETE FROM places WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
