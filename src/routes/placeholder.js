// Generates simple SVG product pictures so the demo needs no image files.
// Replace the image URLs in the database (or admin form) with real photos when you have them.
const express = require('express');
const router = express.Router();
const PALETTE = [['#12304a', '#2f80b7'], ['#0f3d33', '#2fa183'], ['#4a2511', '#d9772b'], ['#33214f', '#7b5cc4'], ['#4a1630', '#c8467f'], ['#1d3a3a', '#4fa6a6']];

router.get('/:slug/:n.svg', (req, res) => {
  const { slug, n } = req.params;
  if (!/^[a-z0-9-]{1,120}$/.test(slug) || !/^[1-9]$/.test(n)) return res.status(400).end();
  const hash = [...slug].reduce((a, c) => a + c.charCodeAt(0), 0);
  const [c1, c2] = PALETTE[hash % PALETTE.length];
  const words = slug.split('-').map(w => w.toUpperCase());
  const lines = [];
  let cur = '';
  for (const w of words) { if ((cur + ' ' + w).trim().length > 16 && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }
  if (cur) lines.push(cur);
  const shown = lines.slice(0, 4);
  const y0 = 300 - (shown.length - 1) * 28;
  const text = shown.map((l, i) => `<text x="400" y="${y0 + i * 56}" text-anchor="middle" font-size="44" font-weight="700" fill="#fff" font-family="Arial,Helvetica,sans-serif">${l}</text>`).join('');
  const angle = (Number(n) - 1) * 40;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><defs><linearGradient id="g" gradientTransform="rotate(${30 + angle})"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="800" height="600" fill="url(#g)"/><circle cx="${650 - Number(n) * 60}" cy="120" r="${90 + Number(n) * 10}" fill="#fff" opacity=".08"/>${text}<text x="400" y="560" text-anchor="middle" font-size="22" fill="#fff" opacity=".7" font-family="Arial,Helvetica,sans-serif">Ảnh minh họa ${n}/3</text></svg>`;
  res.set('Content-Type', 'image/svg+xml').set('Cache-Control', 'public, max-age=86400').send(svg);
});

module.exports = router;
