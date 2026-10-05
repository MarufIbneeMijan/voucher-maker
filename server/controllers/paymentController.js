const { readData, atomicMultiUpdate } = require('../services/jsonDb');
const { generateEntryId } = require('./ledgerController');

// Record a Payment/Deposit clearance from an Agent or Payment to Saudi Supplier
exports.createPayment = async (req, res) => {
  try {
    const {
      agentId,
      amount,
      currency = 'BDT',
      exchangeRate = 1.0,
      method,
      bankName = '',
      branch = '',
      chequeNumber = '',
      trxId = '',
      paidBy = 'CASH',
      status = 'APPROVED',
      depositSlipUrl = '',
      date,
      notes = ''
    } = req.body;

    if (!agentId || !amount || !method) {
      return res.status(400).json({
        success: false,
        message: 'Agent, Amount, and Payment Method are required.'
      });
    }

    const payAmount = Number(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount must be greater than zero.'
      });
    }

    let result = null;

    await atomicMultiUpdate(['agents', 'ledger_entries', 'payments'], async (dataMap) => {
      const agents = dataMap['agents'];
      const ledgerEntries = dataMap['ledger_entries'];
      const payments = dataMap['payments'] || [];

      const agent = agents.find((a) => a._id === agentId || a.id === agentId);
      if (!agent) {
        throw new Error('Selected Agent not found.');
      }

      const paymentId = `PAY-${Date.now()}`;
      const payment = {
        _id: paymentId,
        id: paymentId,
        agent: agent._id || agent.id,
        agentName: agent.name,
        agentCode: agent.agencyCode,
        amount: payAmount,
        currency,
        exchangeRate: Number(exchangeRate) || 1.0,
        method,
        bankDetails: { bankName, branch, chequeNumber },
        trxId,
        status,
        depositSlipUrl,
        paidBy,
        date: date ? new Date(date).toISOString() : new Date().toISOString(),
        notes,
        createdAt: new Date().toISOString()
      };
      payments.push(payment);

      const debit = 0;
      const credit = payAmount;
      const balanceChange = debit - credit;
      const newRunningBalance = (agent.currentBalance || 0) + balanceChange;

      agent.currentBalance = newRunningBalance;
      agent.updatedAt = new Date().toISOString();

      const entryId = generateEntryId(ledgerEntries);
      const desc = `Payment / Deposit Clearance (${method}) ${trxId ? `Trx# ${trxId}` : ''} ${chequeNumber ? `Chq# ${chequeNumber}` : ''}`;

      const ledgerEntry = {
        _id: entryId,
        id: entryId,
        agent: agent._id || agent.id,
        agentName: agent.name,
        agentCode: agent.agencyCode,
        agentType: agent.type,
        entryId,
        transactionType: agent.type === 'SAUDI_AGENT' ? 'PAYMENT_PAID' : 'PAYMENT_RECEIVED',
        date: date ? new Date(date).toISOString() : new Date().toISOString(),
        reference: trxId || chequeNumber || 'PAYMENT',
        description: desc,
        currency,
        exchangeRate: Number(exchangeRate) || 1.0,
        debit,
        credit,
        runningBalance: newRunningBalance,
        paymentMethod: method,
        notes,
        createdAt: new Date().toISOString()
      };
      ledgerEntries.push(ledgerEntry);

      result = { payment, ledgerEntry, agent };

      return {
        agents,
        ledger_entries: ledgerEntries,
        payments
      };
    });

    res.status(201).json({
      success: true,
      message: 'Payment recorded and balance updated successfully',
      data: result
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Payments list
exports.getPayments = async (req, res) => {
  try {
    const { agentId, limit = 50 } = req.query;
    const payments = await readData('payments');
    const agents = await readData('agents');

    const agentMap = new Map();
    agents.forEach((a) => agentMap.set(a._id || a.id, a));

    let filtered = [...payments];
    if (agentId) {
      filtered = filtered.filter((p) => p.agent === agentId);
    }

    filtered.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    const paginated = filtered.slice(0, parseInt(limit));

    const data = paginated.map((p) => {
      const ag = agentMap.get(p.agent);
      return {
        ...p,
        agent: ag
          ? { _id: ag._id || ag.id, name: ag.name, agencyCode: ag.agencyCode, type: ag.type, phone: ag.phone }
          : p.agent
      };
    });

    res.json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
