const express = require('express');
const { query } = require('../db/pool');
const { CARD_SELECT, CARD_FROM } = require('../db/productQueries');
const { asyncHandler } = require('../utils/http');

const router = express.Router();
const PAGE_SIZE = 12;
const MAX_PRICE = 2000000000;

const SORTS = {
  newest:     { label: 'Mới nhất',        sql: 'p.created_at DESC, p.id DESC' },
  best:       { label: 'Bán chạy nhất',   sql: 'p.sold_count DESC, p.id DESC' },
  name_asc:   { label: 'Tên A → Z',       sql: 'p.name ASC, p.id' },
  name_desc:  { label: 'Tên Z → A',       sql: 'p.name DESC, p.id' },
  price_asc:  { label: 'Giá tăng dần',    sql: 'v.min_price ASC, p.id' },
  price_desc: { label: 'Giá giảm dần',    sql: 'v.min_price DESC, p.id' },
  rating:     { label: 'Đánh giá cao',    sql: 'p.avg_rating DESC, p.rating_count DESC, p.id' },
};

const escapeLike = s => s.replace(/[\\%_]/g, m => '\\' + m);
const slugList = v => (v === undefined ? [] : [].concat(v)).filter(x => typeof x === 'string' && /^[a-z0-9-]{1,100}$/.test(x)).slice(0, 20);
const toInt = (v, max) => { const n = parseInt(v, 10); return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : null; };

function parseFilters(q) {
  const f = {
    q: typeof q.q === 'string' ? q.q.trim().slice(0, 100) : '',
    category: slugList(q.category)[0] || '',
    brand: slugList(q.brand),
    tag: slugList(q.tag)[0] || '',
    min: toInt(q.min, MAX_PRICE),
    max: toInt(q.max, MAX_PRICE),
    rating: (() => { const r = toInt(q.rating, 5); return r >= 1 ? r : null; })(),
    page: Math.max(1, toInt(q.page, 100000) || 1),
  };
  if (f.min !== null && f.max !== null && f.min > f.max) [f.min, f.max] = [f.max, f.min];
  const s = typeof q.sort === 'string' ? q.sort : '';
  f.sort = Object.hasOwn(SORTS, s) || (s === 'relevance' && f.q) ? s : (f.q ? 'relevance' : 'newest');
  return f;
}

function buildWhere(f) {
  const where = ['p.is_active = TRUE'];
  const params = [];
  const add = (sql, val) => { params.push(val); where.push(sql.replace('?', '$' + params.length)); };
  if (f.q) {
    params.push('%' + escapeLike(f.q) + '%');
    const i = params.length;
    where.push(`(p.name ILIKE $${i} OR b.name ILIKE $${i} OR c.name ILIKE $${i} OR p.short_description ILIKE $${i})`);
  }
  if (f.category) add('c.slug = ?', f.category);
  if (f.brand.length) add('b.slug = ANY(?)', f.brand);
  if (f.min !== null) add('v.min_price >= ?', f.min);
  if (f.max !== null) add('v.min_price <= ?', f.max);
  if (f.rating) add('p.avg_rating >= ?', f.rating);
  if (f.tag) add('EXISTS (SELECT 1 FROM product_tags pt JOIN tags t ON t.id = pt.tag_id WHERE pt.product_id = p.id AND t.slug = ?)', f.tag);
  return { whereSql: 'WHERE ' + where.join(' AND '), params };
}

// [1, '…', 4, 5, 6, '…', 10]
function pageList(page, total) {
  const set = new Set([1, total, page - 1, page, page + 1]);
  const nums = [...set].filter(n => n >= 1 && n <= total).sort((a, b) => a - b);
  const out = [];
  nums.forEach((n, i) => { if (i && n - nums[i - 1] > 1) out.push('…'); out.push(n); });
  return out;
}

