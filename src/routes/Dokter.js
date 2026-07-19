const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/Doktercontroller');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/', ctrl.listDokter); // publik: pasien perlu melihat daftar dokter saat mendaftar
router.post('/', requireAuth, requireRole('admin'), ctrl.createDokter);
router.patch('/:id', requireAuth, requireRole('admin'), ctrl.updateDokter);
router.delete('/:id', requireAuth, requireRole('admin'), ctrl.deleteDokter);

module.exports = router;