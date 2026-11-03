# Mobile API (`/api/v1`)

All `/api/v1` routes are Bearer-only: a browser session cookie is never
accepted, and browser callers must come from an origin listed in
`API_ALLOWED_ORIGINS` (see `middleware.ts`).

## Authentication

| Endpoint | Body | Result |
|---|---|---|
| `POST /api/v1/auth/login` | `{ email, password }` | tokens + `user`; `403` with `code: "email_not_verified"` until the address is verified |
| `POST /api/v1/auth/register` | `{ name?, email, password }` | tokens + `user` (the account starts unverified; a verification email is sent) |
| `POST /api/v1/auth/google` | `{ idToken }` (a Google ID token issued to this app's client id) | tokens + `user` |
| `POST /api/v1/auth/refresh` | `{ refreshToken }` | new tokens; the presented refresh token is revoked |
| `POST /api/v1/auth/logout` | `{ refreshToken }` and/or `Authorization: Bearer <accessToken>` | ends the session immediately |
| `GET /api/v1/auth/me` | — | the signed-in profile |

### Tokens

Every successful sign-in returns:

```json
{
  "success": true,
  "accessToken": "<JWT, 1 hour>",
  "expiresIn": 3600,
  "refreshToken": "<opaque, 30 days, single use>",
  "refreshExpiresAt": "2026-12-03T00:00:00.000Z",
  "token": "<same value as accessToken; kept for one release>",
  "user": { "id": "...", "email": "...", "role": "USER" }
}
```

- Send `Authorization: Bearer <accessToken>` on every other request.
- When a request answers `401`, call `/api/v1/auth/refresh` with the stored
  refresh token, store the new pair, and retry once. A `401` from the refresh
  endpoint means the session has ended (logged out, expired, or the refresh
  token was already used): send the user to the login screen.
- Each refresh token works once. Using one that was already exchanged is
  treated as a stolen token and refused.
- `token` is the legacy field name for the access token. It will be removed
  in a later release; read `accessToken`.

Access tokens issued before this scheme (signed like the web session
cookie) are no longer accepted; clients on those tokens must sign in again.

### Private files

Course-announcement attachments and payment screenshots are returned as
app paths of the form `/api/files/private/...`. Request them with the
same `Authorization: Bearer <accessToken>` header; the server checks that
the user may see the file (enrolled student or course teacher for an
attachment, the paying student for a screenshot) and answers `302` with a
URL that is valid for five minutes. Follow the redirect without re-sending
the Authorization header. Files uploaded before this change keep their
public URLs.

### Errors

Responses are `{ success: false, error: "<message>" }`, with an optional
`code` for cases the client should handle specially (`email_not_verified`).
Rate-limited requests answer `429` with a `Retry-After` header.
