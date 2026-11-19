require('dotenv').config({ quiet: true });
const os = require('os');
const path = require('path');
const express = require('express');
const session = require('express-session');
const { createClient } = require('redis');
const RedisStore = require('connect-redis').default;
const { query } = require('./db/pool');
const { csrf } = require('./middleware/security');
const { loadUser } = require('./middleware/auth');
const { asyncHandler } = require('./utils/http');
const { formatPrice, stars } = require('./utils/format');

async function main() {
  const app = express();
  app.set('trust proxy', 1);                          // running behind the nginx load balancer
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, '..', 'views'));
  app.disable('x-powered-by');

  // Shows which container answered (evidence for horizontal scaling)
  const instance = os.hostname();
  app.use((req, res, next) => { res.set('X-Served-By', instance); next(); });

  app.use(express.static(path.join(__dirname, '..', 'public'), { maxAge: '1h' }));
  app.use('/placeholder', require('./routes/placeholder'));
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());

  // Sessions live in Redis, so any app instance can serve any request (stateless servers)
  let store;
  if (process.env.REDIS_URL) {
    const client = createClient({ url: process.env.REDIS_URL });
    client.on('error', e => console.error('Redis error:', e.message));
    await client.connect();
    store = new RedisStore({ client, prefix: 'sess:' });
  } else {
    console.warn('REDIS_URL not set: using in-memory sessions (development only!)');
  }
  app.use(session({
    store, name: 'sid', secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    resave: false, saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.COOKIE_SECURE === 'true', maxAge: 7 * 24 * 3600 * 1000 },
  }));

  app.use(asyncHandler(loadUser));
  app.use(csrf);

  // Categories for the navigation bar (cached for 60 seconds per instance)
  let catCache = { at: 0, rows: [] };
  app.use(asyncHandler(async (req, res, next) => {
    if (Date.now() - catCache.at > 60000) {
      catCache = { at: Date.now(), rows: (await query('SELECT id, name, slug FROM categories ORDER BY id')).rows };
    }
    res.locals.navCategories = catCache.rows;
    next();
  }));

  app.use((req, res, next) => {
    res.locals.flash = req.session.flash || null;
    delete req.session.flash;
    Object.assign(res.locals, { formatPrice, stars, path: req.path, instance, cartCount: 0 });
    next();
  });

  app.get('/', (req, res) => res.redirect('/products'));   // landing page is built in step 6
  app.use('/products', require('./routes/products'));
  app.use('/', require('./routes/auth'));

  app.use((req, res) => res.status(404).render('error', { title: 'Không tìm thấy', status: 404, message: 'Trang bạn tìm không tồn tại.' }));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = err.status || 500;
    if (status >= 500) console.error(err);
    res.status(status).render('error', { title: 'Lỗi', status, message: status >= 500 ? 'Đã có lỗi xảy ra. Vui lòng thử lại sau.' : err.message });
  });

  const port = Number(process.env.PORT || 3000);
  app.listen(port, () => console.log(`TechParts listening on :${port} (instance ${instance})`));
}

main().catch(err => { console.error(err); process.exit(1); });
