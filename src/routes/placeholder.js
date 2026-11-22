// Ảnh sản phẩm:
//  1) Nếu có ảnh thật tại public/img/products/<slug-sản-phẩm>/<n>.(jpg|png|webp) thì dùng ảnh thật (chuyển hướng).
//  2) Nếu không, vẽ ảnh minh họa SVG theo loại sản phẩm (laptop, màn hình, ổ cứng...).
// URL trong database vẫn là /placeholder/<slug>/<n>.svg nên thêm ảnh thật không cần seed lại.
const fs = require('fs');
const path = require('path');
const express = require('express');
const { query } = require('../db/pool');

const router = express.Router();
const PHOTO_DIR = path.join(__dirname, '..', '..', 'public', 'img', 'products');
const EXTS = ['jpg', 'jpeg', 'png', 'webp'];

// Màu nền (gradient) theo slug danh mục
const THEMES = {
  'laptop': ['#0f2c4d', '#2f7fd1'], 'man-hinh': ['#0b3b3f', '#2bb3a8'], 'o-cung': ['#2a1b57', '#7a5ce0'],
  'ram': ['#0e3b2a', '#35b57a'], 'vi-xu-ly': ['#4a2208', '#f08a24'], 'card-do-hoa': ['#4a0f2b', '#e0438a'],
  'ban-phim-chuot': ['#1d2733', '#5f7d95'],
};
const BODY = 'fill="#0a1020" stroke="#fff" stroke-opacity=".55" stroke-width="3"';   // thân thiết bị (tối, viền sáng)
const SOFT = (o) => `fill="#fff" fill-opacity="${o}"`;                                // mảng trắng mờ
const GOLD = 'fill="#f5c451"';                                                          // chân tiếp xúc màu vàng
const range = n => Array.from({ length: n }, (_, i) => i);

