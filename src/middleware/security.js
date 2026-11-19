const crypto = require('crypto');

// Simple synchronizer-token CSRF protection stored in the (Redis-backed) session
function csrf(req, res, next) {
  if (!req.session.csrf) req.session.csrf = crypto.randomBytes(24).toString('hex');
  res.locals.csrfToken = req.session.csrf;
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const sent = String((req.body && req.body._csrf) || req.get('x-csrf-token') || '');
  const real = req.session.csrf;
  if (sent.length === real.length && crypto.timingSafeEqual(Buffer.from(sent), Buffer.from(real))) return next();
  const err = new Error('Phiên làm việc không hợp lệ. Vui lòng tải lại trang và thử lại.');
  err.status = 403;
  next(err);
}

module.exports = { csrf };
