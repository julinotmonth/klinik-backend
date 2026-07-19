const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

router.post('/register', ctrl.register);
router.post('/login', ctrl.login);
router.get('/me', requireAuth, ctrl.me);
router.patch('/profile', requireAuth, ctrl.updateProfile);
router.patch('/password', requireAuth, ctrl.changePassword);

module.exports = router;
