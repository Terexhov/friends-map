const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getDB } = require('../db');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password)
    return res.status(400).json({ error: 'All fields are required' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' });

  try {
    const db = getDB();
    const passwordHash = await bcrypt.hash(password, 10);
    const result = db
      .prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)')
      .run(username.trim(), email.trim().toLowerCase(), passwordHash);

    const user = db
      .prepare('SELECT id, username, email, avatar, bio, created_at FROM users WHERE id = ?')
      .get(result.lastInsertRowid);

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user, token });
  } catch (err) {
    if (err.message.includes('UNIQUE'))
      res.status(400).json({ error: 'Username or email already taken' });
    else
      res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required' });

  try {
    const db = getDB();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());

    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    const { password_hash, ...safeUser } = user;
    res.json({ user: safeUser, token });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
