# Deployment

This repo is set up for a two-service deployment:

- `apps/web` on AWS Amplify
- `apps/api` on Render
- PostgreSQL on Render Postgres

## Domain Shape

For browser auth to stay clean, use the same parent domain for web and API:

- `https://app.example.com`
- `https://api.example.com`

That keeps refresh-token cookies and CORS easier to reason about than mixing unrelated domains.

## Render API

`render.yaml` assumes:

- Render creates the `omochat-api` web service
- Render creates the `omochat-db` PostgreSQL instance
- the API builds from the monorepo root
- Prisma migrations run with `prisma migrate deploy` before each deploy

### Core Render env vars

- `DATABASE_URL`
  - injected from the Render Postgres instance
- `FRONTEND_URL`
  - public web URL, such as `https://app.example.com`
- `WEB_ORIGIN`
  - same value as `FRONTEND_URL` unless you have a different browser origin
- `ALLOWED_ORIGINS`
  - comma-separated browser origins for previews or extra domains
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `COOKIE_SAME_SITE`
  - use `lax` for same-site subdomain setups
- `COOKIE_SECURE`
  - set `true` in hosted HTTPS environments

### Optional Render env vars

Add these before you expect their product lanes to work:

- Mail: `SMTP_HOST`, `SMTP_PORT`, `MAIL_FROM`
- Media: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- S3 if used: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET`, `AWS_S3_PUBLIC_BASE_URL`
- Phone verify: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID`
- Web push: `WEB_PUSH_PUBLIC_KEY`, `WEB_PUSH_PRIVATE_KEY`, `WEB_PUSH_SUBJECT`
- Calls/TURN: `TURN_URI`, `TURN_TLS_URI`, `TURN_USER`, `TURN_PASS`, `TURN_SHARED_SECRET`, `ANNOUNCED_IP`

### Manual Render flow

1. Create the Postgres instance from `render.yaml` or the dashboard.
2. Create the API web service from `render.yaml`.
3. Fill every `sync: false` secret in the Render dashboard.
4. Add your API custom domain, such as `api.example.com`.
5. Verify the health endpoint at `/health`.
6. Verify Swagger at `/docs`.

## Amplify Web

`amplify.yml` is configured for the npm-workspaces monorepo layout in this repo.

### Amplify setup

1. Connect `KRISSBAJO/omochat` in Amplify.
2. Mark it as a monorepo.
3. Set the app root to `apps/web`.
4. Keep `AMPLIFY_MONOREPO_APP_ROOT=apps/web`.
5. Add the web env vars below in the Amplify console.

### Required Amplify env vars

- `NEXT_PUBLIC_API_URL`
  - public API URL, such as `https://api.example.com`
- `NEXT_PUBLIC_SOCKET_URL`
  - usually the same public API URL
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`
- `NEXT_PUBLIC_GIPHY_API_KEY`
- `NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY`

### Deploy order

1. Deploy Render Postgres.
2. Deploy Render API.
3. Put the real API URL into Amplify env vars.
4. Deploy Amplify web.
5. Update `FRONTEND_URL`, `WEB_ORIGIN`, and `ALLOWED_ORIGINS` in Render to match the real web URL.
6. Redeploy the API once after the final web URL is known.

## Notes

- Render injects `PORT`, and the API now honors it automatically.
- The API now binds to `0.0.0.0`, which Render expects for public services.
- Production migrations should use `npm run db:migrate:deploy`, not `npm run db:migrate`.
