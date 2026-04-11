const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getDB } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const base = process.env.DATA_DIR || path.join(__dirname, '../data');
    const dir = path.join(base, 'uploads/avatars');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `avatar-${req.user.id}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images are allowed'));
  },
});

// Get user profile with places and reviews
router.get('/:id', (req, res) => {
  const db = getDB();
  const user = db
    .prepare('SELECT id, username, email, avatar, bio, created_at FROM users WHERE id = ?')
    .get(req.params.id);

  if (!user) return res.status(404).json({ error: 'User not found' });

  const places = db
    .prepare(`
      SELECT p.*,
        (SELECT AVG(rating) FROM reviews WHERE place_id = p.id) as avg_rating,
        (SELECT COUNT(*) FROM reviews WHERE place_id = p.id) as review_count
      FROM places p
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
    `)
    .all(req.params.id);

  const reviews = db
    .prepare(`
      SELECT r.*, p.name as place_name, p.id as place_id
      FROM reviews r
      JOIN places p ON r.place_id = p.id
      WHERE r.user_id = ?
      ORDER BY r.created_at DESC
    `)
    .all(req.params.id);

  res.json({ user, places, reviews });
});

// Update own profile
router.put('/me', authMiddleware, upload.single('avatar'), async (req, res) => {
  const db = getDB();
  const { bio, username } = req.body;
  const current = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

  const newAvatar = req.file ? req.file.filename : current.avatar;
  const newBio = bio !== undefined ? bio : current.bio;
  const newUsername = username ? username.trim() : current.username;

  if (newUsername !== current.username) {
    if (!newUsername || newUsername.length < 2)
      return res.status(400).json({ error: 'Имя пользователя должно быть не менее 2 символов' });
    const taken = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(newUsername, req.user.id);
    if (taken) return res.status(400).json({ error: 'Это имя уже занято' });
  }

  db.prepare('UPDATE users SET bio = ?, avatar = ?, username = ? WHERE id = ?').run(newBio, newAvatar, newUsername, req.user.id);

  const updated = db
    .prepare('SELECT id, username, email, avatar, bio, created_at FROM users WHERE id = ?')
    .get(req.user.id);

  res.json(updated);
});

module.exports = router;
