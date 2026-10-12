# LearnSphere — Learning Management System

Instructors build and sell courses; students learn on any device, take quizzes, ask questions and earn verifiable certificates.
MERN-style stack (MongoDB · Express · React · Node) with Redis, BullMQ and Socket.io for real-time.

## Features

| Area | What you get |
|---|---|
| Catalogue | Categories, search, level / price / rating filters, five sort orders, featured and related courses, instructor pages, URL-synced filters |
| Course player | Video (YouTube, Vimeo, MP4, HLS), articles (Markdown), quizzes; resume where you left off; completion tracking; mobile drawer outline |
| Quizzes | Single / multiple / true-false, pass mark, attempt limits, shuffle, explanations. Answer keys never leave the server before grading |
| Certificates | Issued exactly once on completion, HMAC-signed, printable, with a **public verification page** (`/verify/:code`) |
| Authoring | Instructors: course details, sections + lessons (reorder, free previews, resources), quiz editor, readiness checklist, submit for review |
| Moderation | `draft → in_review → published / rejected → archived`, admin approval queue with rejection reasons, instructor approval gate, feature courses |
| Payments | Razorpay checkout (dry-run without keys), GST-inclusive pricing, coupons (percent / flat, per-course or site-wide), refunds with window + progress rule |
| Revenue | Instructor earnings = net-of-GST minus platform fee; instructor and admin dashboards |
| Community | Per-lesson Q&A threads (instructor answers flagged), reviews with instructor replies |
| Notifications | Always in-app + real-time; **email is the only optional channel** (per-user preferences: updates, learning reminders, Q&A). Inactivity nudges after N idle days |
| Roles | student · instructor · admin |

## Repository layout

```
backend/    Express API, workers, tests        (src/{config,models,services,controllers,routes,validators,middlewares,jobs,sockets,integrations,utils})
frontend/   React 18 + Vite + Tailwind PWA     (src/{app,pages,components,hooks,lib,styles})
docs/       db.md · environment.md · scaling.md
```

## Run it

```bash
# 1. infrastructure (Mongo replica set + Redis + API)
cp backend/.env.example backend/.env          # set the three secrets (access, refresh, certificate)
docker compose up --build
docker compose run --rm api node src/utils/seed.js

# 2. frontend
cd frontend && cp .env.example .env && npm install && npm run dev     # http://localhost:5173
```

Without Docker: run Mongo (replica set `rs0`) and Redis yourself, then `cd backend && npm i && npm run seed && npm run dev`.

Seed logins: `admin@learnsphere.local / Admin@12345` (from env) · instructors `priya.menon@learnsphere.local` (and two more) `/ Teacher@12345` · students `student@learnsphere.local / Student@12345`, `riya.sen@learnsphere.local / Student@12345`. Coupon `WELCOME20`.

Payments, email and image upload all have **dry-run modes** when credentials are blank, so the whole flow works locally. API docs: `GET /api/v1/openapi.json`. Health: `GET /api/v1/health`.

See `docs/environment.md` (every variable), `docs/db.md` (data model) and `docs/scaling.md` (production notes).

## Design decisions worth knowing

* **One enrolment per student per course** — unique `{user, course}` index; checkout, webhook and admin grant all go through one idempotent `grantEnrollment`.
* **Certificate exactly once** — completion is a compare-and-set on the enrolment; only the request that flips `active → completed` issues the certificate (also unique per enrolment).
* **Protected content** — a lesson's `videoUrl` / content is returned only to enrolled students, the course's instructor, admins, or for free-preview lessons. Quiz answer keys and explanations are stripped before grading.
* **Moderation is compare-and-set** — every course status change is `findOneAndUpdate({_id, status: from})`, so racing admins cannot skip states.
* **Pricing** is GST-inclusive; revenue split is linear so analytics sum first and split once.
* **Auth**: access token in memory, rotating httpOnly refresh cookie with reuse detection (a replayed token revokes the whole family).
* **No raw HTML rendering** — lesson/Q&A Markdown is parsed to an AST and rendered as React elements; links are restricted to http(s)/mailto.
* **Payments**: raw-body webhook with HMAC verification, compare-and-set settlement, payment for a course deleted mid-flight is auto-refunded.

## Verification status (be honest)

This code was written in a sandbox where the npm registry was blocked (HTTP 403), so **nothing has been installed, built or run end-to-end**. What was actually checked:

* Backend: every file passes `node --check`; the whole API graph bundles with esbuild; a TypeScript-based static pass (undefined identifiers, unused imports/variables, missing exports, unresolved relative imports) is clean.
* **29 backend unit tests pass** (pricing / revenue split, progress + quiz grading, course readiness, validators, helpers).
* Frontend: all pages and components parse, the full `src/main.jsx` graph (including all lazy routes) bundles with third-party packages external, the same static pass is clean, and **7 Markdown-parser tests pass**.
* **Not verified**: the integration tests in `backend/tests/integration` (written, never executed — they need Mongo + Redis + `npm install`), `vite build`, Tailwind output, PWA generation, real Razorpay / SMTP calls, GSAP / Lenis behaviour, the Dockerfile and compose stack, and any real-browser or mobile-device testing.

Expect a short first-run shake-out (dependency versions, small runtime bugs). Run `npm test` in `backend` and `npm run build` in `frontend` first. The Dockerfile uses `npm ci`, which needs a committed `package-lock.json` — run `npm install` once in each app and commit the lockfiles.

## Remaining work

See `TODO.md`.
