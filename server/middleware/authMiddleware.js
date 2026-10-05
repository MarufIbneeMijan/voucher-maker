const { verifyToken } = require('../services/authService');

/**
 * Authentication middleware guarding sensitive API routes.
 * Ensures /api/health and /api/auth/* are public.
 * If Authorization header is provided:
 *   - Verifies Bearer token, returns 401 on invalid/expired token.
 *   - Attaches decoded user payload to req.user on success.
 * If Authorization header is absent:
 *   - If process.env.ENFORCE_AUTH === 'true', enforces 401.
 *   - Otherwise, gracefully falls back to allow backward compatibility.
 */
function authMiddleware(req, res, next) {
  const reqPath = req.path || '';
  const cleanPath = (req.baseUrl || '') + (req.path || '');
  if (
    cleanPath === '/api/health' ||
    cleanPath.startsWith('/api/health/') ||
    cleanPath === '/api/auth' ||
    cleanPath.startsWith('/api/auth/') ||
    reqPath === '/health' ||
    reqPath.startsWith('/health/') ||
    reqPath === '/auth' ||
    reqPath.startsWith('/auth/')
  ) {
    return next();
  }

  const authHeader = req.headers.authorization || req.headers['authorization'];

  if (authHeader) {
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authorization format. Expected Bearer <token>'
      });
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Token is empty'
      });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid or expired token'
      });
    }

    req.user = decoded;
    return next();
  }

  // If strict enforcement is enabled via environment
  if (process.env.ENFORCE_AUTH === 'true') {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Authentication token required'
    });
  }

  // Graceful fallback for backward compatibility with frontend calls during migration
  return next();
}

/**
 * Strict authentication guard for routes that always require a valid token
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Authentication token required'
    });
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Token is empty'
    });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid or expired token'
    });
  }

  req.user = decoded;
  return next();
}

/**
 * Role-based authorization guard
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Insufficient privileges'
      });
    }
    return next();
  };
}

module.exports = {
  authMiddleware,
  requireAuth,
  requireRole
};
