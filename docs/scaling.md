# Scaling notes

The app scales horizontally; these are the levers in the order you will need them.

1. **Stateless API pods.** JWT access tokens; refresh tokens live in Mongo. Run N pods behind a load balancer; set `START_WORKER=false` on them.
2. **Dedicated workers.** `npm run worker` consumes `notify` (email, concurrency 20) and `maintenance` (a single repeatable per-minute `tick` that also triggers the hourly inactivity nudges, guarded by a Redis lock). BullMQ de-duplicates the tick by `jobId`.
3. **Socket.io** uses the Redis adapter; workers emit through a Redis pub/sub bridge. Use sticky sessions or websocket-only transport at the LB.
4. **Video is not served by the API.** Lessons reference YouTube/Vimeo/CDN/HLS URLs; put videos on a CDN or a managed video service. The API only returns a lesson's `videoUrl` to enrolled users (or for free previews).
5. **Catalogue reads** are the hot path: `utils/cache.js` namespace-versioned cache (list pages 60s, home 120s, categories 300s); any publish/unpublish/enrol bumps the `catalog` namespace.
6. **Progress writes** (`PUT /learn/:course/position`) are rate limited per user (10 per 10s) and the player only reports every ~10s, so they stay cheap single-document updates.
7. **MongoDB**: add read replicas for catalogue listings; shard `enrollments` and `lessons` by `course` hash if a single replica set saturates. Unique `{user, course}` stays shard-local when the shard key is `user`+`course`.
8. **Rate limits** are Redis fixed windows and fail open if Redis is down. Checkout also uses idempotency keys.
9. **Front end**: static build on a CDN, route-level code splitting, PWA shell cache, images through ImageKit.
