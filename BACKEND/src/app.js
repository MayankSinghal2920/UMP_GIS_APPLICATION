const express = require('express');
const cors = require('cors');
const compression = require('compression');

const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const stationRoutes = require('./routes/station.routes');
const authRoutes = require('./routes/auth.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const kmPostRoutes = require('./routes/kmPost.routes');
const landPlanRoutes = require('./routes/landPlan.routes');
const tracksRoutes = require('./routes/tracks.routes');



const app = express();

app.use(cors());
app.use(express.json());
app.use(compression());


// TEMP route (health check)
app.get('/__health', (req, res) => {
  res.json({ ok: true });
});

app.use('/api/stations', stationRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/km_posts', kmPostRoutes);
app.use('/api/land_plan_on_track', landPlanRoutes);
app.use('/api/tracks', tracksRoutes);



// 404 + error handler
app.use(notFound);
app.use(errorHandler);

module.exports = app;
