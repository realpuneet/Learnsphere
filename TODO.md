# TODO

## Must do before production
- [ ] `npm install` in both apps; commit the lockfiles (the backend Dockerfile uses `npm ci`; CI currently uses `npm install`).
- [ ] Run `npm test` in `backend` (integration tests have never been executed) and `npm run build` in `frontend`; fix whatever surfaces.
- [ ] Real Razorpay keys + webhook URL (`POST /api/v1/payments/webhook`); test purchase, coupon, refund and the "paid for deleted course" path in test mode.
- [ ] SMTP provider (SPF / DKIM). Email is optional but recommended for certificates and refunds.
- [ ] `COOKIE_SECURE=true`, strong access / refresh / certificate secrets (changing `CERTIFICATE_SECRET` later breaks verification of old certificates), restrictive `CORS_ORIGINS`.
- [ ] Video hosting: lessons take a URL (YouTube / Vimeo / MP4 / HLS). For paid content use a provider with signed URLs or DRM — a plain public URL can be shared by an enrolled student.
- [ ] Legal: terms, privacy policy, refund policy page, instructor agreement, GST invoice requirements.
- [ ] HLS playback is native-only (Safari / iOS); add hls.js for other browsers.

## Product backlog
- [ ] Email verification and password reset flow (no reset endpoint yet).
- [ ] Instructor payouts / settlement reports and bank details.
- [ ] GST invoice PDFs and numbering.
- [ ] Downloadable certificate PDF (today: print to PDF from the browser).
- [ ] Course bundles, learning paths, subscriptions.
- [ ] Assignments with file upload and instructor grading.
- [ ] Live classes / webinars.
- [ ] Wishlist and cart (single-course checkout only today).
- [ ] Drip-release of lessons; quiz question banks / randomised subsets.
- [ ] Captions / transcripts; lesson notes and bookmarks.
- [ ] Web push / FCM notifications alongside email.
- [ ] Hindi / regional language UI.
- [ ] Moving a lesson between sections is available (edit lesson → Section); drag-and-drop reordering is not (up / down buttons today).
- [ ] E2E tests (Playwright) and load tests (k6) for catalogue and progress writes.
