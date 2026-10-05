const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { ensureDataDir, readData, writeData, atomicUpdate } = require('./jsonDb');

const JWT_SECRET = process.env.JWT_SECRET || 'traveledger-secret-key-2026-production';
const TOKEN_EXPIRY_SECONDS = 24 * 60 * 60; // 24 hours

/**
 * Base64URL encoding helper
 */
function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/**
 * Base64URL decoding helper
 */
function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

/**
 * Generates an HMAC-SHA256 signed JWT token
 */
function signToken(payload, expiresInSec = TOKEN_EXPIRY_SECONDS) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSec
  };

  const encHeader = base64UrlEncode(JSON.stringify(header));
  const encPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const data = `${encHeader}.${encPayload}`;

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(data)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${data}.${signature}`;
}

/**
 * Verifies an HMAC-SHA256 signed JWT token
 */
function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [encHeader, encPayload, signature] = parts;
  const data = `${encHeader}.${encPayload}`;

  const expectedSig = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(data)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const bufSig = Buffer.from(signature);
  const bufExpected = Buffer.from(expectedSig);

  if (bufSig.length !== bufExpected.length || !crypto.timingSafeEqual(bufSig, bufExpected)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encPayload));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }
    return payload;
  } catch (err) {
    return null;
  }
}

/**
 * Verifies password against stored password string (supports plaintext, SHA-256, and PBKDF2 salt:hash)
 */
function verifyPassword(inputPassword, storedPassword) {
  if (!inputPassword || !storedPassword) return false;

  // 1. Direct plaintext match (for seeded admin and plaintext records)
  if (inputPassword === storedPassword) return true;

  // 2. PBKDF2 salt:hash match
  if (typeof storedPassword === 'string' && storedPassword.includes(':')) {
    const [salt, hash] = storedPassword.split(':');
    if (salt && hash) {
      try {
        const computed = crypto.pbkdf2Sync(inputPassword, salt, 1000, 64, 'sha512').toString('hex');
        const bufHash = Buffer.from(hash, 'hex');
        const bufComputed = Buffer.from(computed, 'hex');
        if (bufHash.length === bufComputed.length && crypto.timingSafeEqual(bufHash, bufComputed)) {
          return true;
        }
      } catch (_) {}
    }
  }

  // 3. SHA-256 hash match
  try {
    const sha256 = crypto.createHash('sha256').update(inputPassword).digest('hex');
    if (storedPassword === sha256) return true;
  } catch (_) {}

  return false;
}

/**
 * Hashes password using PBKDF2 with random salt
 */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Returns safe user object without password
 */
function sanitizeUser(user) {
  if (!user) return null;
  return {
    id: user.id || user._id,
    username: user.username,
    role: user.role,
    name: user.name || user.username,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

/**
 * Auto-seeds server/data/users.json with default admin credentials if missing or empty
 */
async function ensureDefaultAdmin() {
  await ensureDataDir();
  const filePath = path.join(__dirname, '../data/users.json');

  let raw = null;
  try {
    raw = await fs.readFile(filePath, 'utf8');
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }

  let needsSeed = false;
  let existingUsers = [];
  if (raw === null || raw.trim().length === 0) {
    needsSeed = true;
  } else {
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        needsSeed = true;
      } else {
        existingUsers = parsed;
      }
    } catch (_) {
      needsSeed = true;
    }
  }

  const now = new Date().toISOString();
  const defaultAdmin = {
    _id: 'USER-1',
    id: 'USER-1',
    username: 'admin',
    password: 'admin',
    role: 'Super Admin',
    name: 'Super Admin',
    createdAt: now,
    updatedAt: now
  };

  if (needsSeed) {
    await writeData('users', [defaultAdmin]);
    return [defaultAdmin];
  }

  // If file exists, ensure default admin exists
  const hasAdmin = existingUsers.some((u) => (u.username || '').toLowerCase() === 'admin');
  if (!hasAdmin) {
    return await atomicUpdate('users', async (users) => {
      const exists = (users || []).some((u) => (u.username || '').toLowerCase() === 'admin');
      if (!exists) {
        users.unshift(defaultAdmin);
      }
      return users;
    });
  }

  return existingUsers;
}

/**
 * Finds user by username (case-insensitive)
 */
async function findUserByUsername(username) {
  if (!username) return null;
  const users = await readData('users');
  const lower = username.trim().toLowerCase();
  return users.find((u) => (u.username || '').toLowerCase() === lower) || null;
}

/**
 * Finds user by id or _id
 */
async function findUserById(id) {
  if (!id) return null;
  const users = await readData('users');
  return users.find((u) => u.id === id || u._id === id) || null;
}

/**
 * Registers a new user with required fields and case-insensitive uniqueness check
 */
async function registerUser({ username, password, role, name }) {
  if (!username || typeof username !== 'string' || !username.trim()) {
    const err = new Error('Username is required');
    err.statusCode = 400;
    throw err;
  }
  if (!password || typeof password !== 'string' || !password.trim()) {
    const err = new Error('Password is required');
    err.statusCode = 400;
    throw err;
  }

  const cleanUsername = username.trim();
  const lowerUsername = cleanUsername.toLowerCase();
  let createdUser = null;

  await atomicUpdate('users', async (users) => {
    if (!Array.isArray(users)) {
      users = [];
    }

    const duplicate = users.find((u) => (u.username || '').toLowerCase() === lowerUsername);
    if (duplicate) {
      const err = new Error('Username already exists');
      err.statusCode = 409;
      throw err;
    }

    const now = new Date().toISOString();
    const id = `USER-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    createdUser = {
      _id: id,
      id,
      username: cleanUsername,
      password: hashPassword(password.trim()),
      role: (role && typeof role === 'string' && role.trim()) ? role.trim() : 'Staff',
      name: (name && typeof name === 'string' && name.trim()) ? name.trim() : cleanUsername,
      createdAt: now,
      updatedAt: now
    };

    users.push(createdUser);
    return users;
  });

  return sanitizeUser(createdUser);
}

/**
 * Authenticates user credentials and generates JWT token
 */
async function authenticateUser(username, password) {
  if (typeof username !== 'string' || typeof password !== 'string') return null;
  if (!username.trim() || !password) return null;

  let users = await readData('users');
  if (!Array.isArray(users) || !users.some((u) => (u.username || '').toLowerCase() === 'admin')) {
    users = await ensureDefaultAdmin();
  }

  const lower = username.trim().toLowerCase();
  const user = users.find((u) => (u.username || '').toLowerCase() === lower);

  if (!user) return null;

  const isValid = verifyPassword(password, user.password);
  if (!isValid) return null;

  const sanitized = sanitizeUser(user);
  const token = signToken({
    id: sanitized.id,
    username: sanitized.username,
    role: sanitized.role,
    name: sanitized.name
  });

  return {
    user: sanitized,
    token
  };
}

/**
 * Returns all users (sanitized)
 */
async function getAllUsers() {
  const users = await readData('users');
  return users.map(sanitizeUser);
}

module.exports = {
  JWT_SECRET,
  signToken,
  verifyToken,
  verifyPassword,
  hashPassword,
  sanitizeUser,
  ensureDefaultAdmin,
  findUserByUsername,
  findUserById,
  registerUser,
  authenticateUser,
  getAllUsers
};
