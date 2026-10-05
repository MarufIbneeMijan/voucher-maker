const mongoose = require('mongoose');

const ledgerEntrySchema = new mongoose.Schema(
  {
    agent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agent',
      required: true,
      index: true
    },
    entryId: {
      type: String,
      unique: true,
      index: true
    },
    transactionType: {
      type: String,
      enum: [
        'TICKET_ISSUE',
        'UMRAH_PACKAGE',
        'VISA_SERVICE',
        'PAYMENT_RECEIVED',
        'PAYMENT_PAID',
        'REISSUE',
        'REFUND',
        'OPENING_DUE',
        'ADJUSTMENT'
      ],
      required: true,
      index: true
    },
    date: {
      type: Date,
      default: Date.now,
      index: true
    },
    reference: {
      type: String,
      default: '',
      trim: true
    },
    gCode: {
      type: String,
      default: '',
      trim: true
    },
    passengerName: {
      type: String,
      default: ''
    },
    passportNumber: {
      type: String,
      default: ''
    },
    description: {
      type: String,
      required: true
    },
    currency: {
      type: String,
      enum: ['BDT', 'SAR'],
      default: 'BDT'
    },
    exchangeRate: {
      type: Number,
      default: 1.0
    },
    debit: {
      type: Number,
      default: 0 // BDT or SAR
    },
    credit: {
      type: Number,
      default: 0 // BDT or SAR
    },
    runningBalance: {
      type: Number,
      required: true
    },
    paymentMethod: {
      type: String,
      default: '-'
    },
    saudiAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agent'
    },
    relatedTicketSale: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TicketSale'
    },
    relatedServiceEntry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceEntry'
    },
    relatedPayment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment'
    },
    notes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for performant ledger statement queries
ledgerEntrySchema.index({ agent: 1, date: 1 });
ledgerEntrySchema.index({ agent: 1, createdAt: 1 });

module.exports = mongoose.model('LedgerEntry', ledgerEntrySchema);
