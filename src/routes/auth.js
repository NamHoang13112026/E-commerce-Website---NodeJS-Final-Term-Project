const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { query, withTx } = require('../db/pool');
const { asyncHandler, safeRedirect } = require('../utils/http');
const { findValidToken, sendSetPasswordEmail } = require('../services/accountTokens');

const router = express.Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false,
  message: 'Bạn thử quá nhiều lần. Vui lòng quay lại sau 15 phút.' });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);   // keeps login timing similar when user is unknown

const regenerate = req => new Promise((resolve, reject) => req.session.regenerate(e => (e ? reject(e) : resolve())));
const save = req => new Promise((resolve, reject) => req.session.save(e => (e ? reject(e) : resolve())));

function validatePassword(pw, confirm) {
  const errors = [];
  if (typeof pw !== 'string' || pw.length < 8) errors.push('Mật khẩu phải có ít nhất 8 ký tự.');
  else if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) errors.push('Mật khẩu phải gồm cả chữ và số.');
  if (pw.length > 72) errors.push('Mật khẩu tối đa 72 ký tự.');
  if (pw !== confirm) errors.push('Mật khẩu nhập lại không khớp.');
  return errors;
}

// ---------- Register (email, full name, address only; password is set via emailed link) ----------
router.get('/register', (req, res) => {
  if (req.user) return res.redirect('/');
  res.render('auth/register', { title: 'Đăng ký', errors: [], values: {} });
});

router.post('/register', limiter, asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const fullName = String(req.body.full_name || '').trim().replace(/\s+/g, ' ');
  const address = String(req.body.address || '').trim();
  const values = { email, full_name: fullName, address };
  const errors = [];
  if (!EMAIL_RE.test(email) || email.length > 255) errors.push('Email không hợp lệ.');
  if (fullName.length < 2 || fullName.length > 120) errors.push('Họ tên phải từ 2 đến 120 ký tự.');
  if (address.length < 5 || address.length > 300) errors.push('Địa chỉ giao hàng phải từ 5 đến 300 ký tự.');
  if (errors.length) return res.status(400).render('auth/register', { title: 'Đăng ký', errors, values });

  let user = (await query('SELECT id, email, full_name, password_hash FROM users WHERE email = $1', [email])).rows[0];
  if (user && user.password_hash) {
    errors.push('Email này đã được đăng ký. Hãy đăng nhập hoặc dùng chức năng quên mật khẩu.');
    return res.status(400).render('auth/register', { title: 'Đăng ký', errors, values });
  }
  if (!user) {
    user = await withTx(async c => {
      const { rows: [u] } = await c.query(
        'INSERT INTO users (email, full_name) VALUES ($1,$2) RETURNING id, email, full_name', [email, fullName]);
      await c.query('INSERT INTO addresses (user_id, recipient, address, is_default) VALUES ($1,$2,$3,TRUE)', [u.id, fullName, address]);
      return u;
    });
  }
  // (existing account without password, e.g. created by an earlier guest order: just send a fresh link)
  const link = await sendSetPasswordEmail(user);
  res.render('auth/register-done', { title: 'Kiểm tra email', email, devLink: process.env.DEV_SHOW_LINKS === 'true' ? link : null });
}));

// ---------- Set password from emailed link ----------
router.get('/set-password/:token', asyncHandler(async (req, res) => {
  const t = await findValidToken(req.params.token);
  if (!t) return res.status(400).render('auth/set-password', { title: 'Đặt mật khẩu', invalid: true, errors: [], token: '' });
  res.render('auth/set-password', { title: 'Đặt mật khẩu', invalid: false, errors: [], token: req.params.token, email: t.email });
}));

router.post('/set-password/:token', limiter, asyncHandler(async (req, res) => {
  const t = await findValidToken(req.params.token);
  if (!t) return res.status(400).render('auth/set-password', { title: 'Đặt mật khẩu', invalid: true, errors: [], token: '' });
  const errors = validatePassword(String(req.body.password || ''), String(req.body.confirm || ''));
  if (errors.length) return res.status(400).render('auth/set-password', { title: 'Đặt mật khẩu', invalid: false, errors, token: req.params.token, email: t.email });
  const hash = await bcrypt.hash(req.body.password, 10);
  await withTx(async c => {
    await c.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, t.user_id]);
    await c.query('UPDATE password_tokens SET used_at = NOW() WHERE id = $1', [t.id]);
  });
  req.session.flash = { type: 'success', msg: 'Đã đặt mật khẩu. Bạn có thể đăng nhập ngay bây giờ.' };
  res.redirect('/login');
}));

// ---------- Login / logout ----------
router.get('/login', (req, res) => {
  if (req.user) return res.redirect('/');
  res.render('auth/login', { title: 'Đăng nhập', errors: [], values: {} });
});

router.post('/login', limiter, asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const fail = (msg) => res.status(400).render('auth/login', { title: 'Đăng nhập', errors: [msg], values: { email } });

  const user = (await query('SELECT id, password_hash, is_banned FROM users WHERE email = $1', [email])).rows[0];
  if (user && !user.password_hash) return fail('Tài khoản chưa có mật khẩu. Hãy mở email đặt mật khẩu mà chúng tôi đã gửi cho bạn.');
  const ok = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);
  if (!user || !ok) return fail('Email hoặc mật khẩu không đúng.');
  if (user.is_banned) return fail('Tài khoản của bạn đã bị khóa.');

  const returnTo = safeRedirect(req.session.returnTo);
  await regenerate(req);                       // new session id after login (prevents session fixation)
  req.session.userId = user.id;
  req.session.csrf = crypto.randomBytes(24).toString('hex');
  await save(req);
  res.redirect(returnTo);
}));

router.post('/logout', (req, res, next) => {
  req.session.destroy(err => (err ? next(err) : res.redirect('/')));
});

module.exports = router;
