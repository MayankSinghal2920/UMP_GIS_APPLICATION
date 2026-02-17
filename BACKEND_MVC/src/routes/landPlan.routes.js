const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/landPlan.controller');

router.get('/land_plan_on_track', ctrl.getLandPlanLayer);

// editable table CRUD
router.get('/edit/landplan', ctrl.listLandPlan);
router.get('/edit/landplan/:id', ctrl.getLandPlan);
router.post('/edit/landplan', ctrl.createLandPlan);
router.put('/edit/landplan/:id', ctrl.updateLandPlan);
router.delete('/edit/landplan/:id', ctrl.deleteLandPlan);

module.exports = router;
