const express = require('express');
const router = express.Router();
const entryController = require('../controllers/entryController');

router.post('/ticket', entryController.createTicketSale);
router.post('/service', entryController.createServiceEntry);
router.post('/batch', entryController.createBatchBillingEntry);
router.post('/batch/bulk-delete', entryController.bulkDeleteBatchBillingEntries);
router.post('/bulk-delete', entryController.bulkDeleteBatchBillingEntries);
router.get('/batch/:id', entryController.getBillingEntryById);
router.put('/batch/:id', entryController.updateBatchBillingEntry);
router.delete('/batch/:id', entryController.deleteBatchBillingEntry);

module.exports = router;
