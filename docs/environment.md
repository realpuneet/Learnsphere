# Environment variables

Backend: `backend/.env` (template `backend/.env.example`, validated with zod in `src/config/env.js` — the process refuses to start on invalid values).
Frontend: `frontend/.env` (public values only; anything `VITE_*` is shipped to the browser).

## Backend

| Variable | Default | Notes |
|---|---|---|
| `NODE_ENV` | development | `production` turns on JSON logs and the secure-cookie check |
| `PORT` | 5000 | |
| `APP_NAME` | LearnSphere | Shown in emails and default site name |
| `CLIENT_URL`, `CORS_ORIGINS` | http://localhost:5173 | `CORS_ORIGINS` is a comma-separated allow-list; credentials are enabled |
| `TZ` | Asia/Kolkata | Daily buckets in analytics use IST |
| `LOG_LEVEL` | debug | pino level |
| `START_WORKER` | true | Run BullMQ workers inside the API process. Set `false` on API pods when you run `npm run worker` separately |
| `MONGO_URI` | `mongodb://127.0.0.1:27017/learnsphere?replicaSet=rs0` | |
| `REDIS_URL` | `redis://127.0.0.1:6379` | cache, rate limits, BullMQ, Socket.io adapter |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | — | 32+ chars each, must differ |
| `ACCESS_TTL`, `REFRESH_TTL_DAYS` | 15m, 30 | |
| `COOKIE_SECURE`, `COOKIE_DOMAIN` | false, empty | `COOKIE_SECURE=true` in production (HTTPS) |
| `PLATFORM_FEE_PERCENT` | 20 | Platform share of the GST-exclusive amount. Admins can override in Settings |
| `GST_PERCENT` | 18 | Course prices are GST-**inclusive** |
| `REFUND_WINDOW_DAYS` | 7 | Student self-service refund window |
| `REFUND_MAX_PROGRESS` | 20 | No self-service refund once progress passes this % |
| `INACTIVITY_NUDGE_DAYS` | 7 | Days idle before the "continue learning" email |
| `CERTIFICATE_SECRET` | — | HMAC key for certificate signatures. **Changing it makes old certificates fail verification** |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | blank | Blank = dry-run payments (the verify step auto-succeeds) |
| `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY`, `IMAGEKIT_URL_ENDPOINT` | blank | Blank = uploads disabled; paste image URLs instead |
| `EMAIL_ENABLED`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | — | Blank `SMTP_HOST` = dry-run (logged, not sent). Email is the **only** optional channel |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | admin@learnsphere.local / Admin@12345 | Used by `npm run seed` |

Runtime-editable (Admin → Settings, stored in the `settings` collection, win over env): site name, tagline, support email, platform fee, GST, refund window, refund max progress, course-approval requirement, instructor sign-up switch.

## Frontend

| Variable | Notes |
|---|---|
| `VITE_API_URL` | API origin. Empty in dev → Vite proxies `/api` and `/socket.io` to `VITE_PROXY_TARGET` |
| `VITE_SOCKET_URL` | Socket origin if different from the API |
| `VITE_PROXY_TARGET` | Dev proxy target (default http://localhost:5000) |
| `VITE_RAZORPAY_KEY_ID` | Public key id; the server also returns it with each order |
| `VITE_APP_NAME` | Display name |

## Production checklist
`NODE_ENV=production`, `COOKIE_SECURE=true`, strong distinct secrets (access, refresh, certificate), exact `CORS_ORIGINS`, Razorpay live keys **and** the webhook URL `POST /api/v1/payments/webhook`, SMTP with SPF/DKIM, Redis `maxmemory-policy noeviction` (BullMQ).
