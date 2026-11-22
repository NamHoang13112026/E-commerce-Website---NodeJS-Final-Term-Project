// Landing page: "Sản phẩm mới", "Bán chạy nhất" và 4 danh mục.
// Mọi danh sách đều có phân trang (4 sản phẩm/trang) và luôn hiện số trang.
const express = require('express');
const { query } = require('../db/pool');
const { CARD_SELECT, CARD_FROM } = require('../db/productQueries');
const { asyncHandler } = require('../utils/http');
const { pageList } = require('../utils/paginate');

const router = express.Router();
const PER_PAGE = 4;   // số sản phẩm mỗi trang trong từng mục
const CAP = 12;       // mục "mới" và "bán chạy" chỉ lấy tối đa 12 sản phẩm (3 trang)

router.get('/', asyncHandler(async (req, res) => {
  // 4 danh mục đầu tiên (navCategories do app.js nạp sẵn)
  const cats = res.locals.navCategories.slice(0, 4);

  // Định nghĩa các mục sẽ hiển thị. key dùng làm tên tham số trang: p_<key>
  const defs = [
    { key: 'new',  title: 'Sản phẩm mới', icon: 'bi-stars', link: '/products?sort=newest',
      where: 'TRUE', params: [], order: 'p.created_at DESC, p.id DESC', cap: CAP },
    { key: 'best', title: 'Bán chạy nhất', icon: 'bi-fire', link: '/products?sort=best',
      where: 'TRUE', params: [], order: 'p.sold_count DESC, p.id DESC', cap: CAP },
    ...cats.map(c => ({ key: c.slug, title: c.name, icon: 'bi-grid', link: `/products?category=${c.slug}`,
      where: 'c.slug = $1', params: [c.slug], order: 'p.sold_count DESC, p.id DESC', cap: null })),
  ];

  // Đọc số trang yêu cầu của từng mục từ URL (giá trị sai thì về trang 1)
  const wanted = {};
  for (const d of defs) {
    const n = parseInt(req.query['p_' + d.key], 10);
    wanted[d.key] = Number.isFinite(n) && n >= 1 ? Math.min(n, 1000) : 1;
  }

  // Truy vấn các mục song song
  const sections = await Promise.all(defs.map(async d => {
    const count = (await query(`SELECT COUNT(*)::int AS n ${CARD_FROM} WHERE p.is_active AND ${d.where}`, d.params)).rows[0].n;
    const total = d.cap ? Math.min(count, d.cap) : count;
    const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
    const page = Math.min(wanted[d.key], totalPages);
    const offset = (page - 1) * PER_PAGE;
    const limit = Math.max(0, Math.min(PER_PAGE, total - offset));   // không vượt quá CAP
    const rows = (await query(
      `SELECT ${CARD_SELECT} ${CARD_FROM} WHERE p.is_active AND ${d.where} ORDER BY ${d.order} LIMIT ${limit} OFFSET ${offset}`,
      d.params)).rows;
    return { ...d, rows, page, totalPages, pages: pageList(page, totalPages) };
  }));

  // Tạo URL cho trang n của một mục, giữ nguyên trang hiện tại của các mục còn lại
  const current = Object.fromEntries(sections.map(s => [s.key, s.page]));
  const pageUrl = (key, n) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...current, [key]: n })) if (v > 1) sp.append('p_' + k, v);
    const s = sp.toString();
    return '/' + (s ? '?' + s : '') + '#sec-' + key;   // #sec-... để trình duyệt cuộn về đúng mục
  };

  res.render('home', { title: 'Máy tính và linh kiện chính hãng', sections, pageUrl, cats });
}));

module.exports = router;