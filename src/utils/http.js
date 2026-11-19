// Lets async route handlers throw errors to Express' error middleware
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Only allow redirects to local paths (prevents open redirect)
const safeRedirect = (p, fallback = '/') =>
  typeof p === 'string' && p.startsWith('/') && !p.startsWith('//') && !p.startsWith('/\\') ? p : fallback;

module.exports = { asyncHandler, safeRedirect };
