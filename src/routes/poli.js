const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/poliController');

router.get('/', ctrl.listPoli);

module.exports = router;
