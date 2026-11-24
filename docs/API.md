# Mobile API (`/api/v1`)

The REST API the Android app uses. It covers everything a **guest** or a
**student** can do on the website. Teachers and admins keep using the website.

The machine-readable contract is [`openapi.yaml`](./openapi.yaml) (OpenAPI 3.1).
Android Studio can generate the Retrofit client from it, for example with the
OpenAPI Generator plugin (`generatorName = "kotlin"`, `library = "jvm-retrofit2"`).

## Conventions

- **Base URL:** the website's origin, e.g. `https://darsequranacademy.com/api/v1`.
- **JSON** request and response bodies, unless an endpoint says multipart.
- **Success:** `{ "success": true, ... }`. **Errors:** `{ "success": false, "error": "<message to show>" }`,
  sometimes with a `code` the app should handle (`email_not_verified`).
- **Status codes:** `400` invalid input, `401` not signed in or session ended,
  `403` not allowed, `404` not found (also used for "not yours"), `409` conflict
  (already done, price changed, out of stock), `429` rate-limited (with `Retry-After`).
- **Money** is always in paise (integer): `34900` = ₹349.00.
- **Lists** take `?page` (from 1) and `?pageSize` (1–50, default 20) and answer
  `{ data, totalCount, page, pageSize }`. Most also take `?search`.
- **Dates** are ISO-8601 strings in UTC.
- **Rich text** (blog bodies, fatwa answers) is sanitised HTML: render it in a WebView
  or with `HtmlCompat.fromHtml`.
- **Images** are absolute URLs, or paths beginning with `/assets/` (bundled avatars)
  to be resolved against the base URL.

## Authentication

| Endpoint | Body | Result |
|---|---|---|
| `POST /auth/register` | `{ name?, email, password, acceptPolicies: true }` | `{ success, verificationRequired, message }`, no session; a verification e-mail is sent. A taken address gets the same answer (its owner is e-mailed instead). Sign in once verified |
| `POST /auth/login` | `{ email, password }` | tokens + `user`; `403` with `code: "email_not_verified"` until the address is verified |
| `POST /auth/google` | `{ idToken }` | tokens + `user` |
| `POST /auth/refresh` | `{ refreshToken }` | a new pair; the presented refresh token is revoked |
| `POST /auth/logout` | `{ refreshToken }` and/or the Bearer header | ends the session immediately |
| `POST /auth/resend-verification` | `{ email }` | always the same generic answer |
| `POST /auth/forgot-password` | `{ email }` | sends a reset e-mail; the link opens the website's reset page |

Every sign-in returns:

```json
{
  "success": true,
  "accessToken": "<JWT, 1 hour>",
  "expiresIn": 3600,
  "refreshToken": "<opaque, 30 days, single use>",
  "refreshExpiresAt": "2026-12-03T00:00:00.000Z",
  "token": "<same as accessToken; legacy name, will be removed>",
  "user": { "id": "...", "email": "...", "role": "USER" }
}
```

- Send `Authorization: Bearer <accessToken>` on every authenticated request.
- On a `401`, call `/auth/refresh` once, store the new pair and retry the request.
  A `401` from `/auth/refresh` means the session is over: show the login screen.
- **Refresh from one place only.** Each refresh token works once, so two requests
  that hit `401` at the same time must share one refresh (an OkHttp `Authenticator`
  guarded by a mutex). A second refresh with the same token is refused and signs the
  user out.
- **Google sign-in:** request the ID token with the **web** OAuth client ID as the
  server client ID (Credential Manager `GetGoogleIdOption.setServerClientId`), because
  the server checks the token's audience against `AUTH_GOOGLE_ID`. Tokens for another
  client, with an unverified e-mail or from another issuer are refused.
- Browser cookies are never accepted on `/api/v1`, and cross-site browser calls are
  refused unless their origin is listed in `API_ALLOWED_ORIGINS`. The Android app
  sends no `Origin` and is unaffected.

## Account

| Endpoint | Notes |
|---|---|
| `GET /auth/me` | Profile plus `profileComplete`, `hasPassword`, `whatsappCountry`, `whatsappLocal` |
| `PUT /auth/me` | Any subset of `name, fatherName, dateOfBirth (yyyy-mm-dd), occupation, address, gender, country, whatsapp`. With `country` (ISO code) `whatsapp` is the local number and must fit that country. Completing the profile allocates the registration number. A female profile always uses the default avatar. Unknown fields are refused. |
| `POST /auth/me/photo` | multipart `image` (JPEG/PNG/WebP). Not for female profiles. |
| `DELETE /auth/me/photo` | Back to the default avatar |
| `POST /auth/change-password` | `{ currentPassword, newPassword }`; other app sessions are signed out |
| `DELETE /auth/me` | Deletes the account: `{ password }`, or `{ confirm: "DELETE" }` for Google-only accounts. `409` while a fee payment or book order is still being processed. Receipts and fee history are kept against an anonymised account; everything that identifies the person is removed and every session ends. |

A profile must be complete before enrolling (`profileComplete`).

## Public content (no sign-in)

