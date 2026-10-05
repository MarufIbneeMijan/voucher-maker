const mongoose = require('mongoose');

const serviceEntrySchema = new mongoose.Schema(
  {
    bdAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agent',
      index: true
    },
    saudiAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agent',
      index: true
    },
    category: {
      type: String,
      enum: [
        'UMRAH VISA',
        'MULTIPLE VISA',
        'BRN CHARGE',
        'CRN',
        'TRANSPORT',
        'NAQABA-FINE',
        'ESCAPED FINE TO',
        'HOTEL',
        'PAYMENT TO ARAFA (A/R)',
        'PAYMENT FROM ARAFA (A/P)',
        'PREVIOUS DUES'
      ],
      required: true,
      index: true
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
    pax: {
      type: Number,
      default: 1
    },
    amountSAR: {
      type: Number,
      default: 0
    },
    saudiRate: {
      type: Number,
      default: 32.5 // Exchange rate BDT per SAR
    },
    totalBDT: {
      type: Number,
      default: 0
    },
    // Category 3 Transport fields
    route: {
      type: String,
      default: ''
    },
    vehicleType: {
      type: String,
      default: ''
    },
    // Category 5 Hotel fields
    hotelDetails: {
      hotelName: { type: String, default: '' },
      roomType: { type: String, default: 'Sharing' },
      checkIn: { type: Date, default: null },
      checkOut: { type: Date, default: null },
      totalNights: { type: Number, default: 0 },
      bookingRef: { type: String, default: '' },
      costPerNightSAR: { type: Number, default: 0 },
      totalCostSAR: { type: Number, default: 0 }
    },
    // Category 6 & 7 Payment details
    paymentDetails: {
      modeOfPayment: { type: String, default: 'Recv IN HAND (BDT)' },
      bankName: { type: String, default: '' },
      branch: { type: String, default: '' },
      accountNo: { type: String, default: '' },
      trxId: { type: String, default: '' },
      depositSlipRef: { type: String, default: '' },
      currency: { type: String, default: 'BDT' },
      paidAmount: { type: Number, default: 0 }
    },
    // Category 8 Previous Dues details
    previousDuesDetails: {
      fiscalYear: { type: String, default: '' },
      openingBalance: { type: Number, default: 0 }
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

module.exports = mongoose.model('ServiceEntry', serviceEntrySchema);
