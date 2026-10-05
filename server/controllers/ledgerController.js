const { readData, atomicMultiUpdate } = require('../services/jsonDb');

// Generate next sequential Entry ID (ENT-1001, ENT-1002...)
const generateEntryId = (entries = []) => {
  if (!entries || entries.length === 0) {
    return 'ENT-1001';
  }

  let maxNum = 1000;
  entries.forEach((e) => {
    if (e.entryId) {
      const match = e.entryId.match(/ENT-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
  });

  return `ENT-${maxNum + 1}`;
};

// Get Ledger Entries for an Agent or Date-wise search with strict chronological ordering & running balance recalculation
exports.getLedgerEntries = async (req, res) => {
  try {
    const { agentId, startDate, endDate, search, transactionType, currency, limit = 500, page = 1 } = req.query;

    const allEntries = await readData('ledger_entries');
    const allAgents = await readData('agents');

    const agentMap = new Map();
    allAgents.forEach((a) => agentMap.set(a._id || a.id, a));

    let filtered = [...allEntries];

    if (agentId) {
      filtered = filtered.filter(
        (e) => (typeof e.agent === 'object' ? e.agent?._id || e.agent?.id : e.agent) === agentId
      );
    }

    if (startDate || endDate) {
      const startMs = startDate ? new Date(startDate).getTime() : 0;
      let endMs = Infinity;
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        endMs = end.getTime();
      }
      filtered = filtered.filter((e) => {
        const t = new Date(e.date || e.createdAt || 0).getTime();
        return t >= startMs && t <= endMs;
      });
    }

    if (transactionType) {
      filtered = filtered.filter((e) => e.transactionType === transactionType);
    }

    if (currency) {
      filtered = filtered.filter((e) => e.currency === currency);
    }

    if (search) {
      const term = search.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          (e.entryId && e.entryId.toLowerCase().includes(term)) ||
          (e.reference && e.reference.toLowerCase().includes(term)) ||
          (e.gCode && e.gCode.toLowerCase().includes(term)) ||
          (e.passengerName && e.passengerName.toLowerCase().includes(term)) ||
          (e.passportNumber && e.passportNumber.toLowerCase().includes(term)) ||
          (e.description && e.description.toLowerCase().includes(term)) ||
          (e.notes && e.notes.toLowerCase().includes(term))
      );
    }

    // Strict chronological order (oldest to newest)
    filtered.sort((a, b) => {
      const timeA = new Date(a.date || a.createdAt || 0).getTime();
      const timeB = new Date(b.date || b.createdAt || 0).getTime();
      if (timeA !== timeB) return timeA - timeB;
      const createdA = new Date(a.createdAt || 0).getTime();
      const createdB = new Date(b.createdAt || 0).getTime();
      return createdA - createdB;
    });

    const totalCount = filtered.length;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 500;
    const skip = (pageNum - 1) * limitNum;
    const paginated = filtered.slice(skip, skip + limitNum);

    let accumulator = 0;
    let totalDebit = 0;
    let totalCredit = 0;

    const formattedEntries = paginated.map((entry) => {
      const d = Number(entry.debit) || 0;
      const c = Number(entry.credit) || 0;
      totalDebit += d;
      totalCredit += c;
      accumulator += (d - c);

      const agId = typeof entry.agent === 'object' ? entry.agent?._id : entry.agent;
      const saudiId = typeof entry.saudiAgent === 'object' ? entry.saudiAgent?._id : entry.saudiAgent;

      const ag = agentMap.get(agId);
      const saudi = agentMap.get(saudiId);

      return {
        ...entry,
        agent: ag
          ? {
              _id: ag._id || ag.id,
              name: ag.name,
              agencyCode: ag.agencyCode,
              type: ag.type,
              phone: ag.phone,
              whatsapp: ag.whatsapp,
              address: ag.address,
              currentBalance: ag.currentBalance,
              totalBilled: ag.totalBilled || 0,
              totalPaid: ag.totalPaid || 0
            }
          : entry.agent,
        saudiAgent: saudi
          ? {
              _id: saudi._id || saudi.id,
              name: saudi.name,
              agencyCode: saudi.agencyCode
            }
          : entry.saudiAgent,
        dynamicRunningBalance: accumulator
      };
    });

    res.json({
      success: true,
      totalCount,
      page: pageNum,
      limit: limitNum,
      summary: {
        totalDebit,
        totalCredit,
        netBalance: totalDebit - totalCredit
      },
      data: formattedEntries
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create a Manual / Opening Due / Adjustment Ledger Entry (ATOMIC TRANSACTION)
exports.createManualEntry = async (req, res) => {
  try {
    const {
      agentId,
      transactionType = 'ADJUSTMENT',
      date,
      reference,
      gCode,
      passengerName,
      passportNumber,
      description,
      currency = 'BDT',
      exchangeRate = 1.0,
      debit = 0,
      credit = 0,
      paymentMethod = '-',
      notes = ''
    } = req.body;

    if (!agentId || !description) {
      return res.status(400).json({
        success: false,
        message: 'Agent ID and Description are required.'
      });
    }

    const dAmount = Number(debit) || 0;
    const cAmount = Number(credit) || 0;

    if (dAmount === 0 && cAmount === 0) {
      return res.status(400).json({
        success: false,
        message: 'Either Debit or Credit amount must be greater than zero.'
      });
    }

    let createdEntry = null;
    let updatedAgent = null;

    await atomicMultiUpdate(['agents', 'ledger_entries'], async (dataMap) => {
      const agents = dataMap['agents'];
      const ledgerEntries = dataMap['ledger_entries'];

      const agent = agents.find((a) => a._id === agentId || a.id === agentId);
      if (!agent) {
        throw new Error('Selected Agent not found.');
      }

      const balanceChange = dAmount - cAmount;
      const newRunningBalance = (agent.currentBalance || 0) + balanceChange;
      agent.currentBalance = newRunningBalance;
      agent.updatedAt = new Date().toISOString();
      updatedAgent = agent;

      const entryId = generateEntryId(ledgerEntries);

      createdEntry = {
        _id: entryId,
        id: entryId,
        agent: agent._id || agent.id,
        agentName: agent.name,
        agentCode: agent.agencyCode,
        agentType: agent.type,
        entryId,
        transactionType,
        date: date ? new Date(date).toISOString() : new Date().toISOString(),
        reference: reference || '',
        gCode: gCode || '',
        passengerName: passengerName || '',
        passportNumber: passportNumber || '',
        description,
        currency,
        exchangeRate: Number(exchangeRate) || 1.0,
        debit: dAmount,
        credit: cAmount,
        runningBalance: newRunningBalance,
        paymentMethod: paymentMethod || '-',
        notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      ledgerEntries.push(createdEntry);

      return {
        agents,
        ledger_entries: ledgerEntries
      };
    });

    res.status(201).json({
      success: true,
      message: 'Ledger entry recorded successfully',
      data: createdEntry,
      updatedBalance: updatedAgent.currentBalance
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/ledger/recalculate-all — Resync all agent balances from ledger replay
exports.recalculateAll = async (req, res) => {
  try {
    let totalRepaired = 0;
    let agentSummary = [];

    await atomicMultiUpdate(['agents', 'ledger_entries'], async (dataMap) => {
      const agents        = dataMap['agents'];
      const ledgerEntries = dataMap['ledger_entries'];

      // 1. Build maps & zero all agents
      const balanceMap = {};
      const billedMap = {};
      const paidMap = {};
      agents.forEach((a) => {
        const id = a._id || a.id;
        balanceMap[id] = 0;
        billedMap[id] = 0;
        paidMap[id] = 0;
        a.currentBalance = 0;
      });

      // 2. Sort entries chronologically
      ledgerEntries.sort((a, b) => {
        const dateA = new Date(a.date || a.createdAt || 0).getTime();
        const dateB = new Date(b.date || b.createdAt || 0).getTime();
        if (dateA !== dateB) return dateA - dateB;
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      });

      // 3. Replay each entry
      ledgerEntries.forEach((entry) => {
        const agentId = typeof entry.agent === 'object'
          ? (entry.agent?._id || entry.agent?.id)
          : entry.agent;
        if (!agentId || balanceMap[agentId] === undefined) return;

        const debit  = Number(entry.debit)  || 0;
        const credit = Number(entry.credit) || 0;

        billedMap[agentId] += debit;
        paidMap[agentId] += credit;
        balanceMap[agentId] += debit - credit;

        if (entry.runningBalance !== balanceMap[agentId]) {
          entry.runningBalance = balanceMap[agentId];
          totalRepaired++;
        }
      });

      // 4. Write final balance back to agents
      agents.forEach((a) => {
        const id  = a._id || a.id;
        delete a.creditLimit;
        delete a.creditLimitUtilization;
        a.totalBilled = Math.round((billedMap[id] || 0) * 100) / 100;
        a.totalPaid = Math.round((paidMap[id] || 0) * 100) / 100;
        a.currentBalance = Math.round((balanceMap[id] !== undefined ? balanceMap[id] : 0) * 100) / 100;
        a.updatedAt = new Date().toISOString();
        agentSummary.push({
          id,
          name: a.name,
          code: a.agencyCode,
          type: a.type,
          totalBilled: a.totalBilled,
          totalPaid: a.totalPaid,
          newBalance: a.currentBalance
        });
      });

      return { agents, ledger_entries: ledgerEntries };
    });

    res.json({
      success: true,
      message: `Balance resync complete. Repaired ${totalRepaired} ledger runningBalance field(s).`,
      data: { totalEntriesRepaired: totalRepaired, agents: agentSummary }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports.generateEntryId = generateEntryId;
