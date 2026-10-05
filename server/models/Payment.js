const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    agent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agent',
      required: true,
      index: true
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0.01, 'Amount must be greater than zero']
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
    method: {
      type: String,
      enum: [
        'BANK_TRANSFER',
        'BKASH',
        'NAGAD',
        'CASH',
        'CHEQUE',
        'Recv IN HAND (BDT)',
        'Recv IN HAND (SAR)',
        'RECIVE IN BANK (BDT)',
        'RECIVE IN BANK (SAR)',
        'Paid by Cash (IN HAND)',
        'Paid by ATM',
        'Paid by Bank',
        'Others'
      ],
      required: true
    },
    bankDetails: {
      bankName: { type: String, default: '' },
      branch: { type: String, default: '' },
      chequeNumber: { type: String, default: '' }
    },
    trxId: {
      type: String,
      default: '',
      trim: true
    },
    status: {
      type: String,
      enum: ['APPROVED', 'PENDING', 'BOUNCED'],
      default: 'APPROVED'
    },
    depositSlipUrl: {
      type: String,
      default: ''
    },
    date: {
      type: Date,
      default: Date.now,
      index: true
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

module.exports = mongoose.model('Payment', paymentSchema);
