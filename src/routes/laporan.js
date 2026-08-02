const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/laporanController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/statistik', requireAuth, requireRole('admin'), ctrl.getStatistik);

module.exports = router;
