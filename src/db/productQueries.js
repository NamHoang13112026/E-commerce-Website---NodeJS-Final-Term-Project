// SQL fragments shared by the catalog, landing page and "related products"
const CARD_SELECT = `
  p.id, p.name, p.slug, p.short_description, p.avg_rating, p.rating_count, p.sold_count, p.created_at,
  c.name AS category_name, c.slug AS category_slug, b.name AS brand_name, b.slug AS brand_slug,
  v.min_price, v.max_price, v.stock,
  (SELECT url FROM product_images i WHERE i.product_id = p.id ORDER BY i.position LIMIT 1) AS image`;

const CARD_FROM = `
  FROM products p
  JOIN categories c ON c.id = p.category_id
  JOIN brands b ON b.id = p.brand_id
  JOIN (SELECT product_id, MIN(price) AS min_price, MAX(price) AS max_price, SUM(stock)::int AS stock
        FROM product_variants GROUP BY product_id) v ON v.product_id = p.id`;

module.exports = { CARD_SELECT, CARD_FROM };
