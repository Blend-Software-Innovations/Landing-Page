# Auth System

Production-grade authentication for admin/ops flows.

## Features
- Password hashing (bcryptjs)
- JWT access token (15 min) + refresh token (7 days) rotation
- HttpOnly secure cookies
- Logout + refresh endpoint
- Token-based password reset (email optional)
- CORS allowlist + rate limiting on auth routes

## Environment Variables
Required:
- `AUTH_JWT_SECRET` — 16+ chars
- `AUTH_REFRESH_SECRET` — 16+ chars

Optional (for seed user):
- `AUTH_ADMIN_EMAIL`
- `AUTH_ADMIN_PASSWORD`

Optional:
- `AUTH_ALLOWLIST_ORIGINS` — comma-separated list
- `AUTH_COOKIE_DOMAIN` — set if using subdomain
- `AUTH_RATE_LIMIT_PER_MIN` — default `20`

## Endpoints
### `POST /api/auth/login`
Body:
```json
{ "email": "admin@example.com", "password": "password123" }
```
Sets `access_token` + `refresh_token` cookies.

### `POST /api/auth/refresh`
Rotates refresh token and issues new access token.

### `POST /api/auth/logout`
Revokes refresh token and clears cookies.

### `POST /api/auth/reset-request`
Body:
```json
{ "email": "admin@example.com" }
```
Returns `{ token }` (email send optional).

### `POST /api/auth/reset`
Body:
```json
{ "token": "...", "newPassword": "newStrongPass" }
```

## Notes
- Access token is short-lived and stored in HttpOnly cookie.
- Refresh token is rotated on every refresh.
- CORS allowlist is enforced on auth routes.
- Rate limits are per-IP per minute.
