const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');

const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const stationRoutes = require('./routes/station.routes');
const authRoutes = require('./routes/auth.routes');
const dashboardRoutes = require('./routes/dashboard.routes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(compression());


// app.use('/assets', express.static(path.join(__dirname, '../public'), {
//   etag: false,
//   maxAge: 0,
//   setHeaders(res) {
//     // prevent caching (useful while developing)
//     res.setHeader('Cache-Control', 'no-store');
//   }
// }));


// TEMP route (health check)
app.get('/__health', (req, res) => {
  res.json({ ok: true });
});

app.use('/api/stations', stationRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);

// 404 + error handler
app.use(notFound);
app.use(errorHandler);

module.exports = app;
