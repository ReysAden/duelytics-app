const rateLimit = require('express-rate-limit');

// Per-user rate limiter using discord_id from authenticated user
const createUserRateLimiter = (options) => {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000, // Default 15 minutes
    max: options.max || 100, // Default 100 requests per window
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false,
    // Use user ID as key for per-user limiting
    keyGenerator: (req) => {
      // Always use user ID if authenticated
      if (req.user?.discord_id) return req.user.discord_id;
      // Fallback to 'anonymous' for non-authenticated requests (shouldn't happen with authenticate middleware)
      return 'anonymous';
    },
    handler: (req, res) => {
      res.status(429).json({
        error: 'Too many requests',
        message: options.message || 'You have exceeded the rate limit. Please try again later.',
        retryAfter: Math.ceil(options.windowMs / 1000)
      });
    }
  });
};

// Duel submission limiter - 1 duel per 30 seconds to prevent spam
const duelSubmitLimiter = createUserRateLimiter({
  windowMs: 30 * 1000, // 30 seconds
  max: 1, // 1 submission per 30 seconds
  message: 'Please wait 30 seconds between duel submissions.'
});

// Background upload limiter - strict since uploads consume storage
// 3 uploads per 5 minutes
const backgroundUploadLimiter = createUserRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3,
  message: 'Upload limit reached. Please wait a few minutes before uploading more backgrounds.'
});

// Duel deletion limiter - 1 deletion per 30 seconds to prevent delete/resubmit spam
const duelDeleteLimiter = createUserRateLimiter({
  windowMs: 30 * 1000, // 30 seconds
  max: 1, // 1 deletion per 30 seconds
  message: 'Please wait 30 seconds between duel deletions.'
});

module.exports = {
  duelSubmitLimiter,
  backgroundUploadLimiter,
  duelDeleteLimiter
};
