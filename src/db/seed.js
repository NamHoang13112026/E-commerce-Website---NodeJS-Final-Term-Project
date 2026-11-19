const bcrypt = require('bcryptjs');

const slugify = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Deterministic random so the demo data is the same on every machine
function rng(seed) {
  return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// [brand, model, price of FIRST variant (VND), specs[], variants[[name, price delta]]]
const CATALOG = [
  { name: 'Laptop', items: [
    ['Dell', 'XPS 13 9340', 32990000, ['Vi xử lý Intel Core Ultra 7 155H', 'Màn hình 13.4" FHD+ 120Hz', 'Pin 55Wh, hỗ trợ sạc nhanh', 'Hệ điều hành Windows 11 Home'], [['16GB / 512GB', 0], ['32GB / 1TB', 8000000]]],
    ['Apple', 'MacBook Air 13" M3', 27990000, ['Chip Apple M3 8 nhân CPU, 10 nhân GPU', 'Màn hình Liquid Retina 13.6"', 'Thời lượng pin lên đến 18 giờ', 'Hệ điều hành macOS'], [['8GB / 256GB', 0], ['16GB / 512GB', 9000000]]],
    ['Asus', 'ROG Zephyrus G14 GA403', 44990000, ['Vi xử lý AMD Ryzen 9 8945HS', 'Card đồ họa RTX 4060 8GB', 'Màn hình 14" 3K OLED 120Hz', 'Bàn phím RGB, loa Dolby Atmos'], [['16GB / 512GB', 0], ['32GB / 1TB', 7000000]]],
    ['Lenovo', 'ThinkPad X1 Carbon Gen 12', 42990000, ['Vi xử lý Intel Core Ultra 7 155U', 'Màn hình 14" 2.8K OLED', 'Trọng lượng chỉ 1.09 kg', 'Đạt chuẩn bền quân đội MIL-STD-810H'], [['16GB / 512GB', 0], ['32GB / 1TB', 8500000]]],
    ['HP', 'Pavilion 15-eg3', 17490000, ['Vi xử lý Intel Core i5-1335U', 'Màn hình 15.6" FHD IPS', 'Đồ họa Intel Iris Xe', 'Webcam HD, âm thanh B&O'], [['8GB / 512GB', 0], ['16GB / 512GB', 1500000]]],
    ['Acer', 'Nitro V 15 ANV15-51', 21990000, ['Vi xử lý Intel Core i5-13420H', 'Card đồ họa RTX 4050 6GB', 'Màn hình 15.6" FHD 144Hz', 'Hệ thống tản nhiệt kép CoolBoost'], [['8GB / 512GB', 0], ['16GB / 512GB', 1800000]]],
    ['MSI', 'Katana 15 B13V', 25990000, ['Vi xử lý Intel Core i7-13620H', 'Card đồ họa RTX 4060 8GB', 'Màn hình 15.6" FHD 144Hz', 'Bàn phím nền LED'], [['16GB / 512GB', 0], ['16GB / 1TB', 2000000]]],
    ['Asus', 'Vivobook 15 X1504', 13990000, ['Vi xử lý Intel Core i3-1315U', 'Màn hình 15.6" FHD', 'Pin 42Wh', 'Thiết kế mỏng nhẹ 1.7 kg'], [['8GB / 256GB', 0], ['8GB / 512GB', 1000000]]],
  ]},
  { name: 'Màn hình', items: [
    ['LG', 'UltraGear 27GP850-B', 8490000, ['Tấm nền Nano IPS QHD', 'Tần số quét 165Hz, phản hồi 1ms', 'Hỗ trợ G-Sync Compatible', 'Độ phủ màu 98% DCI-P3'], [['27" QHD', 0], ['32" QHD (32GQ850)', 5000000]]],
    ['Dell', 'UltraSharp U2723QE', 15990000, ['Tấm nền IPS Black độ phân giải 4K', 'Độ phủ 100% sRGB', 'Cổng USB-C sạc 90W', 'Chân đế điều chỉnh đa hướng'], [['27" 4K', 0], ['32" 4K (U3223QE)', 6000000]]],
    ['Samsung', 'Odyssey G5 G55C', 6990000, ['Màn hình cong 1000R độ phân giải QHD', 'Tần số quét 165Hz', 'Tấm nền VA, phản hồi 1ms', 'Hỗ trợ AMD FreeSync Premium'], [['27"', 0], ['32"', 2500000]]],
    ['Asus', 'ProArt PA278CV', 9490000, ['Tấm nền IPS QHD', '100% sRGB, Delta E < 2', 'Cổng USB-C sạc 65W', 'Chứng nhận Calman Verified'], [['27" QHD', 0], ['32" 4K (PA329CV)', 11000000]]],
    ['AOC', '24G2E', 3990000, ['Tấm nền IPS Full HD', 'Tần số quét 144Hz, phản hồi 1ms', 'Hỗ trợ AMD FreeSync Premium', 'Thiết kế viền mỏng 3 cạnh'], [['24" FHD 144Hz', 0], ['27" FHD 144Hz (27G2)', 1500000]]],
    ['ViewSonic', 'VX2758-2KP-MHD', 5490000, ['Tấm nền IPS 27" QHD', 'Tần số quét 144Hz', 'Loa stereo tích hợp', 'Cổng HDMI và DisplayPort'], [['Màu đen', 0], ['Màu trắng', 300000]]],
  ]},
  { name: 'Ổ cứng', items: [
    ['Samsung', '990 PRO NVMe M.2', 3290000, ['Chuẩn kết nối PCIe 4.0 x4', 'Tốc độ đọc tối đa 7.450 MB/s', 'Tốc độ ghi tối đa 6.900 MB/s', 'Bảo hành 5 năm'], [['1TB', 0], ['2TB', 3000000]]],
    ['Western Digital', 'WD Black SN850X', 3190000, ['Chuẩn kết nối PCIe 4.0 NVMe', 'Tốc độ đọc đến 7.300 MB/s', 'Chế độ Game Mode 2.0', 'Tương thích máy PS5'], [['1TB', 0], ['2TB', 2900000]]],
    ['Crucial', 'P3 Plus NVMe', 1090000, ['Chuẩn kết nối PCIe 4.0 NVMe', 'Tốc độ đọc 5.000 MB/s', 'Công nghệ bộ nhớ QLC NAND', 'Bảo hành 5 năm'], [['500GB', 0], ['1TB', 700000]]],
    ['Kingston', 'NV2 NVMe', 990000, ['Chuẩn kết nối PCIe 4.0 NVMe', 'Tốc độ đọc 3.500 MB/s', 'Thiết kế M.2 2280 mỏng nhẹ', 'Bảo hành 3 năm'], [['500GB', 0], ['1TB', 600000]]],
    ['Seagate', 'Barracuda HDD 3.5"', 1490000, ['Ổ cứng cơ dung lượng lớn', 'Tốc độ quay 7200 RPM', 'Bộ nhớ đệm 256MB', 'Chuẩn kết nối SATA 6Gb/s'], [['2TB', 0], ['4TB', 1400000]]],
    ['Samsung', 'T7 Portable SSD', 2190000, ['Kết nối USB 3.2 Gen 2', 'Tốc độ đọc 1.050 MB/s', 'Vỏ nhôm nhỏ gọn', 'Mã hóa dữ liệu AES 256-bit'], [['500GB', 0], ['1TB', 1000000]]],
  ]},
  { name: 'RAM', items: [
    ['Corsair', 'Vengeance DDR5 5600MHz', 1890000, ['Chuẩn DDR5 bus 5600MHz', 'Kit 2 thanh, tản nhiệt nhôm', 'Hỗ trợ Intel XMP 3.0', 'Bảo hành trọn đời'], [['16GB (2x8GB)', 0], ['32GB (2x16GB)', 1700000]]],
    ['Kingston', 'Fury Beast DDR5 5200MHz', 1790000, ['Chuẩn DDR5 bus 5200MHz', 'Hỗ trợ Intel XMP và AMD EXPO', 'Tản nhiệt thiết kế thấp', 'Bảo hành trọn đời'], [['16GB (2x8GB)', 0], ['32GB (2x16GB)', 1600000]]],
    ['G.Skill', 'Trident Z5 RGB DDR5 6000MHz', 3190000, ['Chuẩn DDR5 bus 6000MHz CL30', 'LED RGB tùy chỉnh', 'Tản nhiệt nhôm cao cấp', 'Hỗ trợ Intel XMP 3.0'], [['32GB (2x16GB)', 0], ['64GB (2x32GB)', 3500000]]],
    ['Crucial', 'DDR4 3200MHz Laptop SODIMM', 990000, ['Chuẩn DDR4 bus 3200MHz', 'Dành cho laptop', 'Điện áp hoạt động 1.2V', 'Bảo hành trọn đời'], [['8GB', 0], ['16GB', 800000]]],
    ['TeamGroup', 'T-Force Delta RGB DDR4 3600MHz', 1590000, ['Chuẩn DDR4 bus 3600MHz', 'LED RGB góc chiếu 120 độ', 'Tản nhiệt nhôm', 'Hỗ trợ Intel XMP 2.0'], [['16GB (2x8GB)', 0], ['32GB (2x16GB)', 1400000]]],
  ]},
  { name: 'Vi xử lý', items: [
    ['Intel', 'Core i5-14600K', 8190000, ['14 nhân (6P + 8E), 20 luồng', 'Xung nhịp tối đa 5.3GHz', 'Socket LGA1700', 'Đồ họa tích hợp UHD 770'], [['Box chính hãng', 0], ['Tray (không hộp)', -400000]]],
    ['Intel', 'Core i7-14700K', 11990000, ['20 nhân (8P + 12E), 28 luồng', 'Xung nhịp tối đa 5.6GHz', 'Socket LGA1700', 'Hỗ trợ cả DDR5 và DDR4'], [['Box chính hãng', 0], ['Tray (không hộp)', -500000]]],
    ['Intel', 'Core i9-14900K', 15990000, ['24 nhân (8P + 16E), 32 luồng', 'Xung nhịp tối đa 6.0GHz', 'Socket LGA1700', 'Bộ nhớ đệm 36MB'], [['Box chính hãng', 0], ['Tray (không hộp)', -600000]]],
    ['AMD', 'Ryzen 5 7600X', 5990000, ['6 nhân 12 luồng', 'Xung nhịp tối đa 5.3GHz', 'Socket AM5', 'Hỗ trợ DDR5 và PCIe 5.0'], [['Box chính hãng', 0], ['Tray (không hộp)', -300000]]],
    ['AMD', 'Ryzen 7 7800X3D', 10990000, ['8 nhân 16 luồng', 'Công nghệ 3D V-Cache 96MB', 'Socket AM5', 'Tối ưu hiệu năng chơi game'], [['Box chính hãng', 0], ['Tray (không hộp)', -400000]]],
    ['AMD', 'Ryzen 9 7950X', 13990000, ['16 nhân 32 luồng', 'Xung nhịp tối đa 5.7GHz', 'Socket AM5', 'Bộ nhớ đệm 80MB'], [['Box chính hãng', 0], ['Tray (không hộp)', -500000]]],
  ]},
  { name: 'Card đồ họa', items: [
    ['Asus', 'Dual GeForce RTX 4060 8GB', 8290000, ['GPU NVIDIA GeForce RTX 4060', 'Bộ nhớ 8GB GDDR6', 'Hỗ trợ DLSS 3 và Ray Tracing', 'Tản nhiệt 2 quạt Axial-tech'], [['Bản OC', 0], ['Bản tiêu chuẩn', -300000]]],
    ['MSI', 'GeForce RTX 4070 SUPER Ventus 2X 12GB', 16990000, ['GPU NVIDIA GeForce RTX 4070 SUPER', 'Bộ nhớ 12GB GDDR6X', 'Hỗ trợ DLSS 3', 'Tản nhiệt quạt TORX Fan 4.0'], [['Bản OC', 0], ['Bản tiêu chuẩn', -400000]]],
    ['Gigabyte', 'GeForce RTX 4070 Ti SUPER Gaming 16GB', 24990000, ['GPU NVIDIA GeForce RTX 4070 Ti SUPER', 'Bộ nhớ 16GB GDDR6X', 'Hỗ trợ DLSS 3 và Ray Tracing', 'Tản nhiệt 3 quạt Windforce'], [['Bản OC', 0], ['Bản tiêu chuẩn', -500000]]],
    ['Zotac', 'GeForce RTX 4060 Ti Twin Edge 8GB', 11490000, ['GPU NVIDIA GeForce RTX 4060 Ti', 'Bộ nhớ 8GB GDDR6', 'Hỗ trợ DLSS 3', 'Thiết kế nhỏ gọn 2 quạt'], [['Bản OC', 0], ['Bản tiêu chuẩn', -300000]]],
    ['Sapphire', 'Pulse Radeon RX 7800 XT 16GB', 12990000, ['GPU AMD Radeon RX 7800 XT', 'Bộ nhớ 16GB GDDR6', 'Hỗ trợ AMD FSR 3', 'Tản nhiệt 2 quạt'], [['Bản tiêu chuẩn', 0], ['Bản Gaming OC', 500000]]],
    ['PowerColor', 'Hellhound Radeon RX 7600 XT 16GB', 8490000, ['GPU AMD Radeon RX 7600 XT', 'Bộ nhớ 16GB GDDR6', 'Hỗ trợ AMD FSR 3', 'Tản nhiệt 2 quạt'], [['Bản tiêu chuẩn', 0], ['Bản Spectral White', 400000]]],
  ]},
  { name: 'Bàn phím & chuột', items: [
    ['Logitech', 'MX Keys S', 2690000, ['Bàn phím không dây Bluetooth', 'Phím có đèn nền thông minh', 'Pin sạc dùng đến 10 ngày', 'Kết nối đồng thời 3 thiết bị'], [['Màu đen', 0], ['Màu trắng', 100000]]],
    ['Keychron', 'K2 Pro Wireless', 2490000, ['Bố cục 75%, hỗ trợ hotswap', 'Switch cơ Gateron', 'Kết nối Bluetooth 5.1', 'Đèn nền RGB'], [['Gateron Red', 0], ['Gateron Brown', 0], ['Gateron Blue', 0]]],
    ['Razer', 'BlackWidow V4 75%', 4990000, ['Bàn phím cơ gaming bố cục 75%', 'Switch cơ Razer tùy chọn', 'Đèn nền Chroma RGB', 'Núm xoay đa năng'], [['Green Switch', 0], ['Yellow Switch', 0]]],
    ['Logitech', 'G502 X Lightspeed', 3290000, ['Chuột gaming không dây', 'Cảm biến HERO 25K', 'Switch lai LIGHTFORCE', 'Pin sạc dùng đến 130 giờ'], [['Màu đen', 0], ['Màu trắng', 100000]]],
    ['Razer', 'DeathAdder V3 Pro', 3990000, ['Chuột gaming không dây siêu nhẹ 63g', 'Cảm biến Focus Pro 30K', 'Switch quang học thế hệ 3', 'Pin dùng đến 90 giờ'], [['Màu đen', 0], ['Màu trắng', 200000]]],
    ['SteelSeries', 'Apex Pro TKL', 4690000, ['Switch OmniPoint 2.0 chỉnh được độ nhạy', 'Màn hình OLED Smart Display', 'Khung nhôm chắc chắn', 'Bố cục TKL không phím số'], [['Có dây', 0], ['Không dây (Wireless)', 2500000]]],
  ]},
];

const GAMING = /ROG|Nitro|Katana|UltraGear|Odyssey|RTX|Radeon|BlackWidow|DeathAdev|Apex|G502|X3D|Trident|Fury|Vengeance|24G2|K2|14[679]00K|7950X/i;
const CREATIVE = /ProArt|XPS|MacBook|UltraSharp|ThinkPad/i;

async function seed(client) {
  const { rows: [{ count }] } = await client.query('SELECT COUNT(*)::int AS count FROM products');
  if (count > 0) { console.log(`Catalog already has ${count} products, skipping product seed.`); }
  else {
    await client.query('BEGIN');            // all-or-nothing, so a failure never leaves half a catalog
    try { await seedProducts(client); await client.query('COMMIT'); }
    catch (e) { await client.query('ROLLBACK'); throw e; }
  }
  await seedUsers(client);
}

async function seedProducts(client) {
  const rand = rng(20261117);
  const ids = { cat: {}, brand: {}, tag: {} };
  const getId = async (kind, table, name) => {
    if (ids[kind][name]) return ids[kind][name];
    const r = await client.query(`INSERT INTO ${table} (name, slug) VALUES ($1,$2) RETURNING id`, [name, slugify(name)]);
    return (ids[kind][name] = r.rows[0].id);
  };
  const DAY = 86400000;
  let n = 0;

  for (const cat of CATALOG) {
    const catId = await getId('cat', 'categories', cat.name);
    for (const [brand, model, basePrice, specs, variants] of cat.items) {
      n++;
      const brandId = await getId('brand', 'brands', brand);
      const fullName = `${brand} ${model}`;
      const description = [
        `${fullName} là sản phẩm ${cat.name.toLowerCase()} chính hãng, phù hợp cho nhu cầu học tập, làm việc và giải trí.`,
        ...specs.map(s => `• ${s}`),
        'Bảo hành chính hãng từ 12 đến 36 tháng, 1 đổi 1 trong 30 ngày nếu có lỗi từ nhà sản xuất.',
        'Giao hàng toàn quốc, hỗ trợ kiểm tra hàng trước khi thanh toán.',
      ].join('\n');
      const createdAt = new Date(Date.now() - Math.floor(rand() * 90) * DAY);
      const rating = Math.round((3.5 + rand() * 1.5) * 10) / 10;   // placeholder until real reviews exist (step 11)
      const { rows: [p] } = await client.query(
        `INSERT INTO products (category_id, brand_id, name, slug, short_description, description, avg_rating, rating_count, sold_count, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
        [catId, brandId, fullName, slugify(fullName), `${specs[0]}, ${specs[1].charAt(0).toLowerCase() + specs[1].slice(1)}`,
         description, rating, 5 + Math.floor(rand() * 120), Math.floor(rand() * 500), createdAt]);

      for (let i = 1; i <= 3; i++) {
        await client.query('INSERT INTO product_images (product_id, url, position) VALUES ($1,$2,$3)',
          [p.id, `/placeholder/${slugify(fullName)}/${i}.svg`, i]);
      }
      for (let j = 0; j < variants.length; j++) {
        const price = basePrice + variants[j][1];
        await client.query(
          `INSERT INTO product_variants (product_id, name, sku, price, cost_price, stock, position) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [p.id, variants[j][0], `SKU${String(p.id).padStart(3, '0')}-${j + 1}`,
           price, Math.round(price * 0.8 / 1000) * 1000, 5 + Math.floor(rand() * 45), j]);
      }
      // a couple of products are out of stock so the "Hết hàng" state can be demonstrated
      if (n % 17 === 0) await client.query('UPDATE product_variants SET stock = 0 WHERE product_id = $1', [p.id]);

      const tagNames = ['Chính hãng'];
      if (GAMING.test(fullName)) tagNames.push('Gaming');
      else if (CREATIVE.test(fullName)) tagNames.push('Đồ họa');
      else tagNames.push('Văn phòng');
      for (const t of tagNames) {
        const tagId = await getId('tag', 'tags', t);
        await client.query('INSERT INTO product_tags (product_id, tag_id) VALUES ($1,$2)', [p.id, tagId]);
      }
    }
  }
  console.log(`Seeded ${n} products.`);
}

async function seedUsers(client) {
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@shop.local').toLowerCase();
  const adminPass = process.env.ADMIN_PASSWORD || 'Admin@123';
  const demo = [
    { email: adminEmail, name: 'Quản trị viên', role: 'admin', pass: adminPass, addr: null },
    { email: 'customer@shop.local', name: 'Nguyễn Văn Khách', role: 'customer', pass: 'Customer@123',
      addr: '19 Nguyễn Hữu Thọ, Phường Tân Hưng, Quận 7, TP. Hồ Chí Minh' },
  ];
  for (const u of demo) {
    const exists = await client.query('SELECT id FROM users WHERE email = $1', [u.email]);
    if (exists.rowCount) continue;
    const hash = await bcrypt.hash(u.pass, 10);
    const { rows: [row] } = await client.query(
      'INSERT INTO users (email, full_name, password_hash, role) VALUES ($1,$2,$3,$4) RETURNING id', [u.email, u.name, hash, u.role]);
    if (u.addr) await client.query('INSERT INTO addresses (user_id, recipient, address, is_default) VALUES ($1,$2,$3,TRUE)', [row.id, u.name, u.addr]);
    console.log(`Created ${u.role}: ${u.email}`);
  }
}

module.exports = { seed, slugify };
