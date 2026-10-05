const { readData, writeData } = require('../services/jsonDb');

const bdAgencyList = [
  "ABBAS", "ABDULLAH MIYAJI", "ADRIB HOLYDAYS", "AHSANULLAH", "AIMAN", "AKBER BHAI",
  "AL AHSAN", "AL MADINAH", "AL MAHMUD", "AL MANAR INTERNATIONAL", "ALAUDDIN", "AMAN",
  "AMANULLAH", "AMAR TRAVELS", "AMINUL", "ANIK", "AR RAHIM", "ARIF", "ARIZONA TRAVELS",
  "AYMAN", "BAITUSSALAM", "BAIYENAH", "BORSHA OVERSES", "BOSS PERSONAL", "DHAKA HAJJ KAFELA",
  "EMAAR HOLIDAYS", "EVEREST", "EVEREST INT", "FAHAD", "FAHAD SIFAT", "FARISHTA", "FIRST ONE",
  "FLIGHT 24 BD", "Fly Burak", "FLY HAJJ", "FLY JOBALE NOOR", "HABIB", "HABIBA", "HABIBULLAH",
  "HADI", "HANJALA", "HARUN", "HOLY", "KAFLAN", "KHALES AVIATION", "LABBAIK HORIZON", "MADANI",
  "MINHAJ", "MISFALA", "MOHAJIR", "MOHAMMAD ALI", "MUZAHID TRAVELS", "NASRIN SULTANA", "NAZIR",
  "NAZMUL", "NAZRUL", "NEAMUL HOK", "NUR E HARAMINE", "RAKIB", "RAYHAN", "REDWAN VAI RB",
  "RIZKHAN", "SA FLY (SAYED)", "SAAD GROUP", "SADDAM", "SALMAN FARCY", "SARWAR", "SAYED KHAJA",
  "SELIM KHAJA", "SHAMIM", "SHAMS DUHA", "SHAMSSUDDOHA", "SUMAIYA", "TAHMID", "TALBIA", "TALHA",
  "ULAMA", "UNION", "UTTARA HAJJ GROUP", "ZAMZAM"
];

const saudiAgencyList = [
  "AL NASER RH", "AL SHOWAIGH", "BENAA FOR UMRAH", "BENAA SAUDI OFFICE", "DHANSHIRI BENAA",
  "ELHAM", "EXPERT BENAA", "EXPERT MIZAN", "MODERN GUEST", "REHLAT", "RIYAD AL HARAMAIN",
  "SOCIETY HEZAJJ MIAM", "SPECIAL BENAA ARAFA", "TARVEL GATE"
];

const seedAgencies = async () => {
  try {
    console.log('[SeedAgencies]: Accessing local JSON DB...');
    const agents = await readData('agents');

    let bdCount = 0;
    for (let i = 0; i < bdAgencyList.length; i++) {
      const name = bdAgencyList[i].trim();
      let exists = agents.find((a) => a.type === 'BD_AGENT' && a.name.toUpperCase() === name.toUpperCase());
      if (!exists) {
        let code = `BD-${101 + i}`;
        let existsCode = agents.some((a) => a.agencyCode === code);
        if (existsCode) {
          code = `BD-${500 + i}`;
        }
        const newAgent = {
          _id: `AGENT-${code}`,
          id: `AGENT-${code}`,
          name,
          agencyCode: code,
          type: 'BD_AGENT',
          phone: `+88017${Math.floor(10000000 + Math.random() * 90000000)}`,
          whatsapp: `+88017${Math.floor(10000000 + Math.random() * 90000000)}`,
          address: 'Dhaka, Bangladesh',
          creditLimit: 500000,
          currentBalance: 0,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        agents.push(newAgent);
        bdCount++;
      }
    }
    console.log(`[SeedAgencies]: BD Agencies Processed. Added ${bdCount} new BD Agencies.`);

    let saudiCount = 0;
    for (let i = 0; i < saudiAgencyList.length; i++) {
      const name = saudiAgencyList[i].trim();
      let exists = agents.find((a) => a.type === 'SAUDI_AGENT' && a.name.toUpperCase() === name.toUpperCase());
      if (!exists) {
        let code = `KSA-${201 + i}`;
        let existsCode = agents.some((a) => a.agencyCode === code);
        if (existsCode) {
          code = `KSA-${600 + i}`;
        }
        const newAgent = {
          _id: `AGENT-${code}`,
          id: `AGENT-${code}`,
          name,
          agencyCode: code,
          type: 'SAUDI_AGENT',
          phone: `+9665${Math.floor(10000000 + Math.random() * 90000000)}`,
          whatsapp: `+9665${Math.floor(10000000 + Math.random() * 90000000)}`,
          address: 'Makkah Mukarramah, KSA',
          creditLimit: 100000,
          currentBalance: 0,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        agents.push(newAgent);
        saudiCount++;
      }
    }
    console.log(`[SeedAgencies]: Saudi Agencies Processed. Added ${saudiCount} new Saudi Agencies.`);

    await writeData('agents', agents);
    console.log('[SeedAgencies]: Seeding completed successfully.');
  } catch (error) {
    console.error('[SeedAgencies Error]:', error.message);
  }
};

seedAgencies();
