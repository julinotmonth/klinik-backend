const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/poliController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/', ctrl.listPoli);
router.patch('/:id', requireAuth, requireRole('admin'), ctrl.updatePoli);

module.exports = router;