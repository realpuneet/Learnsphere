# LearnSphere — Database design (MongoDB 7, Mongoose 8)

MongoDB runs as a **replica set** (even single node) so transactions / change streams can be adopted later. Today the code relies on
single-document atomicity, compare-and-set updates and unique indexes rather than multi-document transactions.

## Collections

| Collection | Purpose | Key fields |
|---|---|---|
| `users` | Students, instructors, admins | `role`, `email`, `passwordHash`, `headline`, `bio`, `links{}`, `instructor{approved,appliedAt,approvedAt}`, `prefs{emailUpdates,emailNudges,emailQa}`, `isActive` |
| `refreshtokens` | Rotating refresh tokens (hashed) | `user`, `family`, `tokenHash`, `usedAt`, `revokedAt`, TTL on `expiresAt` |
| `categories` | Catalogue categories | `name`, `slug`, `sortOrder`, `isActive` |
| `courses` | Course + **embedded sections** | `instructor`, `category`, `slug`, `status`, `price`, `mrp`, `level`, `outcomes[]`, `sections[{title,order}]`, `stats{lessons,durationSec,enrolled,ratingAvg,ratingCount}`, `featured`, `rejectionReason` |
| `lessons` | One document per lesson (separate so a course can have thousands) | `course`, `section`, `order`, `type` (video\|article\|quiz), `videoUrl`, `content`, `resources[]`, `durationSec`, `isPreview` |
| `quizzes` | One per quiz lesson | `lesson`, `course`, `passPercent`, `maxAttempts`, `shuffle`, `questions[{text,type,options[{text,correct}],explanation,points}]` |
| `quizattempts` | Graded attempts | `user`, `quiz`, `scorePct`, `passed`, `answers[]` |
| `enrollments` | Student ↔ course; **progress lives here** | `user`, `course`, `instructor`, `status`, `source`, `amountPaid`, `payment`, `completed[]`, `percent`, `lastLesson`, `lastPosition{lesson,sec}`, `certificate`, `lastActivityAt`, `nudgedAt` |
| `certificates` | Signed completion certificates | `code`, `user`, `course`, `enrollment` (unique), `studentName`, `courseTitle`, `signature` |
| `reviews` | One review per user per course | `rating`, `comment`, `reply{body,at}` |
| `threads` | Lesson Q&A | `course`, `lesson`, `author`, `title`, `body`, `answers[]`, `resolved` |
| `coupons` | Discount codes | `code` (unique), `type`, `value`, `maxDiscount`, `course?`, `owner`, `maxUses`, `used`, `expiresAt` |
| `payments` | Razorpay records | `purpose`, `refId` (course), `amount` (GST-inclusive ₹), `status`, `providerOrderId`, `meta{coupon,…}`, `refund{}` |
| `notifications` | In-app inbox (always written) | `user`, `type`, `title`, `body`, `data`, `readAt`, TTL |
| `notificationlogs` | Audit of every **email** attempt | `channel='email'`, `status`, `to`, `error`, TTL 60d |
| `settings` | Runtime overrides | `key`, `value` |

## Important indexes and the guarantees they give

* `users.email` unique — no duplicate accounts.
* `enrollments {user, course}` unique — a student can never be enrolled twice, even under concurrent checkout/webhook.
* `certificates.enrollment` unique — a course completion yields exactly one certificate even if two requests race.
* `reviews {user, course}` unique — one review per learner; updates are upserts.
* `coupons.code` unique; redemption is an atomic conditional `$inc` against `maxUses`.
* `courses {status, category, publishedAt}`, `{status, stats.enrolled}`, `{status, stats.ratingAvg}`, `{status, price}` — each catalogue sort is index-backed. Text index on title/subtitle/tags.
* `lessons {course, section, order}` — curriculum read is one indexed query.

## State machines (compare-and-set)

* Course: `draft → in_review → published | rejected`, `published → archived`, `archived → published | in_review | draft`. Each move is `findOneAndUpdate({_id, status: from})`, so double clicks and racing admins cannot skip states. Editing a rejected course returns it to draft.
* Enrollment: `active → completed | refunded | revoked`; completion flips `active → completed` with a CAS and only the winner issues the certificate.

## Money

Prices are GST-inclusive. `net = total − total/(1+gst)`; `platform = net × fee%`; `instructor = net − platform`. The split is linear, so analytics sum gross first and split once.
