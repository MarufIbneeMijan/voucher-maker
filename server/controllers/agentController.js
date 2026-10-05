const { readData, atomicUpdate } = require('../services/jsonDb');

// Get all agents (with optional type filter, search, sorting)
exports.getAgents = async (req, res) => {
  try {
    const { type, search, activeOnly } = req.query;
    let agents = await readData('agents');

    if (type && ['BD_AGENT', 'SAUDI_AGENT'].includes(type)) {
      agents = agents.filter((a) => a.type === type);
    }

    if (activeOnly === 'true') {
      agents = agents.filter((a) => a.isActive !== false);
    }

    if (search) {
      const term = search.toLowerCase();
      agents = agents.filter(
        (a) =>
          (a.name && a.name.toLowerCase().includes(term)) ||
          (a.agencyCode && a.agencyCode.toLowerCase().includes(term)) ||
          (a.phone && a.phone.toLowerCase().includes(term)) ||
          (a.whatsapp && a.whatsapp.toLowerCase().includes(term))
      );
    }

    // Sort alphabetically by name
    agents.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    res.json({ success: true, count: agents.length, data: agents });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single agent details
exports.getAgentById = async (req, res) => {
  try {
    const agents = await readData('agents');
    const agent = agents.find((a) => a._id === req.params.id || a.id === req.params.id);

    if (!agent) {
      return res.status(404).json({ success: false, message: 'Agent not found' });
    }

    res.json({ success: true, data: agent });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create a new Agent
exports.createAgent = async (req, res) => {
  try {
    const { name, agencyCode, type, phone, whatsapp, address, openingBalance, currentBalance } = req.body;

    if (!name || !agencyCode || !type || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Name, Agency Code, Type (BD_AGENT / SAUDI_AGENT), and Phone are required.'
      });
    }

    let createdAgent = null;

    await atomicUpdate('agents', async (agents) => {
      const codeUpper = agencyCode.toUpperCase();
      const existing = agents.find((a) => a.agencyCode === codeUpper);
      if (existing) {
        throw new Error(`Agency Code ${agencyCode} already exists.`);
      }

      const initialBal = Number(openingBalance !== undefined ? openingBalance : currentBalance) || 0;
      const id = `AGENT-${Date.now()}`;
      createdAgent = {
        _id: id,
        id,
        name: name.trim(),
        agencyCode: codeUpper,
        type,
        phone: phone.trim(),
        whatsapp: whatsapp ? whatsapp.trim() : phone.trim(),
        address: address ? address.trim() : '',
        totalBilled: initialBal > 0 ? initialBal : 0,
        totalPaid: initialBal < 0 ? Math.abs(initialBal) : 0,
        currentBalance: initialBal,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      agents.push(createdAgent);
      return agents;
    });

    res.status(201).json({ success: true, message: 'Agent created successfully', data: createdAgent });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update Agent
exports.updateAgent = async (req, res) => {
  try {
    const { name, phone, whatsapp, address, isActive } = req.body;
    let updatedAgent = null;

    await atomicUpdate('agents', async (agents) => {
      const idx = agents.findIndex((a) => a._id === req.params.id || a.id === req.params.id);
      if (idx === -1) {
        throw new Error('Agent not found');
      }

      const agent = agents[idx];
      if (name) agent.name = name.trim();
      if (phone) agent.phone = phone.trim();
      if (whatsapp) agent.whatsapp = whatsapp.trim();
      if (address !== undefined) agent.address = address.trim();
      if (isActive !== undefined) agent.isActive = isActive;
      
      // Purge any stale creditLimit
      delete agent.creditLimit;
      delete agent.creditLimitUtilization;

      agent.updatedAt = new Date().toISOString();

      updatedAgent = agent;
      return agents;
    });

    res.json({ success: true, message: 'Agent updated successfully', data: updatedAgent });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
