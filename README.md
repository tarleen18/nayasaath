# NayaSaath — production-oriented matrimonial platform foundation

India-first matrimonial product for adults seeking marriage, including never-married, divorced, widowed, annulled and legally separated members. Legal status is represented accurately; the platform must not describe a separated person as divorced or imply that identity checks prove personal character or safety.

## Monorepo

- `apps/api`: NestJS API, Prisma data model, password authentication, rotating refresh sessions, member access guard, admin authentication and verification review APIs.
- `apps/web/app/admin`: staff sign-in and verification queue interface (access token is held in memory only).
- `apps/web`: Next.js member-facing web application foundation.
- The member dashboard and profile setup are design previews: sample profiles are illustrative, and profile fields stay in page memory rather than being sent to or saved by the API.
- `apps/mobile`: Expo React Native application foundation.
- `infra`: deployment/security notes and operational runbooks.

## Local prerequisites

- Node.js 20.11+
- pnpm 10+
- Docker Desktop / Docker Engine

## Start infrastructure

```bash
cp .env.example .env
docker compose up -d
pnpm install
pnpm --dir apps/api prisma:generate
pnpm --dir apps/api prisma:migrate
```

The local Compose database is published on host port `5433` to avoid conflicts with a PostgreSQL server already using the default port `5432`. The example `DATABASE_URL` is configured for this host port.

