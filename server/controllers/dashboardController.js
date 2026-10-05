const { readData } = require('../services/jsonDb');

exports.getDashboardSummary = async (req, res) => {
  try {
    const agents = await readData('agents');
    const ledgerEntries = await readData('ledger_entries');
    const { startDate, endDate } = req.query;

    let filteredLedger = ledgerEntries;
    if (startDate) {
      filteredLedger = filteredLedger.filter(e => new Date(e.date || e.createdAt) >= new Date(startDate));
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filteredLedger = filteredLedger.filter(e => new Date(e.date || e.createdAt) <= end);
    }

    const bdAgents = agents.filter(a => a.type === 'BD_AGENT');

    let totalReceivableBD = 0;
    let totalAdvanceBD = 0;
    let bdOverdueCount = 0;
    
    bdAgents.forEach(agent => {
      const bal = agent.currentBalance || 0;
      if (bal > 0) {
        totalReceivableBD += bal;
        bdOverdueCount++;
      } else if (bal < 0) {
        totalAdvanceBD += Math.abs(bal);
      }
    });

    let periodSalesVolume = 0;
    let periodCollections = 0;

    const todayStr = new Date().toISOString().split('T')[0];
    
    filteredLedger.forEach(entry => {
      const isPeriod = startDate || endDate ? true : (entry.date || entry.createdAt || '').startsWith(todayStr);
      
      if (isPeriod) {
        if (['VOUCHER_BILL', 'TICKET_SALE', 'SERVICE_ENTRY'].includes(entry.transactionType)) {
          periodSalesVolume += (entry.debit || 0);
        }
        if (entry.transactionType === 'PAYMENT_RECEIVED') {
          periodCollections += (entry.credit || 0);
        }
      }
    });

    const recentTransactions = filteredLedger
      .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date))
      .slice(0, 50)
      .map(entry => {
        const agent = agents.find(a => (a._id || a.id) === entry.agent);
        return { ...entry, agent: agent || { name: 'Unknown' } };
      });

    const overdueAgents = bdAgents
      .filter(a => (a.currentBalance || 0) > 0)
      .sort((a, b) => (b.currentBalance || 0) - (a.currentBalance || 0))
      .slice(0, 15);

    res.json({
      success: true,
      data: {
        kpis: {
          totalReceivableBD,
          totalAdvanceBD,
          bdOverdueCount,
          todaySalesVolume: periodSalesVolume,
          todayCollections: periodCollections,
          periodSalesVolume,
          periodCollections,
          isCustomRange: !!(startDate || endDate)
        },
        recentTransactions,
        overdueAgents
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
