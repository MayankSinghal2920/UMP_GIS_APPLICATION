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
const indiaBoundaryRoutes = require('./routes/indiaBoundary.routes');
const divisionBufferRoutes = require('./routes/divisionBuffer.routes');
const landOffsetRoutes = require('./routes/landOffset.routes');
const landBoundaryRoutes = require('./routes/landBoundary.routes');
const trackRoutes = require('./routes/track.routes');




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
app.use('/api/india_boundary', indiaBoundaryRoutes);
app.use('/api/division_buffer', divisionBufferRoutes);
app.use('/api/land_offset', landOffsetRoutes);
app.use('/api/land_boundary', landBoundaryRoutes);
app.use('/api/tracks', trackRoutes);





// 404 + error handler
app.use(notFound);
app.use(errorHandler);

module.exports = app;
