# Omochat Architecture

## Current Shape

Omochat starts as one repo with two deployable services:

- `apps/web`: Next.js chat client.
- `apps/api`: NestJS REST API and Socket.io gateway.

The database layer lives in `packages/db`, so the app can share Prisma types without coupling frontend code to backend internals.

## Backend Modules

The backend should remain a modular monolith at first:

- Auth and sessions
- Users and devices
- Conversations and participants
- Messages, receipts, reactions, and threads
- Media metadata and signed upload URLs
- Presence and typing
- Notifications
- Calls
- Admin and moderation

Each module should own its DTOs, controllers, and services. That gives us a simple deploy now and cleaner extraction later.

## Future Extraction

Split services only when there is a clear scaling or team boundary:

- Realtime service when socket fanout needs independent scaling.
- Media service when upload processing becomes heavy.
- Notification service when push retries and templates need their own worker pool.
- Call service when WebRTC signaling needs dedicated availability.

Redis should be the first scale step for Socket.io coordination. A queue can come later for notifications, media processing, and analytics events.

## Local Docker Ports

Omochat uses non-default local ports so it can live beside other Docker stacks:

- PostgreSQL: `localhost:55433`
- Redis: `localhost:6380`
- Mailpit SMTP: `localhost:11025`
- Mailpit UI: `http://localhost:18025`

If you want to reuse an existing Redis or Mailpit container, keep this compose service stopped and point `.env` at the container you already use.
