# ReviewLens — AI-Powered Review Summarization Platform

A full-stack MERN platform for reviewing movies, books, electronics and
restaurants. It aggregates user reviews and uses the OpenAI API to generate
balanced **pros / cons** summaries, with **Redis caching** in front of MongoDB
and **JWT + bcrypt + RBAC** authentication. The whole stack runs with a single
`docker compose up`.

> **Tech:** Node.js · Express · React (Vite) · MongoDB · Redis · Docker · OpenAI

---

## Features

- **Auth** — register/login with **bcrypt**-hashed passwords and stateless
  **JWT** sessions.
- **RBAC** — `user` and `admin` roles. Admins can delete any product or review;
  users manage only their own reviews.
- **Reviews & ratings** — one review per user per product, with denormalized
  rating averages kept in sync.
- **AI summaries** — pros/cons/verdict generated from a product's reviews via
  the **OpenAI Chat Completions API** (JSON mode). Falls back to a built-in
  heuristic summarizer when no API key is set, so it runs with zero config.
- **Redis caching** — product lists, product detail, and AI summaries are
  read-through cached. Writes **invalidate** the affected keys so stale data is
  never served (see `X-Cache: HIT|MISS` response headers).
- **Dockerized** — Mongo, Redis, API and an nginx-served React build, all via
  Docker Compose.

## Architecture

```
          ┌─────────────┐      /api proxy      ┌──────────────┐
  browser │ React (nginx)│ ───────────────────▶ │ Express API  │
          └─────────────┘                       └──────┬───────┘
                                                 cache  │  data
                                           ┌────────────┴───────────┐
                                           ▼                        ▼
                                     ┌──────────┐            ┌─────────────┐
                                     │  Redis   │            │  MongoDB    │
                                     └──────────┘            └─────────────┘
                                                                    │
                                                       reviews ─────┘
                                                       summarized by OpenAI
```

## Quick start (Docker — recommended)

```bash
cp .env.example .env          # optionally add your OPENAI_API_KEY + a JWT_SECRET
docker compose up --build
```

- App → http://localhost:8080
- API → http://localhost:5000/api/health

Seed sample data (admin, users, products, reviews):

```bash
docker compose exec server npm run seed
```

Demo logins after seeding:

| Role  | Email                   | Password    |
|-------|-------------------------|-------------|
| admin | admin@example.com       | admin1234   |
| user  | reviewer1@example.com   | password123 |

## Local development (without Docker)

You need local MongoDB and Redis running.

```bash
# API
cd server
cp .env.example .env
npm install
npm run seed        # optional sample data
npm run dev         # http://localhost:5000

# Web (in a second terminal)
cd client
npm install
npm run dev         # http://localhost:5173 (proxies /api to :5000)
```

## API reference

| Method | Endpoint                                   | Auth        | Description                         |
|--------|--------------------------------------------|-------------|-------------------------------------|
| POST   | `/api/auth/register`                       | —           | Create account, returns JWT         |
| POST   | `/api/auth/login`                          | —           | Log in, returns JWT                 |
| GET    | `/api/auth/me`                             | Bearer      | Current user                        |
| GET    | `/api/products`                            | —           | List (cached); `?category=&q=&page=`|
| GET    | `/api/products/:id`                        | —           | Detail (cached)                     |
| POST   | `/api/products`                            | user        | Add a product                       |
| DELETE | `/api/products/:id`                        | **admin**   | Delete product + its reviews        |
| GET    | `/api/products/:id/reviews`                | —           | List reviews                        |
| POST   | `/api/products/:id/reviews`                | user        | Add a review (invalidates caches)   |
| DELETE | `/api/products/:id/reviews/:reviewId`      | author/admin| Delete a review                     |
| GET    | `/api/products/:id/reviews/summary`        | —           | AI pros/cons summary (cached)       |

## Caching & invalidation

- `products:list:*`, `product:<id>`, `summary:<id>` are cached with a TTL
  (`REDIS_TTL`, default 1h).
- Adding/removing a review recomputes the product's rating aggregates and
  invalidates `summary:<id>`, `product:<id>`, and all `products:list:*` keys.
- Creating/deleting a product invalidates the relevant keys too.
- Redis outages degrade gracefully to direct MongoDB reads (never a 500).

## Environment variables

See [`server/.env.example`](server/.env.example) and [`.env.example`](.env.example).
Key ones: `MONGO_URI`, `REDIS_URL`, `REDIS_TTL`, `JWT_SECRET`, `JWT_EXPIRES_IN`,
`OPENAI_API_KEY`, `OPENAI_MODEL`.

## Tests

```bash
cd server && npm test     # JWT / RBAC middleware unit tests (no infra needed)
```

## Project layout

```
server/   Express API — models, routes, JWT/RBAC middleware, Redis + OpenAI services
client/   React (Vite) SPA — auth, product browse, reviews, AI summary panel
legacy/   The original pre-rewrite demo apps, kept for reference
```

The previous version of this repo (standalone Movies/Books/Electronics/Restaurants
demos) now lives under [`legacy/`](legacy/).
