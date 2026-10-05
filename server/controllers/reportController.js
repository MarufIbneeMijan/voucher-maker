const { readData } = require('../services/jsonDb');

// SAR → BDT fixed exchange rate used across reports
const SAR_TO_BDT_RATE = 32.5;

/**
 * GET /api/reports/receivables
 * Returns BD agents with a positive balance (they owe us money),
 * sorted highest balance first.
 */
async function getReceivables(req, res) {
  try {
    const agents = await readData('agents');

    // Filter: BD agents with outstanding receivable balance
    const receivables = agents
      .filter((a) => a.type === 'BD_AGENT' && a.currentBalance > 0)
      .sort((a, b) => b.currentBalance - a.currentBalance);

    const totalReceivable = receivables.reduce((sum, a) => sum + a.currentBalance, 0);

    return res.json({
      success: true,
      data: receivables,
      summary: {
        totalReceivable,
        count: receivables.length,
        highestDebtor: receivables.length > 0 ? receivables[0] : null,
      },
    });
  } catch (err) {
    console.error('[getReceivables] Error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to generate receivables report.' });
  }
}

/**
 * GET /api/reports/advance-deposits
 * Returns BD agents with a negative balance (we hold their advance money),
 * sorted most-negative first (largest deposit at top).
 */
async function getAdvanceDeposits(req, res) {
  try {
    const agents = await readData('agents');

    // Filter: BD agents with credit/advance balance (negative means we owe them)
    const deposits = agents
      .filter((a) => a.type === 'BD_AGENT' && a.currentBalance < 0)
      .sort((a, b) => a.currentBalance - b.currentBalance); // ascending → most negative first

    const totalAdvanceHeld = deposits.reduce((sum, a) => sum + Math.abs(a.currentBalance), 0);

    return res.json({
      success: true,
      data: deposits,
      summary: {
        totalAdvanceHeld,
        count: deposits.length,
      },
    });
  } catch (err) {
    console.error('[getAdvanceDeposits] Error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to generate advance deposits report.' });
  }
}

/**
 * GET /api/reports/ksa-exposure
 * Returns Saudi suppliers with computed SAR invoice / payment totals and
 * outstanding balance in both SAR and BDT.
 */
async function getKsaExposure(req, res) {
  try {
    const [agents, ledgerEntries] = await Promise.all([
      readData('agents'),
      readData('ledger_entries'),
    ]);

    // Only Saudi supplier agents
    const saudiAgents = agents.filter((a) => a.type === 'SAUDI_AGENT');

    const suppliersWithTotals = saudiAgents.map((supplier) => {
      // Ledger entries belonging to this supplier, denominated in SAR
      const supplierEntries = ledgerEntries.filter(
        (e) => e.agentId === supplier.id && e.currency === 'SAR'
      );

      // Debit entries = invoices raised against the supplier
      const totalInvoicedSAR = supplierEntries
        .filter((e) => e.type === 'debit' || e.entryType === 'debit')
        .reduce((sum, e) => sum + (e.amount || 0), 0);

      // Credit entries = payments made to the supplier
      const totalPaidSAR = supplierEntries
        .filter((e) => e.type === 'credit' || e.entryType === 'credit')
        .reduce((sum, e) => sum + (e.amount || 0), 0);

      const outstandingBalanceSAR = supplier.currentBalance ?? 0;
      const outstandingBDT = outstandingBalanceSAR * SAR_TO_BDT_RATE;
      const status = outstandingBalanceSAR > 0 ? 'Pending Payment' : 'Clear';

      return {
        ...supplier,
        totalInvoicedSAR,
        totalPaidSAR,
        outstandingBalanceSAR,
        outstandingBDT,
        status,
      };
    });

    const activeCount = suppliersWithTotals.filter((s) => s.outstandingBalanceSAR > 0).length;
    const totalOutstandingSAR = suppliersWithTotals.reduce(
      (sum, s) => sum + (s.outstandingBalanceSAR > 0 ? s.outstandingBalanceSAR : 0),
      0
    );
    const totalOutstandingBDT = totalOutstandingSAR * SAR_TO_BDT_RATE;

    return res.json({
      success: true,
      data: suppliersWithTotals,
      summary: {
        totalOutstandingSAR,
        totalOutstandingBDT,
        activeCount,
      },
    });
  } catch (err) {
    console.error('[getKsaExposure] Error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to generate KSA exposure report.' });
  }
}

/**
 * GET /api/reports/daily-flow?date=YYYY-MM-DD
 * Returns all ledger entries for the given date (defaults to today).
 * Enriches each entry with the agent name looked up from agents.json.
 */
async function getDailyFlow(req, res) {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const [allEntries, agents] = await Promise.all([
      readData('ledger_entries'),
      readData('agents'),
    ]);

    // Build a fast agent lookup map: id → name
    const agentMap = agents.reduce((map, a) => {
      map[a.id] = a.name || a.agentName || 'Unknown';
      return map;
    }, {});

    // Filter entries that fall on the target date
    const filtered = allEntries.filter((e) =>
      (e.date || e.createdAt || '').startsWith(targetDate)
    );

    // Enrich each entry with the agent's display name
    const enrichedEntries = filtered.map((e) => ({
      ...e,
      agentName: agentMap[e.agentId] || 'Unknown',
    }));

    // Compute daily totals
    const totalDebit = enrichedEntries
      .filter((e) => e.type === 'debit' || e.entryType === 'debit')
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    const totalCredit = enrichedEntries
      .filter((e) => e.type === 'credit' || e.entryType === 'credit')
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    const netFlow = totalCredit - totalDebit;

    return res.json({
      success: true,
      data: {
        date: targetDate,
        entries: enrichedEntries,
        summary: {
          totalBilling: totalDebit,    // outgoing / invoiced
          totalCollections: totalCredit, // incoming / received
          netFlow,                       // positive = net inflow
        },
      },
    });
  } catch (err) {
    console.error('[getDailyFlow] Error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to generate daily flow report.' });
  }
}

module.exports = {
  getReceivables,
  getAdvanceDeposits,
  getKsaExposure,
  getDailyFlow,
};
