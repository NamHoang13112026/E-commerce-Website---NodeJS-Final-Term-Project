const crypto = require('crypto');
const { query } = require('../db/pool');
const { sendMail } = require('./mailer');

const BASE_URL = () => (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');

// Creates a one-time token (valid 24h). Only its hash is stored in the DB.
async function createToken(userId, purpose) {
  const raw = crypto.randomBytes(32).toString('hex');
  await query('DELETE FROM password_tokens WHERE user_id = $1 AND purpose = $2 AND used_at IS NULL', [userId, purpose]);
  await query(
    `INSERT INTO password_tokens (user_id, token_hash, purpose, expires_at) VALUES ($1,$2,$3, NOW() + INTERVAL '24 hours')`,
    [userId, sha256(raw), purpose]);
  return raw;
}

async function findValidToken(raw) {
  if (!/^[a-f0-9]{64}$/.test(raw || '')) return null;
  const { rows } = await query(
    `SELECT t.id, t.user_id, t.purpose, u.email, u.full_name FROM password_tokens t JOIN users u ON u.id = t.user_id
     WHERE t.token_hash = $1 AND t.used_at IS NULL AND t.expires_at > NOW()`, [sha256(raw)]);
  return rows[0] || null;
}

// Used for new registrations (and, later, for accounts created automatically at guest checkout)
async function sendSetPasswordEmail(user) {
  const token = await createToken(user.id, 'set');
  const link = `${BASE_URL()}/set-password/${token}`;
  const text = `Xin chào ${user.full_name},\n\nCảm ơn bạn đã đăng ký tài khoản TechParts. Vui lòng mở liên kết sau để đặt mật khẩu (hiệu lực 24 giờ):\n${link}\n`;
  const html = `<p>Xin chào <b>${user.full_name}</b>,</p><p>Cảm ơn bạn đã đăng ký tài khoản TechParts. Vui lòng nhấn vào liên kết bên dưới để đặt mật khẩu (hiệu lực 24 giờ):</p><p><a href="${link}">Đặt mật khẩu</a></p>`;
  await sendMail({ to: user.email, subject: 'Đặt mật khẩu cho tài khoản TechParts', html, text });
  return link;
}

module.exports = { createToken, findValidToken, sendSetPasswordEmail, sha256 };
