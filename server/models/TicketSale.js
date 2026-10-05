const mongoose = require('mongoose');

const ticketSaleSchema = new mongoose.Schema(
  {
    agent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agent',
      required: true,
      index: true
    },
    pnr: {
      type: String,
      required: [true, 'PNR number is required'],
      trim: true,
      uppercase: true,
      index: true
    },
    ticketNumber: {
      type: String,
      default: '',
      trim: true
    },
    airline: {
      type: String,
      default: ''
    },
    airlineCode: {
      type: String,
      default: ''
    },
    route: {
      type: String,
      default: '' // e.g., DAC-JED-DAC
    },
    passengerName: {
      type: String,
      required: true
    },
    passportNumber: {
      type: String,
      default: ''
    },
    paxCounts: {
      adult: { type: Number, default: 1 },
      child: { type: Number, default: 0 },
      infant: { type: Number, default: 0 }
    },
    issueDate: {
      type: Date,
      default: Date.now
    },
    travelDate: {
      type: Date,
      default: null
    },
    baseFare: {
      type: Number,
      default: 0
    },
    taxes: {
      type: Number,
      default: 0
    },
    grossFare: {
      type: Number,
      default: 0 // Base + Tax
    },
    commissionRate: {
      type: Number,
      default: 0 // %
    },
    ait: {
      type: Number,
      default: 0 // 0.3% AIT Tax
    },
    markup: {
      type: Number,
      default: 0
    },
    discount: {
      type: Number,
      default: 0
    },
    netBilled: {
      type: Number,
      required: true
    },
    // Reissue / Refund fields
    transactionType: {
      type: String,
      enum: ['TICKET_ISSUE', 'REISSUE', 'REFUND'],
      default: 'TICKET_ISSUE'
    },
    originalPnr: {
      type: String,
      default: ''
    },
    originalTicketNumber: {
      type: String,
      default: ''
    },
    penaltyCharge: {
      type: Number,
      default: 0
    },
    serviceFee: {
      type: Number,
      default: 0
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

module.exports = mongoose.model('TicketSale', ticketSaleSchema);