router.get('/', asyncHandler(async (req, res) => {
  const f = parseFilters(req.query);
  const { whereSql, params } = buildWhere(f);

  const total = (await query(`SELECT COUNT(*)::int AS n ${CARD_FROM} ${whereSql}`, params)).rows[0].n;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(f.page, totalPages);

  const listParams = [...params];
  let orderSql;
  if (f.sort === 'relevance') {
    listParams.push(escapeLike(f.q) + '%');
    orderSql = `(CASE WHEN p.name ILIKE $${listParams.length} THEN 0 ELSE 1 END), p.sold_count DESC, p.id`;
  } else orderSql = SORTS[f.sort].sql;
  listParams.push(PAGE_SIZE, (page - 1) * PAGE_SIZE);

  const [list, brands] = await Promise.all([
    query(`SELECT ${CARD_SELECT} ${CARD_FROM} ${whereSql} ORDER BY ${orderSql} LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`, listParams),
    query(`SELECT b.name, b.slug, COUNT(p.id)::int AS count
           FROM brands b JOIN products p ON p.brand_id = b.id AND p.is_active
           JOIN categories c ON c.id = p.category_id
           WHERE ($1::text = '' OR c.slug = $1) GROUP BY b.id ORDER BY b.name`, [f.category]),
  ]);

  // Builds a catalog URL from the current filters with some values overridden
  const qs = (over = {}) => {
    const m = { q: f.q, category: f.category, brand: f.brand, tag: f.tag, min: f.min, max: f.max, rating: f.rating, sort: f.sort, ...over };
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(m)) {
      if (v === null || v === undefined || v === '' || (Array.isArray(v) && !v.length)) continue;
      if (Array.isArray(v)) v.forEach(x => sp.append(k, x)); else sp.append(k, v);
    }
    const s = sp.toString();
    return '/products' + (s ? '?' + s : '');
  };
  const cat = res.locals.navCategories.find(c => c.slug === f.category);
  const sorts = Object.entries(SORTS).map(([key, v]) => ({ key, label: v.label }));
  if (f.q) sorts.unshift({ key: 'relevance', label: 'Liên quan nhất' });

  res.render('products/index', {
    title: f.q ? `Tìm kiếm "${f.q}"` : (cat ? cat.name : 'Tất cả sản phẩm'),
    products: list.rows, total, page, totalPages, pages: pageList(page, totalPages),
    filters: f, brands: brands.rows, sorts, qs, categoryName: cat ? cat.name : null, pageSize: PAGE_SIZE,
  });
}));

router.get('/:slug', asyncHandler(async (req, res, next) => {
  if (!/^[a-z0-9-]+$/.test(req.params.slug)) return next();
  const { rows: [product] } = await query(
    `SELECT p.*, c.name AS category_name, c.slug AS category_slug, b.name AS brand_name, b.slug AS brand_slug
     FROM products p JOIN categories c ON c.id = p.category_id JOIN brands b ON b.id = p.brand_id
     WHERE p.slug = $1 AND p.is_active`, [req.params.slug]);
  if (!product) return next();

  const [images, variants, tags, related] = await Promise.all([
    query('SELECT url FROM product_images WHERE product_id = $1 ORDER BY position', [product.id]),
    query('SELECT id, name, price, stock FROM product_variants WHERE product_id = $1 ORDER BY position, id', [product.id]),
    query('SELECT t.name, t.slug FROM tags t JOIN product_tags pt ON pt.tag_id = t.id WHERE pt.product_id = $1 ORDER BY t.name', [product.id]),
    query(`SELECT ${CARD_SELECT} ${CARD_FROM} WHERE p.is_active AND p.category_id = $1 AND p.id <> $2
           ORDER BY p.sold_count DESC LIMIT 4`, [product.category_id, product.id]),
  ]);

  res.render('products/show', {
    title: product.name, product, images: images.rows, variants: variants.rows, tags: tags.rows, related: related.rows,
  });
}));

module.exports = router;
