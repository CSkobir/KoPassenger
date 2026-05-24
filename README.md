# Full-stack auth app

React (Vite) + Tailwind frontend, Express + Prisma + PostgreSQL backend. JWT access and refresh tokens are delivered in **httpOnly** cookies with refresh rotation.

## Prerequisites

- Node.js 18+
- PostgreSQL

## Setup

### 1. Database

Create a database and set `DATABASE_URL` in `server/.env` (see `server/.env.example`).

### 2. Backend

```bash
cd server
cp .env.example .env
# Edit .env with DATABASE_URL and secrets (use long random strings for JWT secrets)
npm install
npx prisma generate
npx prisma db push
npm run dev
```

API runs at `http://localhost:4000`.

### 3. Frontend

```bash
cd client
npm install
npm run dev
```

Open `http://localhost:5173`. The Vite dev server proxies `/api` and `/uploads` to the backend so cookies stay same-site.

For production builds, set `VITE_API_URL` to your public API origin and configure `FRONTEND_ORIGIN` + CORS on the server.

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Sign up (sets cookies) |
| POST | `/api/auth/login` | Sign in (sets cookies) |
| POST | `/api/auth/logout` | Clear session |
| POST | `/api/auth/refresh` | Rotate refresh token; new access + refresh cookies |
| POST | `/api/auth/forgot-password` | Request reset (dev: link logged to server console) |
| POST | `/api/auth/reset-password` | Body: `token`, `password` |
| GET | `/api/users/me` | Current user (requires access cookie) |
| PATCH | `/api/users/me` | Update `fullName`, `email` |
| POST | `/api/users/me/avatar` | `multipart/form-data` field `avatar` |
| PATCH | `/api/users/me/password` | `currentPassword`, `newPassword` — clears cookies after success |
| PATCH | `/api/users/me/settings` | `emailNotifications`, `theme` (`light` \| `dark`) |
| DELETE | `/api/users/me` | Body: `password`, `confirm` must be `"DELETE"` |
| GET | `/api/health` | Liveness |

## Security notes

- Passwords: bcrypt, 12 rounds.
- Access token TTL: 15 minutes; refresh: 7 days; refresh **rotation** on each `/refresh`.
- Auth routes (login, register, forgot, reset): **5 requests / 15 minutes** per IP; refresh: **60 / 15 minutes**.
- CORS: `FRONTEND_ORIGIN` only; credentials enabled.

## Password reset email

There is no SMTP integration. In development, the reset URL is printed to the API server console. Plug in your mailer where `forgot-password` creates the token.
