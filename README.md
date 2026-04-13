# Omochat

Omochat is a Next.js + Node monorepo for a realtime chat product that can start as two services and later split cleanly into microservices.

## Apps

- `apps/web`: Next.js chat client.
- `apps/api`: NestJS API and Socket.io realtime gateway.
- `packages/db`: Prisma schema and database client package.

## First Run

```bash
cp .env.example .env
docker compose up -d
npm install
npm run db:generate
npm run db:migrate
npm run dev
```

`npm run build` only compiles the applications. It does not start the backend or frontend.

The intended local ports are:

- Web: `http://localhost:3000`
- API: `http://localhost:4000`
- Swagger: `http://localhost:4000/docs`
- PostgreSQL: `localhost:55433`
- Redis: `localhost:6380`
- Mailpit SMTP: `localhost:11025`
- Mailpit UI: `http://localhost:18025`

## Architecture

Start with two deployable services:

- Web app: Next.js, TypeScript, Tailwind.
- Backend app: NestJS, REST APIs, Socket.io gateway, Prisma, PostgreSQL, Redis adapter later.

Inside the backend, keep service boundaries modular:

- Auth
- Users
- Conversations
- Messages
- Media
- Presence
- Notifications
- Calls
- Admin

When scale demands it, these modules can be extracted into separate services without changing the product model first.

## Auth Direction

Mobile clients should use `Authorization: Bearer <access_token>` plus rotating refresh tokens in platform secure storage.

The web client should use an in-memory access token plus a secure, HTTP-only, same-site refresh-token cookie.

See `docs/auth-token-strategy.md`.

Brand colors are documented in `docs/brand.md`.

## API Endpoints

Swagger documents the API at `http://localhost:4000/docs`.

Initial auth and user endpoints:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /users/me`
- `PATCH /users/me`
- `GET /users/search?q=mira`
