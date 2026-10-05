const fs = require('fs');
const path = require('path');
const { readData, writeData, ensureDataDir } = require('../services/jsonDb');

const seedDatabase = async () => {
  try {
    console.log('[Seed Script]: Initializing local JSON Database...');
    await ensureDataDir();

    const dumpDir = path.join(__dirname, '../../portal_dump');
    
    // 1. Load entry form structure choices for initial BD & Saudi agency creation
    const entryFormPath = path.join(dumpDir, 'entry_form_structure.json');
    let bdAgencyChoices = [];
    let saudiAgencyChoices = [];

    if (fs.existsSync(entryFormPath)) {
      const formStructure = JSON.parse(fs.readFileSync(entryFormPath, 'utf8'));
      const bdField = formStructure.formFields.find((f) => f.label.includes('BD Agency Name'));
      if (bdField && bdField.choices) {
        bdAgencyChoices = bdField.choices.filter((c) => c !== '---');
      }

      const saudiField = formStructure.formFields.find((f) => f.label.includes('Saudi Agency Name'));
      if (saudiField && saudiField.choices) {
        saudiAgencyChoices = saudiField.choices.filter((c) => c !== '---');
      }
    }

    console.log(`[Seed Script]: Found ${bdAgencyChoices.length} BD Agencies & ${saudiAgencyChoices.length} Saudi Agencies from dump choices.`);

    // 2. Load Detailed BD & Saudi Agent Dump Files
    const bdLedgerPath = path.join(dumpDir, 'ledger_bd_agent.json');
    const saudiLedgerPath = path.join(dumpDir, 'ledger_saudi_agent.json');

    const bdLedgerDump = fs.existsSync(bdLedgerPath) ? JSON.parse(fs.readFileSync(bdLedgerPath, 'utf8')) : { records: [] };
    const saudiLedgerDump = fs.existsSync(saudiLedgerPath) ? JSON.parse(fs.readFileSync(saudiLedgerPath, 'utf8')) : { records: [] };

    // Read existing agents
    const existingAgents = await readData('agents');
    const createdAgentsMap = new Map();
    existingAgents.forEach((a) => createdAgentsMap.set(a.name.toUpperCase(), a));

    let agentsAdded = 0;

    // Seed BD Agents from choices & ledger records
    for (let i = 0; i < bdAgencyChoices.length; i++) {
      const name = bdAgencyChoices[i].trim();
      const code = `BD-${101 + i}`;
      const dumpRec = bdLedgerDump.records.find((r) => r.agencyName.toUpperCase() === name.toUpperCase());

      let agent = existingAgents.find((a) => a.agencyCode === code || a.name.toUpperCase() === name.toUpperCase());
      if (!agent) {
        agent = {
          _id: `AGENT-BD-${101 + i}`,
          id: `AGENT-BD-${101 + i}`,
          name,
          agencyCode: code,
          type: 'BD_AGENT',
          phone: dumpRec?.phone || `+8801700${Math.floor(100000 + Math.random() * 900000)}`,
          whatsapp: dumpRec?.whatsapp || `+8801700${Math.floor(100000 + Math.random() * 900000)}`,
          address: dumpRec?.address || 'Dhaka, Bangladesh',
          creditLimit: dumpRec?.creditLimit || 500000,
          currentBalance: dumpRec?.currentBalance || 0,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        existingAgents.push(agent);
        agentsAdded++;
      }
      createdAgentsMap.set(name.toUpperCase(), agent);
    }

    // Seed Saudi Agents from choices & ledger records
    for (let i = 0; i < saudiAgencyChoices.length; i++) {
      const name = saudiAgencyChoices[i].trim();
      const code = `KSA-${201 + i}`;
      const dumpRec = saudiLedgerDump.records.find((r) => r.agencyName.toUpperCase() === name.toUpperCase());

      let agent = existingAgents.find((a) => a.agencyCode === code || a.name.toUpperCase() === name.toUpperCase());
      if (!agent) {
        agent = {
          _id: `AGENT-KSA-${201 + i}`,
          id: `AGENT-KSA-${201 + i}`,
          name,
          agencyCode: code,
          type: 'SAUDI_AGENT',
          phone: dumpRec?.phone || `+96650${Math.floor(1000000 + Math.random() * 9000000)}`,
          whatsapp: dumpRec?.whatsapp || `+96650${Math.floor(1000000 + Math.random() * 9000000)}`,
          address: dumpRec?.address || 'Makkah Mukarramah, KSA',
          creditLimit: dumpRec?.creditLimit || 100000,
          currentBalance: dumpRec?.currentBalance || 0,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        existingAgents.push(agent);
        agentsAdded++;
      }
      createdAgentsMap.set(name.toUpperCase(), agent);
    }

    await writeData('agents', existingAgents);
    console.log(`[Seed Script]: Saved ${existingAgents.length} Agents to data/agents.json (${agentsAdded} newly added).`);

    // 3. Seed Ledger Entries from BD Agency Statement & Saudi Agency Statement JSON files
    const bdStatementPath = path.join(dumpDir, 'bd_agency_statement.json');
    const saudiStatementPath = path.join(dumpDir, 'saudi_agency_statement.json');

    const bdStatementDump = fs.existsSync(bdStatementPath) ? JSON.parse(fs.readFileSync(bdStatementPath, 'utf8')) : { sampleRows: [] };
    const saudiStatementDump = fs.existsSync(saudiStatementPath) ? JSON.parse(fs.readFileSync(saudiStatementPath, 'utf8')) : { sampleRows: [] };

    const existingLedgers = await readData('ledger_entries');
    let entriesAdded = 0;

    // Seed BD Ledger Rows
    for (const row of bdStatementDump.sampleRows) {
      const exists = existingLedgers.some((e) => e.entryId === row.entryId);
      if (!exists) {
        const bdAgent = createdAgentsMap.get(row.agencyName.toUpperCase());
        if (bdAgent) {
          const entry = {
            _id: `ENT-${row.entryId}`,
            id: `ENT-${row.entryId}`,
            agent: bdAgent._id,
            agentName: bdAgent.name,
            agentCode: bdAgent.agencyCode,
            agentType: bdAgent.type,
            entryId: row.entryId,
            transactionType: row.payment > 0 && row.totalBill === 0 ? 'PAYMENT_RECEIVED' : 'UMRAH_PACKAGE',
            date: new Date(row.date).toISOString(),
            reference: row.gCode || '',
            gCode: row.gCode || '',
            description: row.description,
            currency: 'BDT',
            exchangeRate: 1.0,
            debit: row.totalBill,
            credit: row.payment,
            runningBalance: row.balance,
            paymentMethod: row.paymentMethod || '-',
            createdAt: new Date(row.date).toISOString(),
            updatedAt: new Date(row.date).toISOString()
          };
          existingLedgers.push(entry);
          entriesAdded++;
        }
      }
    }

    // Seed Saudi Ledger Rows
    for (const row of saudiStatementDump.sampleRows) {
      const exists = existingLedgers.some((e) => e.entryId === row.entryId);
      if (!exists) {
        const saudiAgent = createdAgentsMap.get(row.saudiCompany.toUpperCase());
        if (saudiAgent) {
          const entry = {
            _id: `ENT-${row.entryId}`,
            id: `ENT-${row.entryId}`,
            agent: saudiAgent._id,
            agentName: saudiAgent.name,
            agentCode: saudiAgent.agencyCode,
            agentType: saudiAgent.type,
            entryId: row.entryId,
            transactionType: row.payment > 0 && row.totalBill === 0 ? 'PAYMENT_PAID' : 'UMRAH_PACKAGE',
            date: new Date(row.date).toISOString(),
            reference: row.gCode || '',
            gCode: row.gCode || '',
            description: row.description,
            currency: 'SAR',
            exchangeRate: 32.5,
            debit: row.totalBill,
            credit: row.payment,
            runningBalance: row.balance,
            paymentMethod: row.paymentMethod || '-',
            createdAt: new Date(row.date).toISOString(),
            updatedAt: new Date(row.date).toISOString()
          };
          existingLedgers.push(entry);
          entriesAdded++;
        }
      }
    }

    await writeData('ledger_entries', existingLedgers);
    console.log(`[Seed Script]: Saved ${existingLedgers.length} Ledger Entries to data/ledger_entries.json (${entriesAdded} newly added).`);

    // Ensure billing_entries.json exists
    await readData('billing_entries');

    console.log('[Seed Script]: Local JSON database seeding completed successfully.');
  } catch (error) {
    console.error(`[Seed Script Error]: ${error.message}`);
    process.exit(1);
  }
};

seedDatabase();
