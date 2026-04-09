const express = require('express');
const router = express.Router();
const controller = require('./users.controller');

router.get('/', controller.getUsers);
/* popup dropdown data */
router.get('/maker-checker-list', controller.getMakerCheckerList);
router.post('/assign-checker', controller.assignChecker);
router.get('/assigned-checkers', controller.getAssignedCheckerUsers);
router.post('/unassign-checker', controller.unassignChecker);
router.put('/update-user', controller.updateUserDetails);
router.get('/maker-layer-list', controller.getMakerLayerList);
router.get('/department-layers', controller.getLayersByDepartment);
router.post('/assign-layers', controller.assignLayersToMaker);
router.get('/assigned-layers', controller.getAssignedLayerUsers);
router.post("/update-assigned-layers", controller.updateAssignedLayers);
router.post("/clear-assigned-layers", controller.clearAssignedLayers);





module.exports = router;