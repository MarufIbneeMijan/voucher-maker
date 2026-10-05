const { readData, atomicMultiUpdate } = require('../services/jsonDb');
const { generateEntryId } = require('./ledgerController');

// Helper to generate sequential Voucher numbers (VOUCHER-1001, VOUCHER-1002...)
const generateVoucherNo = (billingEntries = []) => {
  if (!billingEntries || billingEntries.length === 0) {
    return 'VOUCHER-1001';
  }

  let maxNum = 1000;
  billingEntries.forEach((b) => {
    const vNo = b.voucherNo || b.id || '';
    const match = vNo.match(/VOUCHER-(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  });

  return `VOUCHER-${maxNum + 1}`;
};

// Create Sub-Agency-Centric Batch Billing Entry (Voucher)
exports.createBatchBillingEntry = async (req, res) => {
  try {
    const {
      bdAgentId,
      saudiAgentId,
      date,
      passengerRef = '',
      breakdown = {},
      paymentReceived = {},
      totals = {},
      dueAdjustment = 0,
      nowPaying: reqNowPay,
      note = ''
    } = req.body;

    const adjustment = Number(dueAdjustment) || 0;

    if (!bdAgentId || !saudiAgentId) {
      return res.status(400).json({
        success: false,
        message: 'Both BD Sub-Agency and Saudi Supplier are required.'
      });
    }

    let createdBillingDoc = null;
    let createdBdLedger = null;
    let updatedBdAgent = null;

    await atomicMultiUpdate(['agents', 'billing_entries', 'ledger_entries'], async (dataMap) => {
      const agents = dataMap['agents'];
      const billingEntries = dataMap['billing_entries'];
      const ledgerEntries = dataMap['ledger_entries'];

      // 1. Fetch Agents
      const bdAgent = agents.find((a) => a._id === bdAgentId || a.id === bdAgentId);
      if (!bdAgent) throw new Error('Selected BD Sub-Agency not found.');

      const saudiAgent = agents.find((a) => a._id === saudiAgentId || a.id === saudiAgentId);
      if (!saudiAgent) throw new Error('Selected Saudi Supplier not found.');

      const voucherNo = generateVoucherNo(billingEntries);

      // Clean calculations (Total Bill = Total Active Services, Remaining Balance = Total Bill - Now Paying)
      const nowPaying = parseFloat(reqNowPay !== undefined ? reqNowPay : (totals.paidAmountBDT || paymentReceived.amountBDT || 0)) || 0;
      const grossBDT = Number(totals.grossAmountBDT || totals.grossBDT) || 0;
      const grossSAR = Number(totals.grossAmountSAR || totals.grossSAR) || 0;
      const totalBillable = grossBDT;
      const netLedgerDebit = totalBillable - nowPaying;

      // 2. Create AgencyBillingEntry Record (Voucher)
      createdBillingDoc = {
        id: voucherNo,
        _id: voucherNo,
        voucherNo,
        bdAgent: bdAgent.name,
        bdAgentId: bdAgent._id || bdAgent.id,
        saudiAgent: saudiAgent.name,
        saudiAgentId: saudiAgent._id || saudiAgent.id,
        date: date ? date : new Date().toISOString().split('T')[0],
        passengerRef: passengerRef || '',
        
        dueAdjustment: adjustment,
        nowPaying,
        totalBillable,
        netLedgerDebit,
        paymentDetails: {
          mode: paymentReceived.mode || 'Recv IN HAND (BDT)',
          trxId: paymentReceived.trxId || '',
          bankName: paymentReceived.bankName || '',
          amount: nowPaying
        },

        breakdown: {
          umrahVisa: breakdown.umrahVisa || { pax: 0, costSAR: 0, rate: 32.5, totalBDT: 0 },
          hotel: breakdown.hotel || {
            makkah: { hotelName: '', roomType: 'Quad', checkIn: null, checkOut: null, nights: 0, bookingRef: '', costSAR: 0, totalBDT: 0 },
            madinah: { hotelName: '', roomType: 'Quad', checkIn: null, checkOut: null, nights: 0, bookingRef: '', costSAR: 0, totalBDT: 0 },
            totalSAR: 0,
            rate: 32.5,
            totalBDT: 0
          },
          brnCharge: breakdown.brnCharge || {
            makkah: { code: '', days: 0, costSAR: 0 },
            madinah: { code: '', days: 0, costSAR: 0 },
            totalSAR: 0,
            rate: 32.5,
            totalBDT: 0
          },
          crnCharge: breakdown.crnCharge || {
            makkah: { code: '', days: 0, costSAR: 0 },
            madinah: { code: '', days: 0, costSAR: 0 },
            totalSAR: 0,
            rate: 32.5,
            totalBDT: 0
          },
          transport: breakdown.transport || { costSAR: 0, rate: 32.5, totalBDT: 0 },
          naqabaFine: breakdown.naqabaFine || { costSAR: 0, rate: 32.5, totalBDT: 0 },
          escapedFine: breakdown.escapedFine || { costSAR: 0, rate: 32.5, totalBDT: 0 },
          previousDues: 0
        },
        paymentReceived: {
          mode: paymentReceived.mode || 'Recv IN HAND (BDT)',
          amountSAR: paymentReceived.amountSAR || (paymentReceived.mode?.includes('SAR') ? paymentReceived.amountRaw || 0 : 0),
          amountBDT: nowPaying,
          trxId: paymentReceived.trxId || '',
          bankName: paymentReceived.bankName || ''
        },
        totals: {
          grossSAR,
          grossBDT: totalBillable,
          servicesBDT: Number(totals.servicesTotalBDT || totals.servicesBDT) || totalBillable,
          dueAdjustment: adjustment,
          paidBDT: nowPaying,
          netDueAdded: netLedgerDebit,
          totalBillable
        },
        note: note || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      billingEntries.push(createdBillingDoc);

      // 3. Atomically derive BD Agent balance from double-entry rows
      //    Row 1 — VOUCHER_BILL:  debit=totalBillable, credit=0
      //    Row 2 — PAYMENT_RECV: debit=0, credit=nowPaying  (only if nowPaying > 0)
      const prevBdBalance = bdAgent.currentBalance || 0;
      const billEntryId = generateEntryId(ledgerEntries);

      const itemsList = [];
      if (breakdown.umrahVisa?.costSAR > 0 || breakdown.umrahVisa?.totalBDT > 0) itemsList.push(`Visa (${breakdown.umrahVisa.details?.pax || breakdown.umrahVisa.pax || 1} Pax)`);
      if (breakdown.hotel?.totalSAR > 0 || breakdown.hotel?.costSAR > 0 || breakdown.hotel?.totalBDT > 0) itemsList.push('Hotel');
      if (breakdown.transport?.costSAR > 0 || breakdown.transport?.totalBDT > 0) itemsList.push('Transport');
      if (breakdown.brnCharge?.totalSAR > 0 || breakdown.brnCharge?.totalBDT > 0) itemsList.push('BRN');
      if (breakdown.crnCharge?.totalSAR > 0 || breakdown.crnCharge?.totalBDT > 0) itemsList.push('CRN');
      if (breakdown.escapedFine?.costSAR > 0 || breakdown.escapedFine?.totalBDT > 0) itemsList.push('Escaped Fine');
      if (adjustment > 0) itemsList.push('Previous Due Adj');

      const descBill = `Batch Billing Voucher (${voucherNo}) ${passengerRef ? `[Pax: ${passengerRef}]` : ''} - Includes: ${itemsList.join(', ') || 'Services'}`;

      // Running balance after BILL row
      const balAfterBill = prevBdBalance + totalBillable;

      createdBdLedger = {
        _id: billEntryId,
        id: billEntryId,
        agent: bdAgent._id || bdAgent.id,
        agentName: bdAgent.name,
        agentCode: bdAgent.agencyCode,
        agentType: bdAgent.type,
        entryId: billEntryId,
        transactionType: 'VOUCHER_BILL',
        date: date ? new Date(date).toISOString() : new Date().toISOString(),
        reference: voucherNo,
        gCode: voucherNo,
        passengerName: passengerRef,
        description: descBill,
        currency: 'BDT',
        exchangeRate: 1.0,
        debit: totalBillable,
        credit: 0,
        runningBalance: balAfterBill,
        paymentMethod: '-',
        saudiAgent: saudiAgent._id || saudiAgent.id,
        notes: note,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      ledgerEntries.push(createdBdLedger);

      // Row 2: PAYMENT_RECEIVED — only if payment actually made
      let newBdBalance = balAfterBill;
      if (nowPaying > 0) {
        const payEntryId = generateEntryId(ledgerEntries);
        newBdBalance = balAfterBill - nowPaying;

        const payLedger = {
          _id: payEntryId,
          id: payEntryId,
          agent: bdAgent._id || bdAgent.id,
          agentName: bdAgent.name,
          agentCode: bdAgent.agencyCode,
          agentType: bdAgent.type,
          entryId: payEntryId,
          transactionType: 'PAYMENT_RECEIVED',
          date: date ? new Date(date).toISOString() : new Date().toISOString(),
          reference: voucherNo,
          gCode: voucherNo,
          passengerName: passengerRef,
          description: `Payment Received for Voucher (${voucherNo}) ${passengerRef ? `[Pax: ${passengerRef}]` : ''}`,
          currency: 'BDT',
          exchangeRate: 1.0,
          debit: 0,
          credit: nowPaying,
          runningBalance: newBdBalance,
          paymentMethod: paymentReceived.mode || 'Recv IN HAND (BDT)',
          saudiAgent: saudiAgent._id || saudiAgent.id,
          notes: note,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        ledgerEntries.push(payLedger);
      }

      // Agent balance = result of double-entry replay
      bdAgent.currentBalance = newBdBalance;
      bdAgent.totalBilled = Math.round(((bdAgent.totalBilled || 0) + totalBillable) * 100) / 100;
      bdAgent.totalPaid = Math.round(((bdAgent.totalPaid || 0) + nowPaying) * 100) / 100;
      delete bdAgent.creditLimit;
      delete bdAgent.creditLimitUtilization;
      bdAgent.updatedAt = new Date().toISOString();
      updatedBdAgent = bdAgent;

      // 4. Saudi tracking disabled

      return {
        agents,
        billing_entries: billingEntries,
        ledger_entries: ledgerEntries
      };
    });


    res.status(201).json({
      success: true,
      message: `Batch billing voucher ${createdBillingDoc.voucherNo} saved successfully`,
      data: {
        billingDoc: createdBillingDoc,
        bdLedger: createdBdLedger,
        bdAgent: updatedBdAgent
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update / Edit Existing Voucher
exports.updateBatchBillingEntry = async (req, res) => {
  try {
    const voucherId = req.params.id;
    const {
      bdAgentId,
      saudiAgentId,
      date,
      passengerRef = '',
      breakdown = {},
      paymentReceived = {},
      totals = {},
      dueAdjustment = 0,
      nowPaying: reqNowPay,
      note = ''
    } = req.body;

    const adjustment = Number(dueAdjustment) || 0;

    let updatedVoucher = null;

    await atomicMultiUpdate(['agents', 'billing_entries', 'ledger_entries'], async (dataMap) => {
      const agents = dataMap['agents'];
      const billingEntries = dataMap['billing_entries'];
      let ledgerEntries = dataMap['ledger_entries'];

      // Find existing voucher
      const vIndex = billingEntries.findIndex((v) => v.id === voucherId || v._id === voucherId || v.voucherNo === voucherId);
      if (vIndex === -1) {
        throw new Error(`Voucher ${voucherId} not found.`);
      }

      const oldVoucher = billingEntries[vIndex];
      const voucherNo = oldVoucher.voucherNo || voucherId;

      // Revert previous net ledger debit for old BD Agent
      const oldBdAgent = agents.find((a) => (a._id || a.id) === oldVoucher.bdAgentId);
      if (oldBdAgent) {
        const oldNetDebit = oldVoucher.totals?.netDueAdded !== undefined 
          ? oldVoucher.totals.netDueAdded 
          : ((oldVoucher.totals?.grossAmountBDT || 0) - (oldVoucher.totals?.paidAmountBDT || 0));
        oldBdAgent.currentBalance = (oldBdAgent.currentBalance || 0) - oldNetDebit;
      }

      const oldSaudiAgent = agents.find((a) => (a._id || a.id) === oldVoucher.saudiAgentId);
      if (oldSaudiAgent) {
        const oldGrossSAR = oldVoucher.totals?.grossSAR || oldVoucher.totals?.grossAmountSAR || 0;
        oldSaudiAgent.currentBalance = (oldSaudiAgent.currentBalance || 0) - oldGrossSAR;
      }

      // Remove previous ledger entries for this voucherNo
      ledgerEntries = ledgerEntries.filter((e) => e.reference !== voucherNo && e.gCode !== voucherNo);

      // Find new target agents
      const bdAgent = agents.find((a) => a._id === bdAgentId || a.id === bdAgentId);
      if (!bdAgent) throw new Error('Selected BD Sub-Agency not found.');

      const saudiAgent = agents.find((a) => a._id === saudiAgentId || a.id === saudiAgentId);
      if (!saudiAgent) throw new Error('Selected Saudi Supplier not found.');

      // Clean calculations (Total Bill = Total Active Services, Remaining Balance = Total Bill - Now Paying)
      const nowPaying = parseFloat(reqNowPay !== undefined ? reqNowPay : (totals.paidAmountBDT || paymentReceived.amountBDT || 0)) || 0;
      const grossBDT = Number(totals.grossAmountBDT || totals.grossBDT) || 0;
      const grossSAR = Number(totals.grossAmountSAR || totals.grossSAR) || 0;
      const totalBillable = grossBDT;
      const netLedgerDebit = totalBillable - nowPaying;

      // Update Voucher Document
      updatedVoucher = {
        ...oldVoucher,
        bdAgent: bdAgent.name,
        bdAgentId: bdAgent._id || bdAgent.id,
        saudiAgent: saudiAgent.name,
        saudiAgentId: saudiAgent._id || saudiAgent.id,
        date: date ? date : oldVoucher.date,
        passengerRef: passengerRef || '',
        
        dueAdjustment: adjustment,
        nowPaying,
        totalBillable,
        netLedgerDebit,
        paymentDetails: {
          mode: paymentReceived.mode || 'Recv IN HAND (BDT)',
          trxId: paymentReceived.trxId || '',
          bankName: paymentReceived.bankName || '',
          amount: nowPaying
        },

        breakdown: {
          umrahVisa: breakdown.umrahVisa || oldVoucher.breakdown?.umrahVisa,
          hotel: breakdown.hotel || oldVoucher.breakdown?.hotel,
          brnCharge: breakdown.brnCharge || oldVoucher.breakdown?.brnCharge,
          crnCharge: breakdown.crnCharge || oldVoucher.breakdown?.crnCharge,
          transport: breakdown.transport || oldVoucher.breakdown?.transport,
          naqabaFine: breakdown.naqabaFine || oldVoucher.breakdown?.naqabaFine,
          escapedFine: breakdown.escapedFine || oldVoucher.breakdown?.escapedFine,
          previousDues: 0
        },
        paymentReceived: {
          mode: paymentReceived.mode || 'Recv IN HAND (BDT)',
          amountSAR: paymentReceived.amountSAR || (paymentReceived.mode?.includes('SAR') ? paymentReceived.amountRaw || 0 : 0),
          amountBDT: nowPaying,
          trxId: paymentReceived.trxId || '',
          bankName: paymentReceived.bankName || ''
        },
        totals: {
          grossSAR,
          grossBDT: totalBillable,
          servicesBDT: Number(totals.servicesTotalBDT || totals.servicesBDT) || totalBillable,
          dueAdjustment: adjustment,
          paidBDT: nowPaying,
          netDueAdded: netLedgerDebit,
          totalBillable
        },
        note: note || '',
        updatedAt: new Date().toISOString()
      };

      billingEntries[vIndex] = updatedVoucher;

      // Double-entry: VOUCHER_BILL row + optional PAYMENT_RECEIVED row
      const prevBdBalance = bdAgent.currentBalance || 0;
      const billEntryId = generateEntryId(ledgerEntries);

      const itemsList = [];
      if (breakdown.umrahVisa?.costSAR > 0 || breakdown.umrahVisa?.totalBDT > 0) itemsList.push('Visa');
      if (breakdown.hotel?.totalSAR > 0 || breakdown.hotel?.costSAR > 0 || breakdown.hotel?.totalBDT > 0) itemsList.push('Hotel');
      if (breakdown.transport?.costSAR > 0 || breakdown.transport?.totalBDT > 0) itemsList.push('Transport');
      if (breakdown.brnCharge?.totalSAR > 0 || breakdown.brnCharge?.totalBDT > 0) itemsList.push('BRN');
      if (breakdown.crnCharge?.totalSAR > 0 || breakdown.crnCharge?.totalBDT > 0) itemsList.push('CRN');
      if (adjustment > 0) itemsList.push('Previous Due Adj');

      const descBill = `Batch Billing Voucher (${voucherNo}) [Edited] ${passengerRef ? `[Pax: ${passengerRef}]` : ''} - Includes: ${itemsList.join(', ') || 'Services'}`;
      const balAfterBill = prevBdBalance + totalBillable;

      const bdLedger = {
        _id: billEntryId,
        id: billEntryId,
        agent: bdAgent._id || bdAgent.id,
        agentName: bdAgent.name,
        agentCode: bdAgent.agencyCode,
        agentType: bdAgent.type,
        entryId: billEntryId,
        transactionType: 'VOUCHER_BILL',
        date: date ? new Date(date).toISOString() : new Date().toISOString(),
        reference: voucherNo,
        gCode: voucherNo,
        passengerName: passengerRef,
        description: descBill,
        currency: 'BDT',
        exchangeRate: 1.0,
        debit: totalBillable,
        credit: 0,
        runningBalance: balAfterBill,
        paymentMethod: '-',
        saudiAgent: saudiAgent._id || saudiAgent.id,
        notes: note,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      ledgerEntries.push(bdLedger);

      let newBdBalance = balAfterBill;
      if (nowPaying > 0) {
        const payEntryId = generateEntryId(ledgerEntries);
        newBdBalance = balAfterBill - nowPaying;

        const payLedger = {
          _id: payEntryId,
          id: payEntryId,
          agent: bdAgent._id || bdAgent.id,
          agentName: bdAgent.name,
          agentCode: bdAgent.agencyCode,
          agentType: bdAgent.type,
          entryId: payEntryId,
          transactionType: 'PAYMENT_RECEIVED',
          date: date ? new Date(date).toISOString() : new Date().toISOString(),
          reference: voucherNo,
          gCode: voucherNo,
          passengerName: passengerRef,
          description: `Payment Received for Voucher (${voucherNo}) [Edit] ${passengerRef ? `[Pax: ${passengerRef}]` : ''}`,
          currency: 'BDT',
          exchangeRate: 1.0,
          debit: 0,
          credit: nowPaying,
          runningBalance: newBdBalance,
          paymentMethod: paymentReceived.mode || 'Recv IN HAND (BDT)',
          saudiAgent: saudiAgent._id || saudiAgent.id,
          notes: note,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        ledgerEntries.push(payLedger);
      }

      bdAgent.currentBalance = newBdBalance;
      bdAgent.updatedAt = new Date().toISOString();

      // Saudi Agent calculations disabled per requirements

        

      return {
        agents,
        billing_entries: billingEntries,
        ledger_entries: ledgerEntries
      };
    });

    res.json({
      success: true,
      message: `Voucher ${updatedVoucher.voucherNo} updated successfully`,
      data: updatedVoucher
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete Voucher with Atomic Balance Reversal & Ledger Cleanup
exports.deleteBatchBillingEntry = async (req, res) => {
  try {
    const voucherId = req.params.id;
    let deletedVoucher = null;

    await atomicMultiUpdate(['agents', 'billing_entries', 'ledger_entries'], async (dataMap) => {
      const agents = dataMap['agents'];
      const billingEntries = dataMap['billing_entries'];
      let ledgerEntries = dataMap['ledger_entries'];

      // Find target voucher
      const vIndex = billingEntries.findIndex(
        (v) => v.id === voucherId || v._id === voucherId || v.voucherNo === voucherId
      );
      if (vIndex === -1) {
        throw new Error(`Voucher ${voucherId} not found.`);
      }

      deletedVoucher = billingEntries[vIndex];
      const voucherNo = deletedVoucher.voucherNo || voucherId;

      // Revert balances for BD Agent
      const bdAgent = agents.find((a) => (a._id || a.id) === deletedVoucher.bdAgentId);
      if (bdAgent) {
        const netDue = deletedVoucher.totals?.netDueAdded !== undefined 
          ? deletedVoucher.totals.netDueAdded 
          : ((deletedVoucher.totals?.grossAmountBDT || 0) - (deletedVoucher.totals?.paidAmountBDT || 0));
        const billedAmt = deletedVoucher.totals?.totalBillableBDT !== undefined
          ? deletedVoucher.totals.totalBillableBDT
          : (deletedVoucher.totals?.grossAmountBDT || 0);
        const paidAmt = deletedVoucher.totals?.nowPayingBDT !== undefined
          ? deletedVoucher.totals.nowPayingBDT
          : (deletedVoucher.totals?.paidAmountBDT || 0);

        bdAgent.currentBalance = Math.round(((bdAgent.currentBalance || 0) - netDue) * 100) / 100;
        if (bdAgent.totalBilled !== undefined) {
          bdAgent.totalBilled = Math.max(0, Math.round(((bdAgent.totalBilled || 0) - billedAmt) * 100) / 100);
        }
        if (bdAgent.totalPaid !== undefined) {
          bdAgent.totalPaid = Math.max(0, Math.round(((bdAgent.totalPaid || 0) - paidAmt) * 100) / 100);
        }
        delete bdAgent.creditLimit;
        delete bdAgent.creditLimitUtilization;
        bdAgent.updatedAt = new Date().toISOString();
      }

      // Revert balances for Saudi Supplier
      const saudiAgent = agents.find((a) => (a._id || a.id) === deletedVoucher.saudiAgentId);
      if (saudiAgent) {
        const grossSAR = deletedVoucher.totals?.grossSAR || deletedVoucher.totals?.grossAmountSAR || 0;
        saudiAgent.currentBalance = (saudiAgent.currentBalance || 0) - grossSAR;
        saudiAgent.updatedAt = new Date().toISOString();
      }

      // Remove matching ledger entries for this voucher
      dataMap['ledger_entries'] = ledgerEntries.filter(
        (e) => e.reference !== voucherNo && e.gCode !== voucherNo && e.reference !== voucherId && e.gCode !== voucherId
      );

      // Remove voucher from billing_entries
      billingEntries.splice(vIndex, 1);

      return {
        agents,
        billing_entries: billingEntries,
        ledger_entries: dataMap['ledger_entries']
      };
    });

    res.json({
      success: true,
      message: `Voucher ${deletedVoucher.voucherNo || voucherId} deleted and balances reverted successfully`,
      data: deletedVoucher
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Bulk Delete Vouchers with Atomic Balance Reversals & Ledger Cleanup
exports.bulkDeleteBatchBillingEntries = async (req, res) => {
  try {
    const { voucherNos = [], voucherIds = [], ids = [], vouchers = [] } = req.body;
    const targetIds = Array.from(new Set([...voucherNos, ...voucherIds, ...ids, ...vouchers])).filter(Boolean);

    if (targetIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide at least one voucher to delete.' });
    }

    let deletedCount = 0;
    const deletedList = [];

    await atomicMultiUpdate(['agents', 'billing_entries', 'ledger_entries'], async (dataMap) => {
      const agents = dataMap['agents'];
      let billingEntries = dataMap['billing_entries'];
      let ledgerEntries = dataMap['ledger_entries'];

      for (const vId of targetIds) {
        const vIndex = billingEntries.findIndex(
          (v) => v.id === vId || v._id === vId || v.voucherNo === vId
        );
        if (vIndex === -1) continue;

        const deletedVoucher = billingEntries[vIndex];
        const voucherNo = deletedVoucher.voucherNo || vId;

        // Revert balances for BD Agent
        const bdAgent = agents.find((a) => (a._id || a.id) === deletedVoucher.bdAgentId);
        if (bdAgent) {
          const netDue = deletedVoucher.totals?.netDueAdded !== undefined 
            ? deletedVoucher.totals.netDueAdded 
            : ((deletedVoucher.totals?.grossAmountBDT || 0) - (deletedVoucher.totals?.paidAmountBDT || 0));
          const billedAmt = deletedVoucher.totals?.totalBillableBDT !== undefined
            ? deletedVoucher.totals.totalBillableBDT
            : (deletedVoucher.totals?.grossAmountBDT || 0);
          const paidAmt = deletedVoucher.totals?.nowPayingBDT !== undefined
            ? deletedVoucher.totals.nowPayingBDT
            : (deletedVoucher.totals?.paidAmountBDT || 0);

          bdAgent.currentBalance = Math.round(((bdAgent.currentBalance || 0) - netDue) * 100) / 100;
          if (bdAgent.totalBilled !== undefined) {
            bdAgent.totalBilled = Math.max(0, Math.round(((bdAgent.totalBilled || 0) - billedAmt) * 100) / 100);
          }
          if (bdAgent.totalPaid !== undefined) {
            bdAgent.totalPaid = Math.max(0, Math.round(((bdAgent.totalPaid || 0) - paidAmt) * 100) / 100);
          }
          delete bdAgent.creditLimit;
          delete bdAgent.creditLimitUtilization;
          bdAgent.updatedAt = new Date().toISOString();
        }

        // Remove matching ledger entries
        ledgerEntries = ledgerEntries.filter(
          (e) => e.reference !== voucherNo && e.gCode !== voucherNo && e.reference !== vId && e.gCode !== vId
        );

        billingEntries.splice(vIndex, 1);
        deletedCount++;
        deletedList.push(voucherNo);
      }

      dataMap['billing_entries'] = billingEntries;
      dataMap['ledger_entries'] = ledgerEntries;

      return {
        agents,
        billing_entries: billingEntries,
        ledger_entries: ledgerEntries
      };
    });

    res.json({
      success: true,
      message: `${deletedCount} vouchers deleted and balances reverted successfully`,
      data: { count: deletedCount, vouchers: deletedList }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Alias export for consistency with voucherRoutes
exports.bulkDeleteVouchers = exports.bulkDeleteBatchBillingEntries;

// Get single Voucher Details by ID / Voucher No
exports.getBillingEntryById = async (req, res) => {
  try {
    const vouchers = await readData('billing_entries');
    const voucher = vouchers.find(
      (v) => v.id === req.params.id || v._id === req.params.id || v.voucherNo === req.params.id
    );

    if (!voucher) {
      return res.status(404).json({ success: false, message: 'Voucher not found' });
    }

    res.json({ success: true, data: voucher });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create Air Ticket Entry
exports.createTicketSale = async (req, res) => {
  try {
    const {
      bdAgentId,
      pnr,
      ticketNumber = '',
      airline = '',
      airlineCode = '',
      route = '',
      passengerName,
      passportNumber = '',
      paxCounts = { adult: 1, child: 0, infant: 0 },
      issueDate,
      travelDate,
      baseFare = 0,
      taxes = 0,
      commissionRate = 0,
      ait = 0,
      markup = 0,
      discount = 0,
      transactionType = 'TICKET_ISSUE',
      originalPnr = '',
      originalTicketNumber = '',
      penaltyCharge = 0,
      serviceFee = 0,
      paymentAmount = 0,
      paymentMethod = '-',
      notes = ''
    } = req.body;

    if (!bdAgentId || !pnr || !passengerName) {
      return res.status(400).json({
        success: false,
        message: 'BD Sub-Agent, PNR Number, and Passenger Name are required.'
      });
    }

    const bFare = Number(baseFare) || 0;
    const taxVal = Number(taxes) || 0;
    const grossFare = bFare + taxVal;
    const commPercent = Number(commissionRate) || 0;
    const commAmount = commPercent > 0 ? Math.round((bFare * commPercent) / 100) : 0;
    const aitVal = Number(ait) || 0;
    const markVal = Number(markup) || 0;
    const discVal = Number(discount) || 0;
    const penaltyVal = Number(penaltyCharge) || 0;
    const serviceFeeVal = Number(serviceFee) || 0;

    let computedNetBilled = 0;
    let debit = 0;
    let credit = 0;

    if (transactionType === 'REFUND') {
      computedNetBilled = Math.max(0, grossFare - penaltyVal - serviceFeeVal);
      credit = computedNetBilled;
      debit = 0;
    } else if (transactionType === 'REISSUE') {
      computedNetBilled = bFare + penaltyVal + serviceFeeVal + markVal - discVal;
      debit = computedNetBilled;
      credit = Number(paymentAmount) || 0;
    } else {
      computedNetBilled = (grossFare + aitVal + markVal) - commAmount - discVal;
      debit = computedNetBilled;
      credit = Number(paymentAmount) || 0;
    }

    let result = null;

    await atomicMultiUpdate(['agents', 'ledger_entries', 'ticket_sales'], async (dataMap) => {
      const agents = dataMap['agents'];
      const ledgerEntries = dataMap['ledger_entries'];
      const ticketSales = dataMap['ticket_sales'] || [];

      const agent = agents.find((a) => a._id === bdAgentId || a.id === bdAgentId);
      if (!agent) throw new Error('Selected BD Agent not found.');

      const ticketId = `TKT-${Date.now()}`;
      const ticketSale = {
        _id: ticketId,
        id: ticketId,
        agent: agent._id || agent.id,
        pnr: pnr.toUpperCase(),
        ticketNumber: ticketNumber ? ticketNumber.trim() : '',
        airline: airline || '',
        airlineCode: airlineCode || '',
        route: route || '',
        passengerName,
        passportNumber: passportNumber || '',
        paxCounts: {
          adult: Number(paxCounts?.adult) || 1,
          child: Number(paxCounts?.child) || 0,
          infant: Number(paxCounts?.infant) || 0
        },
        issueDate: issueDate ? new Date(issueDate).toISOString() : new Date().toISOString(),
        travelDate: travelDate ? new Date(travelDate).toISOString() : null,
        baseFare: bFare,
        taxes: taxVal,
        grossFare,
        commissionRate: commPercent,
        ait: aitVal,
        markup: markVal,
        discount: discVal,
        netBilled: computedNetBilled,
        transactionType,
        originalPnr: originalPnr.toUpperCase(),
        originalTicketNumber: originalTicketNumber.trim(),
        penaltyCharge: penaltyVal,
        serviceFee: serviceFeeVal,
        notes,
        createdAt: new Date().toISOString()
      };
      ticketSales.push(ticketSale);

      const balanceChange = debit - credit;
      const newRunningBalance = (agent.currentBalance || 0) + balanceChange;
      agent.currentBalance = newRunningBalance;
      agent.updatedAt = new Date().toISOString();

      const entryId = generateEntryId(ledgerEntries);
      const paxTotal = (Number(paxCounts?.adult) || 1) + (Number(paxCounts?.child) || 0) + (Number(paxCounts?.infant) || 0);

      let descText = '';
      if (transactionType === 'REFUND') {
        descText = `Ticket Refund (${pnr.toUpperCase()}) Tkt# ${ticketNumber || 'N/A'} - ${passengerName} [Penalty: ৳${penaltyVal}]`;
      } else if (transactionType === 'REISSUE') {
        descText = `Ticket Reissue (${pnr.toUpperCase()}) Tkt# ${ticketNumber || 'N/A'} - ${passengerName} [Fee: ৳${serviceFeeVal}]`;
      } else {
        descText = `Ticket Issue (${airlineCode || airline || 'Flight'}) PNR: ${pnr.toUpperCase()} Tkt# ${ticketNumber || 'N/A'} - ${passengerName} (${paxTotal} Pax) [${route || 'Sector'}]`;
      }

      const ledgerEntry = {
        _id: entryId,
        id: entryId,
        agent: agent._id || agent.id,
        agentName: agent.name,
        agentCode: agent.agencyCode,
        agentType: agent.type,
        entryId,
        transactionType,
        date: issueDate ? new Date(issueDate).toISOString() : new Date().toISOString(),
        reference: pnr.toUpperCase(),
        gCode: ticketNumber || pnr.toUpperCase(),
        passengerName,
        passportNumber: passportNumber || '',
        description: descText,
        currency: 'BDT',
        exchangeRate: 1.0,
        debit,
        credit,
        runningBalance: newRunningBalance,
        paymentMethod: paymentMethod || (credit > 0 ? 'Direct Payment' : '-'),
        notes,
        createdAt: new Date().toISOString()
      };
      ledgerEntries.push(ledgerEntry);

      result = { ticketSale, ledgerEntry, agent };

      return {
        agents,
        ledger_entries: ledgerEntries,
        ticket_sales: ticketSales
      };
    });

    res.status(201).json({
      success: true,
      message: 'Air Ticket entry created successfully',
      data: result
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create Service Entry
exports.createServiceEntry = async (req, res) => {
  try {
    const {
      category,
      bdAgentId,
      saudiAgentId,
      gCode = '',
      passengerName = '',
      passportNumber = '',
      pax = 1,
      amountSAR = 0,
      saudiRate = 32.5,
      totalBDT = 0,
      paidAmount = 0,
      currency = 'BDT',
      modeOfPayment = 'Recv IN HAND (BDT)',
      trxId = '',
      depositSlipRef = '',
      notes = ''
    } = req.body;

    if (!category) {
      return res.status(400).json({ success: false, message: 'Category is required.' });
    }

    const paxNum = Number(pax) || 1;
    const rateSAR = Number(saudiRate) || 32.5;
    const sarCost = Number(amountSAR) || 0;
    const computedTotalBDT = Number(totalBDT) > 0 ? Number(totalBDT) : Math.round(sarCost * rateSAR);

    let result = null;

    await atomicMultiUpdate(['agents', 'ledger_entries', 'service_entries'], async (dataMap) => {
      const agents = dataMap['agents'];
      const ledgerEntries = dataMap['ledger_entries'];
      const serviceEntries = dataMap['service_entries'] || [];

      const serviceId = `SVC-${Date.now()}`;
      const serviceEntry = {
        _id: serviceId,
        id: serviceId,
        bdAgent: bdAgentId || null,
        saudiAgent: saudiAgentId || null,
        category,
        gCode: gCode || trxId || '',
        passengerName,
        passportNumber,
        pax: paxNum,
        amountSAR: sarCost,
        saudiRate: rateSAR,
        totalBDT: computedTotalBDT,
        notes,
        createdAt: new Date().toISOString()
      };
      serviceEntries.push(serviceEntry);

      const createdLedgers = [];

      if (category === 'PAYMENT TO ARAFA (A/R)') {
        if (bdAgentId) {
          const bdAgent = agents.find((a) => a._id === bdAgentId || a.id === bdAgentId);
          if (bdAgent) {
            let finalCreditBDT = Number(paidAmount) || computedTotalBDT;
            if (currency === 'SAR') {
              finalCreditBDT = Math.round((Number(paidAmount) || 0) * rateSAR);
            }

            const credit = finalCreditBDT;
            const newBalance = (bdAgent.currentBalance || 0) - credit;
            bdAgent.currentBalance = newBalance;
            bdAgent.updatedAt = new Date().toISOString();

            const entryId = generateEntryId(ledgerEntries);
            const desc = `PAYMENT TO ARAFA (A/R) - ${modeOfPayment} ${trxId ? `Trx# ${trxId}` : ''}`;

            const bdLedger = {
              _id: entryId,
              id: entryId,
              agent: bdAgent._id || bdAgent.id,
              agentName: bdAgent.name,
              agentCode: bdAgent.agencyCode,
              agentType: bdAgent.type,
              entryId,
              transactionType: 'PAYMENT_RECEIVED',
              date: new Date().toISOString(),
              reference: trxId || depositSlipRef || 'A/R PAYMENT',
              gCode: trxId || '',
              description: desc,
              currency,
              exchangeRate: currency === 'SAR' ? rateSAR : 1.0,
              debit: 0,
              credit,
              runningBalance: newBalance,
              paymentMethod: modeOfPayment,
              notes,
              createdAt: new Date().toISOString()
            };
            ledgerEntries.push(bdLedger);
            createdLedgers.push(bdLedger);
          }
        }
      } else {
        if (bdAgentId) {
          const bdAgent = agents.find((a) => a._id === bdAgentId || a.id === bdAgentId);
          if (bdAgent) {
            const debit = computedTotalBDT;
            const newBalance = (bdAgent.currentBalance || 0) + debit;
            bdAgent.currentBalance = newBalance;
            bdAgent.updatedAt = new Date().toISOString();

            const entryId = generateEntryId(ledgerEntries);
            const desc = `${category} Ref: ${gCode || 'Voucher'} - ${paxNum} PAX ${passengerName ? `[${passengerName}]` : ''}`;

            const bdLedger = {
              _id: entryId,
              id: entryId,
              agent: bdAgent._id || bdAgent.id,
              agentName: bdAgent.name,
              agentCode: bdAgent.agencyCode,
              agentType: bdAgent.type,
              entryId,
              transactionType: 'VISA_SERVICE',
              date: new Date().toISOString(),
              reference: gCode || 'SERVICE',
              gCode: gCode || '',
              description: desc,
              currency: 'BDT',
              exchangeRate: 1.0,
              debit,
              credit: 0,
              runningBalance: newBalance,
              paymentMethod: modeOfPayment,
              notes,
              createdAt: new Date().toISOString()
            };
            ledgerEntries.push(bdLedger);
            createdLedgers.push(bdLedger);
          }
        }
      }

      result = { serviceEntry, createdLedgers };

      return {
        agents,
        ledger_entries: ledgerEntries,
        service_entries: serviceEntries
      };
    });

    res.status(201).json({
      success: true,
      message: 'Service entry recorded successfully',
      data: result
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
