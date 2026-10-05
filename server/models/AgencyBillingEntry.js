const mongoose = require('mongoose');

const lineItemSchema = new mongoose.Schema(
  {
    costSAR: { type: Number, default: 0 },
    exchangeRate: { type: Number, default: 1 },
    costBDT: { type: Number, default: 0 },
    details: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { _id: false }
);

const agencyBillingEntrySchema = new mongoose.Schema(
  {
    bdAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agent',
      required: true,
      index: true
    },
    saudiAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agent',
      required: true,
      index: true
    },
    date: {
      type: Date,
      default: Date.now,
      index: true
    },
    voucherNo: {
      type: String,
      unique: true,
      index: true
    },
    passengerRef: {
      type: String,
      default: ''
    },

    // Embedded Breakdown (all default to 0)
    breakdown: {
      umrahVisa: { type: lineItemSchema, default: () => ({}) },
      multipleVisa: { type: lineItemSchema, default: () => ({}) },
      hotel: { type: lineItemSchema, default: () => ({}) },
      transport: { type: lineItemSchema, default: () => ({}) },
      naqabaFine: { type: lineItemSchema, default: () => ({}) },
      brnCharge: { type: lineItemSchema, default: () => ({}) },
      crnCharge: { type: lineItemSchema, default: () => ({}) },
      escapedFine: { type: lineItemSchema, default: () => ({}) },
      previousDues: { type: Number, default: 0 }
    },

    paymentReceived: {
      mode: {
        type: String,
        enum: [
          'Recv IN HAND (BDT)',
          'Recv IN HAND (SAR)',
          'RECIVE IN BANK (BDT)',
          'RECIVE IN BANK (SAR)',
          'Others',
          'NONE'
        ],
        default: 'NONE'
      },
      amountRaw: { type: Number, default: 0 },
      exchangeRate: { type: Number, default: 1 },
      amountBDT: { type: Number, default: 0 },
      trxId: { type: String, default: '' },
      bankName: { type: String, default: '' }
    },

    totals: {
      grossAmountSAR: { type: Number, default: 0 },
      grossAmountBDT: { type: Number, default: 0 },
      paidAmountBDT: { type: Number, default: 0 },
      netDebitBDT: { type: Number, default: 0 } // Net Amount added to BD Agent balance (Debit - Credit)
    },
    note: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('AgencyBillingEntry', agencyBillingEntrySchema);
