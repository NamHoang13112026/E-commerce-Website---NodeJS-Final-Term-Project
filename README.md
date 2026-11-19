# TechParts – Web Programming with Node.js (502070) final project

Online store selling **computers and computer components only**.
Stack: Node.js + Express + EJS, PostgreSQL, Redis (sessions), Bootstrap 5, nginx, Docker Compose.

## Run with Docker (the way the instructor will run it)

```
docker compose up -d
```

Open http://localhost:8080. The first start builds the image, creates tables and loads 43 demo products.
Two app containers run behind nginx (check the footer: "Máy chủ xử lý" changes between requests).

## Run locally (development)

Requires Node 20+, PostgreSQL 14+ and Redis.

```
cp .env.example .env        # adjust DATABASE_URL / REDIS_URL if needed
npm install
npm run init-db             # creates tables + demo data (safe to repeat)
npm run dev                 # http://localhost:3000
```

## Demo accounts

| Role     | Email                | Password     |
|----------|----------------------|--------------|
| Admin    | admin@shop.local     | Admin@123    |
| Customer | customer@shop.local  | Customer@123 |

Registration only asks for email, full name and address; the password is set through an emailed link.
Without SMTP settings the email is printed in the server log (`docker compose logs app`), and with
`DEV_SHOW_LINKS=true` the link is also shown on the page after registering.

## Progress against the plan

| Step | Content | Status |
|------|---------|--------|
| 1 (13/11) | Repo, DB schema, Docker Compose skeleton, layout | done |
| 2 (14/11) | Register / login / logout, Redis sessions, roles | done |
| 3 (15/11) | Product model + seed data | done |
| 4 (16/11) | Catalog: pagination, 7 sort options, search, filters (brand, price range, rating, category, tag) | done |
| 5 (17/11) | Product detail: variants with own stock, gallery, formatted prices | done |
| 6 (18/11) | Landing page | next |
| 7 (19/11) | Shopping cart | |

## Notes

* Product images are generated SVG placeholders (`/placeholder/...`). Replace the URLs in `product_images` with real photos later.
* Ratings shown now are sample values; they become real when reviews are built (step 11).
* nginx resolves the `app` containers when it starts. If you recreate them, run `docker compose restart nginx`.
