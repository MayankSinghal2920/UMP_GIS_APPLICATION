const express = require('express');
const router = express.Router();
const controller = require('./edit.controller');

router.get('/:layer/table', controller.getTable);
router.get('/:layer/:id', controller.getById);

router.post('/:layer', controller.create);
router.put('/:layer/:id', controller.update);
router.delete('/:layer/:id', controller.remove);

module.exports = router;