| Endpoint | Notes |
|---|---|
| `GET /app-config` | Branding, contact and social links, policy version and URLs, countries, occupations, fatwa categories, feature switches (`googleSignIn`, `onlinePayments`, `feeWaiverRequests`), limits. Cache for a day. |
| `GET /home` | All homepage sections in one call: `dailyInspiration, announcements, courses, blogPosts, libraryItems, books, fatwas, reviews` |
| `GET /courses`, `GET /courses/{id}` | `?category`. With a Bearer token the detail adds the caller's `enrollment` (`status`, `rollNumber`, `enrollmentFeePending`) and, once approved, recent `announcements`; `enrollmentOpen` says whether new applications are accepted |
| `GET /teachers`, `GET /teachers/{id}` | The detail includes the teacher's public courses (paginated) |
| `GET /blog`, `GET /blog/{id}` | The detail has `likeCount`, `commentCount`, the first comments and, with a token, `likedByMe` |
| `GET /blog/{id}/comments?skip=` | The next page of comments, newest first |
| `GET /fatwa`, `GET /fatwa/{id}` | Answered and approved only; `?category` |
| `POST /fatwa` | Ask a question: `{ title, question, category, askerName, askerEmail }` (rate-limited) |
| `GET /library`, `GET /library/{id}` | `?topic` |
| `GET /bookstore`, `GET /bookstore/{id}` | Published books |
| `GET /announcements`, `GET /announcements/{id}` | Site announcements with images |
| `GET /daily-inspiration` | The current verse or hadith |
| `GET /occupations`, `GET /payment-settings` | Lookups; `payment-settings` has the academy's UPI and bank details for the pay screen |
| `POST /contact` | `{ name, email, phone?, message }`; with a token the account's name and e-mail are used |

## Blog engagement (signed in)

| Endpoint | Notes |
|---|---|
| `POST /blog/{id}/like` | Toggles the caller's like; answers `{ liked, likeCount }` |
| `POST /blog/{id}/comments` | `{ content }` (1–2000 characters, rate-limited); the author is notified |
| `PATCH /blog/comments/{commentId}` | `{ content }`, own comments only |
| `DELETE /blog/comments/{commentId}` | Own comments only |

## Courses and fees (signed in)

| Endpoint | Notes |
|---|---|
| `GET /enrollments` | The caller's enrollments with their courses |
| `POST /enrollments` | `{ courseId }` applies. Free courses wait for approval; paid ones answer that the enrollment fee is due next. A rejected request can apply again. |
| `GET /courses/{id}/announcements` | Course-wide announcements and private messages (`?page`, `?coursePage`, `?pageSize`); empty until approved |
| `GET /student/attendance`, `GET /student/grades` | `?courseId` to narrow to one course |
| `GET /payments/quote?courseId=&type=enrollment\|course` | Base fee, selectable waivers with the amount for each, fee frequency, year options, and `canPay` / `reason` |
| `POST /payments/submit` | JSON or multipart (`screenshot` file). `courseId`, `paymentType` (`enrollment` or `monthly`), for course fees `paymentMonth` (`"01"`–`"12"`, `"01"` for one-time fees) and `paymentYear`, `paymentMethod` (`upi`/`bank`), `upiTransactionId`, `couponId` (omit or `"none"` for no waiver), `expectedAmountPaise` (the amount shown; a changed price answers `409`) |
| `GET /payments/history` | Submissions and payment records |
| `GET /payments/{id}/receipt` | PDF of an issued receipt (`id` is a payment record); `409` until the academy issues it |
| `GET /waiver-requests`, `POST /waiver-requests` | `{ courseId, feeType: enrollment\|course\|both, reason }` (10–1000 characters) |
| `GET /reviews`, `POST /reviews` | The caller's reviews; `{ quote, rating (1-5), course?, location? }` |

Typical flow for a paid course: `POST /enrollments` → `GET /payments/quote?type=enrollment` →
pay by UPI/bank → `POST /payments/submit` with the reference and the amount shown → the
academy verifies → a notification arrives and the course appears as active.

A 100% waiver is submitted the same way (amount 0, no reference). It waits for the
academy's confirmation unless the academy enabled auto-approval.

## Bookstore (signed in)

| Endpoint | Notes |
|---|---|
| `GET /bookstore/cart` | The server-side cart (shared with the website) |
| `POST /bookstore/cart` | `{ items: [{ bookId, quantity }] }` replaces the cart |
| `PATCH /bookstore/cart` | `{ bookId, quantity }` sets one line; `0` removes it |
| `POST /bookstore/checkout-quote` | `{ items }` → lines, subtotal, shipping, total, exactly as the order will be charged; `409` when stock is short |
| `POST /bookstore/orders` | JSON or multipart (`screenshot`): `items`, `paymentMethod`, `upiTransactionId`, `deliveryAddress`, `deliveryPinCode`, `deliveryPhoneNumber`, `notes?` |
| `GET /bookstore/orders`, `GET /bookstore/orders/{id}` | The caller's orders; `paymentRecordId` leads to the receipt once issued |

Books that become unavailable are left out of cart responses: compare what you sent
with what came back and tell the student.

## Notifications (signed in)

| Endpoint | Notes |
|---|---|
| `GET /notifications` | `?filter=all\|unread`; includes `unreadCount` |
| `PATCH /notifications` | `{ notificationId }` or `{ markAllRead: true }` |
| `GET /notifications/{id}` | Opens one and marks it read |
| `POST /notifications/device-token` | `{ token, platform: android }` registers the FCM token after sign-in |
| `DELETE /notifications/device-token` | `{ token }` on sign-out |

Every in-app notification is also pushed to the student's registered devices (when
`FIREBASE_SERVICE_ACCOUNT_JSON` is configured on the server). The push data carries
the website path the notification links to (`href`), which the app can map to a screen.

## Private files

Course-announcement attachments and payment screenshots are app paths of the form
`/api/files/private/...`. Request them with the same Bearer header; the server checks
access and answers `302` to a URL valid for five minutes. Follow the redirect without
the Authorization header. Older uploads keep their public URLs.
