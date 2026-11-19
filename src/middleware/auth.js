const { query } = require('../db/pool');

// Loads the logged-in user (if any) into res.locals.currentUser / req.user
async function loadUser(req, res, next) {
  res.locals.currentUser = null;
  if (req.session.userId) {
    const { rows } = await query(
      'SELECT id, email, full_name, role, is_banned, points FROM users WHERE id = $1', [req.session.userId]);
    const u = rows[0];
    if (u && !u.is_banned) { req.user = u; res.locals.currentUser = u; }
    else delete req.session.userId;            // deleted or banned meanwhile
  }
  next();
}

function requireLogin(req, res, next) {
  if (req.user) return next();
  req.session.returnTo = req.originalUrl;
  req.session.flash = { type: 'warning', msg: 'Vui lòng đăng nhập để tiếp tục.' };
  res.redirect('/login');
}

function requireAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') return next();
  const err = new Error('Bạn không có quyền truy cập trang này.');
  err.status = 403;
  next(err);
}

module.exports = { loadUser, requireLogin, requireAdmin };
