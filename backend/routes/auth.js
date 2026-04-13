const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { getDB } = require('../db');
const { JWT_SECRET } = require('../middleware/auth');

const GOOGLE_CLIENT_ID = '603994231432-bu9qli32eq7u4sn5a73fi3gd4cgbrr53.apps.googleusercontent.com';

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

router.post('/google', async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ error: 'Credential required' });

  try {
    const client = new OAuth2Client(GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
    const { sub: google_id, email, name } = ticket.getPayload();

    const db = getDB();

    // Find by google_id first, then by email (to link existing accounts)
    let user = db.prepare('SELECT * FROM users WHERE google_id = ?').get(google_id);

    if (!user) {
      user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
      if (user) {
        db.prepare('UPDATE users SET google_id = ? WHERE id = ?').run(google_id, user.id);
        user = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
      } else {
        // Generate unique username from email prefix
        let base = (email.split('@')[0] || name || 'user').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20) || 'user';
        let username = base;
        let n = 1;
        while (db.prepare('SELECT id FROM users WHERE username = ?').get(username)) {
          username = `${base}${n++}`;
        }
        const result = db
          .prepare('INSERT INTO users (username, email, password_hash, google_id) VALUES (?, ?, ?, ?)')
          .run(username, email.toLowerCase(), 'GOOGLE_OAUTH', google_id);
        user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
      }
    }

    const { password_hash, ...safeUser } = user;
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: safeUser, token });
  } catch (err) {
    console.error('Google auth error:', err.message);
    res.status(401).json({ error: 'Google sign-in failed' });
  }
});

module.exports = router;
