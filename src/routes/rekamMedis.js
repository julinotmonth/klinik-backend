const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/rekamMedisController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/', requireAuth, requireRole('admin'), ctrl.listRekamMedis);
router.get('/me', requireAuth, ctrl.listMyRekamMedis);
router.get('/antrean/:antreanId', requireAuth, ctrl.getByAntrean);
router.post('/', requireAuth, requireRole('admin'), ctrl.createRekamMedis);
router.patch('/:id', requireAuth, requireRole('admin'), ctrl.updateRekamMedis);
router.delete('/:id', requireAuth, requireRole('admin'), ctrl.deleteRekamMedis);

module.exports = router;