Local verification messages are captured by Mailpit at [http://localhost:8025](http://localhost:8025); nothing is sent to real email addresses. For local SMTP testing, configure `EMAIL_PROVIDER=smtp`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, and `EMAIL_FROM` in `apps/api/.env`. For Resend, set `EMAIL_PROVIDER=resend`, `RESEND_API_KEY=<your Resend API key>`, and `EMAIL_FROM=<a verified sender address>`. The Resend provider uses its HTTPS API, avoiding outbound SMTP restrictions on hosting platforms. Keep credentials out of source control and restart the API after changing them.

Member registration sends a six-digit email verification code. The account remains pending and cannot sign in or receive an access/refresh token until the code is verified. Codes expire after 30 minutes, can be attempted at most five times, and resend requests are throttled to one per minute per pending account. Password recovery sends a single-use link that expires after 30 minutes; completing a reset revokes the account's existing refresh sessions. Public registration, login, verification, resend, and password recovery routes also use database-backed per-IP rate limits. `AUTH_EMAIL_BLOCKLIST` rejects listed addresses; a non-empty `AUTH_EMAIL_ALLOWLIST` permits only listed addresses. Both accept comma-separated exact email addresses, are evaluated case-insensitively at registration, login, refresh, verification, and authenticated requests, and take effect after the API restarts. The blocklist takes precedence.

Provision the first staff administrator from a trusted terminal. Use a unique password manager-generated password of at least 16 characters; do not commit it or put it in source control:

```bash
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD='use-a-long-unique-secret-here' ADMIN_ROLE=SUPER_ADMIN pnpm admin:create
```

The admin creation script upserts the named account, so running it again resets that account's password and role. Protect the terminal and shell history; prefer injecting secrets through your deployment secret manager for operational use. Open `/admin` in the web app for the staff verification queue.

Then run the API and web app in separate terminals:

```bash
pnpm dev:api
pnpm dev:web
```

## Publish the web frontend on GitHub Pages

The web app is configured for a static export. A GitHub Actions workflow publishes it to GitHub Pages on pushes to `main`. The repository Pages setting must use **GitHub Actions** as its build and deployment source. The workflow build output is `apps/web/.next-github-pages`; the `apps/web/public/CNAME` file binds `nayasaath.me`. DNS should have the four GitHub Pages apex A records and `www` as a CNAME to `tarleen18.github.io`. Preserve unrelated mail records.

GitHub Pages hosts only the static frontend; it does not run the NestJS API or database. The repository includes a free-tier Render Blueprint for an auth-only API; it requires an external PostgreSQL database and verified email-sending domain. The production API deliberately exposes only health and authentication routes until the remaining production launch gates are complete.

To enable registration, email-code verification, and login:

1. Create a PostgreSQL database with a managed provider such as Neon and keep its connection string private.
2. In Render, create a Blueprint from this repository using `render.yaml`. Set `DATABASE_URL` to the database connection string and deploy the service.
3. In Resend, verify a sending domain. Use the `mail.nayasaath.me` subdomain and add only the DNS records Resend provides for that subdomain in Namecheap; preserve the existing apex email-forwarding records. Create a sending API key and enter it as Render's `RESEND_API_KEY`. The sender configured in the Blueprint is `no-reply@mail.nayasaath.me`.
4. After the Render API is healthy at `/api/v1/health`, add a GitHub Actions repository variable named `NEXT_PUBLIC_API_URL` with the API base URL ending in `/api/v1`, then rerun the `Deploy web to GitHub Pages` workflow.

Render's free web service may sleep when idle, so the first request can take longer. Do not collect real member data until email delivery is verified and the remaining security-critical launch gates below are ready. Never put database credentials, SMTP keys, or JWT secrets in Git or chat.

Mobile app:

```bash
pnpm dev:mobile
```

## Implemented API endpoints (current milestone)

- `POST /api/v1/auth/register` — pending email/password account and email verification (Argon2id password hash); does not issue a session.
- `POST /api/v1/auth/email/verify` — verify a six-digit, single-use email code and activate the account.
- `POST /api/v1/auth/email/resend` — resend a verification code without revealing whether an address has an account.
- `POST /api/v1/auth/password/forgot` — request password reset instructions without revealing whether an address has an account.
- `POST /api/v1/auth/password/reset` — set a new password with a 30-minute, single-use reset token; invalidates existing refresh sessions.
- `POST /api/v1/auth/login` — member login; email verification and allow/block policy are required.
- `POST /api/v1/auth/refresh` — one-time rotating opaque refresh token.
- `POST /api/v1/auth/logout` — revoke refresh token.
- `POST /api/v1/auth/otp/request` and `/otp/verify` — development-only OTP challenge flow; member email activation uses the separate SMTP verification-link flow.
- `GET /api/v1/auth/me` — authenticated member session check.
- `POST /api/v1/admin/auth/login` — provisioned staff login.
- `GET /api/v1/admin/verification-queue` — reviewer-only queue; optional `?type=IDENTITY` or `?type=MARITAL_STATUS`.
- `GET /api/v1/admin/verification-cases/:id` — reviewer-only case metadata and audit events.
- `POST /api/v1/admin/verification-cases/:id/review` — reviewer-only, state-machine-validated review action.
- `GET /api/v1/verification/me` and `POST /api/v1/verification` — authenticated member verification case access/submission.

Member access tokens expire after 15 minutes. Refresh tokens are random, stored only as SHA-256 hashes, expire after 30 days and rotate on use. Admin access tokens expire after 15 minutes; staff active status and role are reloaded from the database on each guarded request. The staff web page keeps its token in memory and loses the session on refresh/navigation away.

## Security-critical launch gates

This repository now includes working source implementations for password-based member authentication, mandatory SMTP email verification, refresh-token rotation, email allow/block lists, database-backed auth-route rate limits, staff authentication, a reviewer-only verification queue and a verification state machine. The auth-only deployment mode exposes only health and member authentication endpoints; it does not make the wider product production-ready. Before accepting real members, complete and independently test: production SMTP/email deliverability and domain authentication; production OTP/SMS delivery; KYC and marital-document provider integrations; secure document upload, private object storage, malware scanning and audited short-lived document preview (not yet implemented); payment provider and webhook signature validation; consent and DPDP compliance workflows; grievance operations; abuse detection outside the auth routes; moderation staffing; backup restore drills; penetration testing; incident response; legal review; app-store review; and production observability.

**Never use the local Docker credentials or development environment for production.** No real Aadhaar numbers, identity documents, death certificates, divorce decrees, payment credentials or other sensitive personal data should be placed in development fixtures.

## Product invariants

1. Identity verification and marital-status verification are independent.
2. A user cannot approve their own verification case.
3. Document files are private; public APIs expose status and review outcomes only.
4. Verification badges describe exactly what was checked and do not guarantee a person's conduct.
5. Legally separated is not equivalent to divorced. A legal-status transition requires evidence and human review.
6. Children’s names, images, schools and addresses are not public profile fields.
7. Safety, blocking, reporting, account deletion requests and grievance access are not paywalled.
8. Staff actions involving sensitive data are permission-checked and audit logged.

## API conventions

Base path: `/api/v1`. DTO validation is enabled globally. Authenticated routes use bearer access tokens. Production deployment must use a managed secret store, TLS, private networking for data services and least-privilege service accounts.

## Member profile, discovery, connections and safety API (new source milestone)

All endpoints below require a member bearer access token. They are API source implementations; runtime/build/database verification is still pending.

- `GET /api/v1/profiles/me` — fetch the signed-in member's profile.
- `POST /api/v1/profiles/me` — create/update profile details and date of birth. Server enforces 18+ eligibility; profiles remain hidden by default.
- `POST /api/v1/profiles/me/preferences` — save partner preferences (age range, cities, marital-status preferences, children and lifestyle preferences).
- `POST /api/v1/profiles/me/publish` and `/hide` — explicitly publish or hide a profile.
- `GET /api/v1/profiles/discover` — discover active, published adult profiles; applies saved partner preferences and excludes members blocked in either direction. Public results omit date of birth, private preferences, exact child living arrangements and storage keys.
- `POST /api/v1/interests`, `GET /api/v1/interests?direction=incoming|outgoing`, `PATCH /api/v1/interests/:id` — send and respond to marriage interest. Accepting an interest creates a conversation.
- `GET /api/v1/conversations`, `GET /api/v1/conversations/:id/messages`, `POST /api/v1/conversations/:id/messages` — participant-only message history and sending. Blocking disables message access.
- `POST /api/v1/safety/blocks`, `GET /api/v1/safety/blocks`, `DELETE /api/v1/safety/blocks/:targetUserId` — block management.
- `POST /api/v1/safety/reports` — submit a member safety report; reports are persisted for staff triage.

The messaging implementation currently uses authenticated HTTP APIs and database persistence only. WebSocket delivery, push notifications, attachment moderation, staff report triage screens, abuse throttles and production moderation operations are not yet implemented. Do not treat this milestone as launch approval.