// Mỗi hàm vẽ một thiết bị, căn quanh điểm (400, 270) trong khung 800x600
const ICONS = {
  'laptop': () => `
    <rect x="250" y="150" width="300" height="190" rx="14" ${BODY}/>
    <rect x="266" y="166" width="268" height="158" rx="6" ${SOFT('.14')}/>
    <rect x="290" y="192" width="130" height="12" rx="6" ${SOFT('.55')}/><rect x="290" y="216" width="190" height="10" rx="5" ${SOFT('.3')}/>
    <rect x="290" y="236" width="160" height="10" rx="5" ${SOFT('.3')}/><rect x="290" y="270" width="70" height="28" rx="8" ${SOFT('.5')}/>
    <path d="M236 346 h328 l26 28 a8 8 0 0 1 -7 11 H217 a8 8 0 0 1 -7 -11 z" ${BODY}/>
    <rect x="360" y="354" width="80" height="8" rx="4" ${SOFT('.35')}/>`,
  'man-hinh': () => `
    <rect x="220" y="140" width="360" height="220" rx="14" ${BODY}/>
    <rect x="236" y="156" width="328" height="170" rx="6" ${SOFT('.14')}/>
    <polyline points="260,300 320,240 380,270 450,200 520,235" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>
    <rect x="385" y="360" width="30" height="46" ${BODY}/><rect x="320" y="404" width="160" height="14" rx="7" ${BODY}/>`,
  'o-cung': () => `
    <rect x="260" y="180" width="280" height="170" rx="16" ${BODY}/>
    <rect x="282" y="202" width="236" height="62" rx="8" ${SOFT('.16')}/>
    <rect x="282" y="284" width="120" height="10" rx="5" ${SOFT('.55')}/><rect x="282" y="306" width="80" height="10" rx="5" ${SOFT('.3')}/>
    <circle cx="500" cy="318" r="12" ${SOFT('.5')}/>
    ${range(8).map(i => `<rect x="${300 + i * 24}" y="350" width="14" height="28" rx="2" ${GOLD}/>`).join('')}`,
  'ram': () => `
    <rect x="180" y="200" width="440" height="130" rx="8" ${BODY}/>
    ${range(4).map(i => `<rect x="${210 + i * 95}" y="225" width="75" height="80" rx="6" ${SOFT('.16')} stroke="#fff" stroke-opacity=".3"/><rect x="${225 + i * 95}" y="245" width="45" height="8" rx="4" ${SOFT('.5')}/>`).join('')}
    ${range(18).filter(i => i !== 8).map(i => `<rect x="${200 + i * 23}" y="330" width="14" height="28" rx="2" ${GOLD}/>`).join('')}`,
  'vi-xu-ly': () => `
    ${range(8).map(i => `<rect x="${306 + i * 26}" y="132" width="12" height="18" rx="2" ${GOLD}/><rect x="${306 + i * 26}" y="370" width="12" height="18" rx="2" ${GOLD}/>
      <rect x="272" y="${166 + i * 26}" width="18" height="12" rx="2" ${GOLD}/><rect x="510" y="${166 + i * 26}" width="18" height="12" rx="2" ${GOLD}/>`).join('')}
    <rect x="290" y="150" width="220" height="220" rx="18" ${BODY}/>
    <rect x="325" y="185" width="150" height="150" rx="10" ${SOFT('.18')} stroke="#fff" stroke-opacity=".5" stroke-width="2"/>
    <text x="400" y="278" text-anchor="middle" font-size="38" font-weight="700" fill="#fff" fill-opacity=".85" font-family="Arial,Helvetica,sans-serif">CPU</text>`,
  'card-do-hoa': () => {
    // Một quạt: vòng tròn + 6 cánh + trục giữa
    const fan = cx => `<circle cx="${cx}" cy="270" r="60" ${SOFT('.1')} stroke="#fff" stroke-opacity=".5" stroke-width="3"/>
      ${range(6).map(k => `<ellipse cx="${cx}" cy="246" rx="10" ry="24" ${SOFT('.55')} transform="rotate(${k * 60} ${cx} 270)"/>`).join('')}
      <circle cx="${cx}" cy="270" r="12" fill="#0a1020" stroke="#fff" stroke-opacity=".7" stroke-width="2"/>`;
    return `<rect x="160" y="190" width="480" height="160" rx="16" ${BODY}/><rect x="138" y="196" width="22" height="148" rx="4" ${SOFT('.45')}/>
      ${fan(300)}${fan(500)}
      ${range(14).map(i => `<rect x="${330 + i * 18}" y="350" width="10" height="20" rx="2" ${GOLD}/>`).join('')}`;
  },
  'ban-phim-chuot': () => `
    <rect x="130" y="230" width="420" height="150" rx="14" ${BODY}/>
    ${range(3).map(r => range(11).map(c => `<rect x="${150 + c * 35}" y="${248 + r * 30}" width="28" height="22" rx="4" ${SOFT('.22')}/>`).join('')).join('')}
    <rect x="185" y="338" width="250" height="22" rx="4" ${SOFT('.22')}/><rect x="150" y="338" width="28" height="22" rx="4" ${SOFT('.22')}/><rect x="442" y="338" width="88" height="22" rx="4" ${SOFT('.22')}/>
    <rect x="580" y="250" width="90" height="140" rx="45" ${BODY}/><line x1="625" y1="250" x2="625" y2="308" stroke="#fff" stroke-opacity=".5" stroke-width="3"/>
    <rect x="618" y="268" width="14" height="28" rx="7" ${SOFT('.55')}/>`,
};

