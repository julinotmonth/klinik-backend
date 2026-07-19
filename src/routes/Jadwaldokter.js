const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/Jadwaldoktercontroller');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/tersedia', ctrl.listTersedia); // publik: dipakai halaman Pendaftaran
router.get('/', requireAuth, requireRole('admin'), ctrl.listJadwalDokter);
router.post('/', requireAuth, requireRole('admin'), ctrl.createJadwalDokter);
router.patch('/:id', requireAuth, requireRole('admin'), ctrl.updateJadwalDokter);
router.delete('/:id', requireAuth, requireRole('admin'), ctrl.deleteJadwalDokter);

module.exports = router;