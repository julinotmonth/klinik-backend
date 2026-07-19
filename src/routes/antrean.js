const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/antreanController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/', requireAuth, requireRole('admin'), ctrl.listAntrean);
router.get('/me', requireAuth, ctrl.listMyAntrean);
router.get('/:id', requireAuth, ctrl.getAntreanById);
router.post('/', requireAuth, requireRole('pasien'), ctrl.createAntrean);
router.patch('/:id/status', requireAuth, ctrl.updateStatus);
router.delete('/:id', requireAuth, requireRole('admin'), ctrl.deleteAntrean);

module.exports = router;
