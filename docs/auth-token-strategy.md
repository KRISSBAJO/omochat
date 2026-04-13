# Auth Token Strategy

Use two token styles, depending on the client.

## Mobile Apps

Mobile should use:

- Short-lived access token in `Authorization: Bearer <token>`.
- Rotating refresh token stored in the platform secure store.
- Device row per install so a stolen or lost phone can be revoked without logging out every device.

This is better than cookies for native mobile apps because cookies are browser-first state. Bearer tokens plus secure storage are easier to reason about across iOS, Android, background jobs, and push notification flows.

## Web App

Web should use:

- Short-lived access token in memory.
- Rotating refresh token in a secure, HTTP-only, same-site cookie.

Avoid putting refresh tokens in `localStorage`. It is convenient, but it raises the impact of XSS.

## Later

For enterprise customers, add:

- Device management UI.
- Refresh token reuse detection.
- Session risk scoring.
- Tenant-level token lifetime policy.
