const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');

const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./modules/auth/auth.routes');
const commonLayersRoutes = require('./modules/common/view/layers/layers.routes');
const ceaViewRoutes = require('./modules/departments/civilEngineeringAssets/view/layers/layers.routes');
const ceaDashboardRoutes = require(
  './modules/departments/civilEngineeringAssets/view/dashboard/dashboard.routes'
);
const ceaEditRoutes = require(
  './modules/departments/civilEngineeringAssets/edit/edit.routes'
);



const app = express();

app.use(cors({ origin: 'http://localhost:4200' }));
app.use(express.json());
app.use(compression());
app.set("trust proxy", 1);


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


app.use('/api/auth', authRoutes);
app.use('/api/common', commonLayersRoutes);
app.use('/api/cea/view', ceaViewRoutes);
app.use('/api/cea/view/dashboard', ceaDashboardRoutes);
app.use('/api/cea/edit', ceaEditRoutes);






// 404 + error handler
app.use(notFound);
app.use(errorHandler);

module.exports = app;
