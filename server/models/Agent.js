const mongoose = require('mongoose');

const agentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Agency name is required'],
      trim: true,
      index: true
    },
    agencyCode: {
      type: String,
      required: [true, 'Agency code is required'],
      unique: true,
      uppercase: true,
      trim: true
    },
    type: {
      type: String,
      enum: ['BD_AGENT', 'SAUDI_AGENT'],
      required: true,
      index: true
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true
    },
    whatsapp: {
      type: String,
      trim: true
    },
    address: {
      type: String,
      default: ''
    },
    creditLimit: {
      type: Number,
      default: 0
    },
    currentBalance: {
      type: Number,
      default: 0 // (+) BD Agent owes us (Receivable) / Saudi Agent owed by us; (-) Advance Deposit
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Agent', agentSchema);
