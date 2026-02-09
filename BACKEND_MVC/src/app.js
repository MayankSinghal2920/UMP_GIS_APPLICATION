require('dotenv').config();
const express = require('express');
const cors = require('cors');
const compression = require('compression');

const stationsRoutes = require('./routes/station.routes');
const trackRoutes = require('./routes/track.routes');
const kmPostRoutes = require('./routes/kmPost.routes');
const landPlanRoutes = require('./routes/landPlan.routes');
const landOffsetRoutes = require('./routes/landOffset.routes');
const boundaryRoutes = require('./routes/boundary.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const authRoutes = require('./routes/auth.routes');

const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.disable('x-powered-by');
app.use(cors());
app.use(express.json());
app.use(compression());

// Health
app.get('/__health', (req, res) => {
  res.json({ ok: true, port: Number(process.env.PORT || 4000) });
});

// API routes
app.use('/api', stationsRoutes);
app.use('/api', trackRoutes);
app.use('/api', kmPostRoutes);
app.use('/api', landPlanRoutes);
app.use('/api', landOffsetRoutes);
app.use('/api', boundaryRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', authRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
