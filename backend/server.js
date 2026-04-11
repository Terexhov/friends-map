const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB } = require('./db');

const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const placesRoutes = require('./routes/places');
const reviewsRoutes = require('./routes/reviews');

const app = express();
const PORT = 3001;

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/places', placesRoutes);
app.use('/api/reviews', reviewsRoutes);

initDB();

app.listen(PORT, () => {
  console.log(`\n  Backend running at http://localhost:${PORT}\n`);
});
