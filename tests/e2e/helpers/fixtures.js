/**
 * fixtures.js
 * Canonical test fixtures for TravelLedger E2E testing suites.
 * Includes user credentials, voucher templates, agent IDs, and breakdown matrices.
 */

const DEFAULT_ADMIN = {
  username: 'admin',
  password: 'admin',
  role: 'Super Admin',
  name: 'Super Admin'
};

const SAMPLE_STAFF_USER = {
  username: 'e2e_staff_agent',
  password: 'StaffSecret2026!',
  role: 'Staff',
  name: 'Hafiz Staff Member'
};

const CANONICAL_BD_AGENT = {
  _id: 'AGENT-BD-101',
  id: 'AGENT-BD-101',
  name: 'ABBAS',
  agencyCode: 'BD-101',
  type: 'BD_AGENT'
};

const CANONICAL_SAUDI_AGENT = {
  _id: 'AGENT-KSA-213',
  id: 'AGENT-KSA-213',
  name: 'SPECIAL BENAA ARAFA',
  agencyCode: 'KSA-213',
  type: 'SAUDI_AGENT'
};

/**
 * Builds a realistic Umrah Batch Billing Voucher payload.
 * @param {object} overrides
 * @returns {object}
 */
function createVoucherPayload(overrides = {}) {
  const defaultPayload = {
    createdBy: 'admin',
    bdAgentId: CANONICAL_BD_AGENT.id,
    saudiAgentId: CANONICAL_SAUDI_AGENT.id,
    date: '2026-10-02',
    passengerRef: 'AL-RAHMAN GROUP (4 PAX UMRAH)',
    dueAdjustment: 0,
    nowPaying: 50000,
    breakdown: {
      umrahVisa: {
        pax: 4,
        costSAR: 1200,
        rate: 32.5,
        totalBDT: 39000,
        details: { type: 'UMRAH VISA', pax: 4, costPerPaxSAR: 300 }
      },
      hotel: {
        makkah: {
          hotelName: 'Makkah Clock Tower Hotel',
          roomType: 'Quad',
          checkIn: '2026-10-10',
          checkOut: '2026-10-15',
          nights: 5,
          bookingRef: 'MKH-7788',
          costSAR: 1200,
          totalBDT: 39000
        },
        madinah: {
          hotelName: 'Madinah Harmony Hotel',
          roomType: 'Quad',
          checkIn: '2026-10-15',
          checkOut: '2026-10-20',
          nights: 5,
          bookingRef: 'MED-9922',
          costSAR: 800,
          totalBDT: 26000
        },
        totalSAR: 2000,
        rate: 32.5,
        totalBDT: 65000
      },
      transport: {
        costSAR: 500,
        rate: 32.5,
        totalBDT: 16250,
        details: 'Jeddah to Makkah to Madinah VIP Bus'
      },
      naqabaFine: {
        costSAR: 0,
        rate: 32.5,
        totalBDT: 0
      },
      brnCharge: {
        makkah: { code: 'BRN-MKH-101', days: 5, costSAR: 100 },
        madinah: { code: 'BRN-MED-202', days: 5, costSAR: 100 },
        totalSAR: 200,
        rate: 32.5,
        totalBDT: 6500
      },
      crnCharge: {
        makkah: { code: '', days: 0, costSAR: 0 },
        madinah: { code: '', days: 0, costSAR: 0 },
        totalSAR: 0,
        rate: 32.5,
        totalBDT: 0
      },
      escapedFine: {
        costSAR: 0,
        rate: 32.5,
        totalBDT: 0
      },
      previousDues: 0
    },
    paymentReceived: {
      mode: 'Recv IN HAND (BDT)',
      amountSAR: 0,
      amountBDT: 50000,
      trxId: 'CASH-E2E-9901',
      bankName: ''
    },
    totals: {
      grossAmountSAR: 3900,
      grossAmountBDT: 126750,
      servicesTotalBDT: 126750,
      paidAmountBDT: 50000,
      netDueAdded: 76750,
      dueAdjustment: 0,
      totalBillable: 126750
    },
    note: 'Automated E2E full Umrah billing voucher validation'
  };

  return {
    ...defaultPayload,
    ...overrides
  };
}

module.exports = {
  DEFAULT_ADMIN,
  SAMPLE_STAFF_USER,
  CANONICAL_BD_AGENT,
  CANONICAL_SAUDI_AGENT,
  createVoucherPayload
};
