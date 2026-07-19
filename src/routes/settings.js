const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/settingsController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/', ctrl.getSettings);
router.put('/', requireAuth, requireRole('admin'), ctrl.updateSettings);

module.exports = router;
