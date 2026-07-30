const { verifyAccessToken } = require('../utils/jwt');

/**
 * Express Middleware to protect private API endpoints.
 * Expects header: Authorization: Bearer <token>
 */
const protect = (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Access denied. No token provided.',
      });
    }

    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        code: 'TOKEN_EXPIRED',
        message: 'Token has expired. Please refresh or login again.',
      });
    }

    return res.status(401).json({
      status: 'error',
      message: 'Invalid or malformed authentication token.',
    });
  }
};

module.exports = { protect };
