const express = require('express');
const router = express.Router();
const ledgerController = require('../controllers/ledgerController');

router.get('/', ledgerController.getLedgerEntries);
router.post('/manual', ledgerController.createManualEntry);
router.post('/recalculate-all', ledgerController.recalculateAll);

module.exports = router;

