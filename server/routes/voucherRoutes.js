const express = require('express');
const router = express.Router();
const entryController = require('../controllers/entryController');

// Bulk Delete Vouchers
router.post('/bulk-delete', entryController.bulkDeleteBatchBillingEntries);

// Single Voucher routes
router.get('/:id', entryController.getBillingEntryById);
router.delete('/:id', entryController.deleteBatchBillingEntry);

module.exports = router;
