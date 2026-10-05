const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

router.get('/receivables', reportController.getReceivables);
router.get('/advance-deposits', reportController.getAdvanceDeposits);
router.get('/ksa-exposure', reportController.getKsaExposure);
router.get('/daily-flow', reportController.getDailyFlow);

module.exports = router;
