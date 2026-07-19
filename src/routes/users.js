const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/userController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/', requireAuth, requireRole('admin'), ctrl.listUsers);

module.exports = router;
