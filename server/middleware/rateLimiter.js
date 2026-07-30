// Lightweight In-Memory Rate Limiter Middleware for Auth & Sensitive Endpoints
const rateLimitMap = new Map();

const rateLimiter = (options = { windowMs: 15 * 60 * 1000, max: 100 }) => {
  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const windowStart = now - options.windowMs;

    if (!rateLimitMap.has(ip)) {
      rateLimitMap.set(ip, []);
    }

    const requests = rateLimitMap.get(ip).filter((timestamp) => timestamp > windowStart);
    requests.push(now);
    rateLimitMap.set(ip, requests);

    if (requests.length > options.max) {
      return res.status(429).json({
        status: 'error',
        message: 'Too many requests from this IP. Please try again after 15 minutes.',
      });
    }

    next();
  };
};

module.exports = rateLimiter;
