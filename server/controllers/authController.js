const authService = require('../services/authService');

/**
 * POST /api/auth/login
 * Verifies username and password against users.json.
 * Returns 200 with { success: true, token, user: { id, username, role, name } }.
 * Returns 401 on invalid credentials. Never returns password.
 */
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (
      typeof username !== 'string' ||
      typeof password !== 'string' ||
      !username.trim() ||
      !password
    ) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    const authResult = await authService.authenticateUser(username, password);
    if (!authResult) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    return res.status(200).json({
      success: true,
      token: authResult.token,
      user: authResult.user
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * POST /api/auth/register
 * Accepts { username, password, role, name }.
 * Enforces required fields (400), checks case-insensitive username uniqueness (409).
 * Returns 201 with { success: true, message, user: { id, username, role, name } }.
 */
exports.register = async (req, res) => {
  try {
    const { username, password, role, name } = req.body || {};

    if (!username || typeof username !== 'string' || !username.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Username is required'
      });
    }

    if (!password || typeof password !== 'string' || !password.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Password is required'
      });
    }

    const user = await authService.registerUser({
      username,
      password,
      role,
      name
    });

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user
    });
  } catch (error) {
    if (error.statusCode === 409 || (error.message && error.message.includes('already exists'))) {
      return res.status(409).json({
        success: false,
        message: error.message || 'Username already exists'
      });
    }

    if (error.statusCode === 400) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * POST /api/auth/logout
 * Clears session. Returns 200 with { success: true, message: "Logged out" }.
 */
exports.logout = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Logged out'
  });
};

/**
 * GET /api/auth/me
 * Parses Authorization: Bearer <token>, validates token.
 * Returns 200 with { success: true, user: { id, username, role, name } }.
 * Returns 401 if token is missing or invalid.
 */
exports.getMe = async (req, res) => {
  try {
    const authHeader = req.headers.authorization || req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Missing or invalid token format'
      });
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Missing token'
      });
    }

    const decoded = authService.verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid or expired token'
      });
    }

    const user = await authService.findUserById(decoded.id) || await authService.findUserByUsername(decoded.username);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User not found'
      });
    }

    return res.status(200).json({
      success: true,
      user: authService.sanitizeUser(user)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * GET /api/auth/users
 * Returns list of sanitized users.
 */
exports.getUsers = async (req, res) => {
  try {
    const users = await authService.getAllUsers();
    return res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
