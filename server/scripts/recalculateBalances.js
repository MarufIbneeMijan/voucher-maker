/**
 * TravelLedger — Balance & Three-Pillars Resynchronization Utility
 * ───────────────────────────────────────────────────────────────
 * Recalculates:
 * 1. totalBilled: Sum of all debits
 * 2. totalPaid: Sum of all credits
 * 3. currentBalance: totalBilled - totalPaid
 * Purges:
 * - creditLimit & creditLimitUtilization
 */

const path = require('path');
const fs   = require('fs/promises');

const DATA_DIR = path.join(__dirname, '../data');

async function readFile(name) {
  const fp = path.join(DATA_DIR, `${name}.json`);
  try {
    return JSON.parse(await fs.readFile(fp, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

async function writeFileAtomic(name, data) {
  const fp   = path.join(DATA_DIR, `${name}.json`);
  const tmp  = `${fp}.tmp.${Date.now()}`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(tmp, fp);
}

async function recalculateAll() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  TravelLedger — Three-Pillar & Balance Resync Engine');
  console.log('═══════════════════════════════════════════════════');

  const agents        = await readFile('agents');
  const ledgerEntries = await readFile('ledger_entries');

  console.log(`\n📂 Loaded ${agents.length} agents, ${ledgerEntries.length} ledger entries\n`);

  const billedMap  = {};
  const paidMap    = {};
  const balanceMap = {};

  agents.forEach((a) => {
    const id = a._id || a.id;
    billedMap[id]  = 0;
    paidMap[id]    = 0;
    balanceMap[id] = 0;
  });

  // Sort ledger entries chronologically
  const sorted = [...ledgerEntries].sort((a, b) => {
    const dateA = new Date(a.date || a.createdAt || 0).getTime();
    const dateB = new Date(b.date || b.createdAt || 0).getTime();
    if (dateA !== dateB) return dateA - dateB;
    const caA = new Date(a.createdAt || 0).getTime();
    const caB = new Date(b.createdAt || 0).getTime();
    return caA - caB;
  });

  let repaired = 0;
  sorted.forEach((entry) => {
    const agentId = typeof entry.agent === 'object'
      ? (entry.agent?._id || entry.agent?.id)
      : entry.agent;

    if (!agentId || balanceMap[agentId] === undefined) {
      return;
    }

    const debit  = Number(entry.debit)  || 0;
    const credit = Number(entry.credit) || 0;

    billedMap[agentId]  += debit;
    paidMap[agentId]    += credit;
    balanceMap[agentId] += debit - credit;

    const newRunning = balanceMap[agentId];
    if (entry.runningBalance !== newRunning) {
      entry.runningBalance = newRunning;
      repaired++;
    }
  });

  // Purge creditLimit and save three pillars to each agent
  agents.forEach((a) => {
    const id = a._id || a.id;
    delete a.creditLimit;
    delete a.creditLimitUtilization;

    a.totalBilled     = Math.round((billedMap[id] || 0) * 100) / 100;
    a.totalPaid       = Math.round((paidMap[id] || 0) * 100) / 100;
    a.currentBalance  = Math.round((balanceMap[id] || 0) * 100) / 100;
    a.updatedAt       = new Date().toISOString();

    console.log(`  ✅ ${a.name} (${a.agencyCode}) [${a.type}]`);
    console.log(`     Total Billed: ${a.totalBilled} | Total Paid: ${a.totalPaid} | Current Balance: ${a.currentBalance}`);
  });

  await writeFileAtomic('agents', agents);
  await writeFileAtomic('ledger_entries', sorted);

  console.log(`\n✔️ Repaired ${repaired} runningBalance field(s) across ledger entries`);
  console.log(`✔️ All agents updated with totalBilled, totalPaid, currentBalance`);
  console.log(`✔️ Credit Limit purged completely`);
  console.log('═══════════════════════════════════════════════════\n');
}

recalculateAll().catch((err) => {
  console.error('\n❌ Resync failed:', err.message);
  process.exit(1);
});
