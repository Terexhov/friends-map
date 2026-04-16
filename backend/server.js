const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB } = require('./db');

const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const placesRoutes = require('./routes/places');
const reviewsRoutes = require('./routes/reviews');
const { swaggerUi, spec } = require('./swagger');

const app = express();
const PORT = process.env.PORT || 3001;
const IS_PROD = process.env.NODE_ENV === 'production';

// In production the frontend is built into /app/frontend/dist and served by Express
// CORS is only needed in local dev (different ports)
if (!IS_PROD) {
  app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
}

app.use(express.json());
app.use((req, res, next) => {
  const orig = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 400) {
      console.error(`[${req.method}] ${req.path} → ${res.statusCode}`, JSON.stringify(body));
    }
    return orig(body);
  };
  next();
});

// Uploads live on the persistent Fly volume
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
app.use('/uploads', express.static(path.join(DATA_DIR, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/places', placesRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec));

// Serve React in production
if (IS_PROD) {
  const DIST = path.join(__dirname, '../frontend/dist');
  app.use(express.static(DIST));
  app.get('*', (req, res) => res.sendFile(path.join(DIST, 'index.html')));
}

initDB();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  Server running at http://0.0.0.0:${PORT}\n`);
});
