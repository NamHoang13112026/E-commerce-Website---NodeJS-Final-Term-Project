-- Schema (idempotent). Order/cart/review/discount tables are added in later steps.

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  full_name     VARCHAR(120) NOT NULL,
  password_hash VARCHAR(100),                       -- NULL until the user sets a password via email link
  role          VARCHAR(10)  NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','admin')),
  is_banned     BOOLEAN      NOT NULL DEFAULT FALSE,
  points        INTEGER      NOT NULL DEFAULT 0 CHECK (points >= 0),   -- loyalty points (1 point = 1,000 VND)
  google_id     VARCHAR(64) UNIQUE,                 -- social login (step 9)
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
-- The assignment allows only ONE administrator
CREATE UNIQUE INDEX IF NOT EXISTS users_single_admin ON users (role) WHERE role = 'admin';

CREATE TABLE IF NOT EXISTS addresses (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient  VARCHAR(120) NOT NULL,
  phone      VARCHAR(20),
  address    TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS addresses_user_idx ON addresses (user_id);

CREATE TABLE IF NOT EXISTS password_tokens (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,              -- sha256 of the emailed token
  purpose    VARCHAR(10) NOT NULL CHECK (purpose IN ('set','reset')),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS categories (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS brands (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS tags (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(60) NOT NULL UNIQUE,
  slug VARCHAR(80) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS products (
  id                SERIAL PRIMARY KEY,
  category_id       INTEGER NOT NULL REFERENCES categories(id),
  brand_id          INTEGER NOT NULL REFERENCES brands(id),
  name              VARCHAR(200) NOT NULL,
  slug              VARCHAR(220) NOT NULL UNIQUE,
  short_description VARCHAR(300) NOT NULL DEFAULT '',
  description       TEXT NOT NULL DEFAULT '',
  avg_rating        NUMERIC(2,1) NOT NULL DEFAULT 0,
  rating_count      INTEGER NOT NULL DEFAULT 0,
  sold_count        INTEGER NOT NULL DEFAULT 0,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,   -- soft delete
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS products_category_idx ON products (category_id);
CREATE INDEX IF NOT EXISTS products_brand_idx    ON products (brand_id);
CREATE INDEX IF NOT EXISTS products_created_idx  ON products (created_at DESC);
CREATE INDEX IF NOT EXISTS products_sold_idx     ON products (sold_count DESC);

CREATE TABLE IF NOT EXISTS product_tags (
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tag_id     INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, tag_id)
);

CREATE TABLE IF NOT EXISTS product_images (
  id         SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  position   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS product_images_idx ON product_images (product_id, position);

-- Every product has >= 2 variants, each with its own price and stock
CREATE TABLE IF NOT EXISTS product_variants (
  id         SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name       VARCHAR(120) NOT NULL,
  sku        VARCHAR(40) NOT NULL UNIQUE,
  price      INTEGER NOT NULL CHECK (price >= 0),        -- VND
  cost_price INTEGER NOT NULL DEFAULT 0 CHECK (cost_price >= 0),  -- for profit statistics
  stock      INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  position   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS product_variants_idx ON product_variants (product_id, position);