// Thoát ký tự đặc biệt để chèn tên sản phẩm vào SVG an toàn
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Ngắt văn bản thành tối đa maxLines dòng, mỗi dòng ~max ký tự; dòng cuối thêm "…" nếu bị cắt
function wrap(text, max, maxLines) {
  const lines = []; let cur = '';
  for (const w of String(text).split(/\s+/)) {
    if ((cur + ' ' + w).trim().length > max && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim();
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const cut = lines.slice(0, maxLines);
    cut[maxLines - 1] = cut[maxLines - 1].replace(/\s*\S*$/, '') + '…';
    return cut;
  }
  return lines;
}
const FONT = 'font-family="Be Vietnam Pro,Arial,Helvetica,sans-serif"';
const textLines = (lines, x, y, size, step, extra) =>
  lines.map((l, i) => `<text x="${x}" y="${y + i * step}" font-size="${size}" ${FONT} ${extra}>${esc(l)}</text>`).join('');

// Vẽ ảnh số n (1, 2 hoặc 3) cho một sản phẩm
function render(meta, n) {
  const [c1, c2] = THEMES[meta.cat] || THEMES.laptop;
  const icon = (ICONS[meta.cat] || ICONS.laptop)();
  const rot = 25 + (n - 1) * 35;   // mỗi ảnh xoay hướng gradient khác nhau
  let body;
  if (n === 1) {
    // Ảnh 1: thiết bị ở giữa, thương hiệu phía trên, tên sản phẩm phía dưới
    body = `<g>${icon}</g>
      ${textLines([meta.brand.toUpperCase()], 400, 92, 24, 0, 'text-anchor="middle" font-weight="500" letter-spacing="4" fill="#fff" fill-opacity=".75"')}
      ${textLines(wrap(meta.name, 26, 2), 400, 478, 38, 46, 'text-anchor="middle" font-weight="700" fill="#fff"')}`;
  } else if (n === 2) {
    // Ảnh 2: phóng to thiết bị trên nền chấm bi (góc nhìn chi tiết)
    body = `<rect width="800" height="600" fill="url(#dots)"/>
      <circle cx="400" cy="290" r="250" fill="#fff" fill-opacity=".07"/>
      <g transform="translate(400 300) scale(1.3) translate(-400 -270)">${icon}</g>
      ${textLines([meta.brand.toUpperCase() + ' · CHI TIẾT'], 40, 560, 20, 0, 'fill="#fff" fill-opacity=".75" letter-spacing="2"')}`;
  } else {
    // Ảnh 3: thẻ thông số - chữ bên trái, thiết bị thu nhỏ bên phải
    body = `<g transform="translate(590 300) scale(.62) translate(-400 -270)">${icon}</g>
      ${textLines([meta.brand.toUpperCase()], 50, 130, 22, 0, 'font-weight="500" letter-spacing="3" fill="#fff" fill-opacity=".75"')}
      ${textLines(wrap(meta.name, 17, 3), 50, 186, 36, 44, 'font-weight="700" fill="#fff"')}
      ${textLines(wrap(meta.desc, 26, 5), 50, 360, 21, 32, 'fill="#fff" fill-opacity=".85"')}`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" role="img" aria-label="${esc(meta.name)}">
  <defs><linearGradient id="g" gradientTransform="rotate(${rot})"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>
  <pattern id="dots" width="30" height="30" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="2" fill="#fff" fill-opacity=".13"/></pattern></defs>
  <rect width="800" height="600" fill="url(#g)"/>
  ${body}
  <text x="780" y="584" text-anchor="end" font-size="14" ${FONT} fill="#fff" fill-opacity=".45">Ảnh minh họa ${n}/3</text>
</svg>`;
}

// Lấy thông tin sản phẩm theo slug (có cache để không truy vấn lặp lại)
const cache = new Map();
async function metaFor(slug) {
  if (cache.has(slug)) return cache.get(slug);
  const { rows: [r] } = await query(
    `SELECT p.name, p.short_description AS desc, b.name AS brand, c.slug AS cat
     FROM products p JOIN brands b ON b.id = p.brand_id JOIN categories c ON c.id = p.category_id WHERE p.slug = $1`, [slug]);
  if (r) cache.set(slug, r);
  return r;
}

router.get('/:slug/:n.svg', async (req, res, next) => {
  try {
    const { slug, n } = req.params;
    if (!/^[a-z0-9-]{1,120}$/.test(slug) || !/^[1-9]$/.test(n)) return res.status(400).end();
    // Ưu tiên ảnh thật nếu có
    for (const ext of EXTS) {
      if (fs.existsSync(path.join(PHOTO_DIR, slug, `${n}.${ext}`))) return res.redirect(302, `/img/products/${slug}/${n}.${ext}`);
    }
    const meta = await metaFor(slug);
    if (!meta) return res.status(404).end();
    res.set('Content-Type', 'image/svg+xml').set('Cache-Control', 'public, max-age=300').send(render(meta, Number(n)));
  } catch (e) { next(e); }
});

module.exports = router;