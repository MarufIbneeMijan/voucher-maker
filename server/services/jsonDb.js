const fs = require('fs/promises');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');

// In-memory mutex per file to serialize writes and prevent race conditions
const fileLocks = new Map();

async function acquireLock(fileKey) {
  while (fileLocks.get(fileKey)) {
    await fileLocks.get(fileKey);
  }
  let resolveLock;
  const promise = new Promise((resolve) => {
    resolveLock = resolve;
  });
  fileLocks.set(fileKey, promise);

  return () => {
    fileLocks.delete(fileKey);
    resolveLock();
  };
}

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') {
      throw err;
    }
  }
}

function resolveFilePath(filename) {
  const name = filename.endsWith('.json') ? filename : `${filename}.json`;
  return path.join(DATA_DIR, name);
}

/**
 * Reads JSON array/object from disk. Auto-initializes with empty array if missing.
 */
async function readData(filename) {
  await ensureDataDir();
  const filePath = resolveFilePath(filename);

  try {
    const raw = await fs.readFile(filePath, 'utf8');
    if (!raw || !raw.trim()) {
      const defaultContent = [];
      await fs.writeFile(filePath, JSON.stringify(defaultContent, null, 2), 'utf8');
      return defaultContent;
    }
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') {
      const defaultContent = [];
      await fs.writeFile(filePath, JSON.stringify(defaultContent, null, 2), 'utf8');
      return defaultContent;
    }
    throw err;
  }
}

/**
 * Writes data to disk atomically using a temporary file.
 */
async function writeData(filename, data) {
  await ensureDataDir();
  const filePath = resolveFilePath(filename);
  const tempPath = `${filePath}.tmp.${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const content = JSON.stringify(data, null, 2);
  await fs.writeFile(tempPath, content, 'utf8');
  await fs.rename(tempPath, filePath);
}

/**
 * Atomic update wrapper for single or multi-file transactions.
 * Usage:
 * await atomicUpdate('billing_entries', async (entries) => {
 *   entries.push(newVoucher);
 *   return entries;
 * });
 */
async function atomicUpdate(filename, updateFn) {
  const release = await acquireLock(filename);
  try {
    const currentData = await readData(filename);
    const updatedData = await updateFn(currentData);
    if (updatedData !== undefined) {
      await writeData(filename, updatedData);
    }
    return updatedData;
  } finally {
    release();
  }
}

/**
 * Atomic multi-file updater for composite operations (e.g., Billing + Ledger + Agents)
 */
async function atomicMultiUpdate(filenames, updateFn) {
  // Lock all files in lexicographical order to prevent deadlocks
  const sortedFiles = [...filenames].sort();
  const releaseFns = [];

  try {
    for (const file of sortedFiles) {
      const release = await acquireLock(file);
      releaseFns.push(release);
    }

    // Read current states
    const dataMap = {};
    for (const file of filenames) {
      dataMap[file] = await readData(file);
    }

    // Execute multi-file mutations
    const updatedMap = await updateFn(dataMap);

    // Save modified files
    if (updatedMap) {
      for (const file of filenames) {
        if (updatedMap[file]) {
          await writeData(file, updatedMap[file]);
        }
      }
    }

    return updatedMap;
  } finally {
    // Release locks in reverse order
    for (let i = releaseFns.length - 1; i >= 0; i--) {
      releaseFns[i]();
    }
  }
}

module.exports = {
  ensureDataDir,
  readData,
  writeData,
  atomicUpdate,
  atomicMultiUpdate
};
