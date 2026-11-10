# Build roadmap

## Milestone 0 — repository and domain foundation
- Monorepo, web and mobile shells, API bootstrap, PostgreSQL/Redis local infrastructure.
- Core data model for accounts, profiles, preferences, verification, messaging, reports, consent, subscriptions and audit records.
- Verification state-transition service and production launch gates.

## Milestone 1 — secure identity and account lifecycle
- Implement registration, OTP provider adapter, email verification, password/passkey flow, access/refresh sessions, age eligibility and account recovery.
- Implement admin identity, MFA, RBAC and audited admin access.

## Milestone 2 — profiles and consent
- Profile CRUD, partner preferences, photo upload/moderation, consent ledger, privacy settings and account deletion request lifecycle.

## Milestone 3 — verification operations
- KYC provider adapter, private uploads, document validation, reviewer queue, review actions, appeals, retention/deletion automation.

## Milestone 4 — discovery and matchmaking
- Explainable filters, compatibility scoring, recommendations, shortlist and interest workflow.

## Milestone 5 — safe communication
- Mutual-consent conversations, WebSocket gateway, block/report enforcement, scam controls and notification preferences.

## Milestone 6 — payments and launch operations
- Payment provider integration, webhook idempotency, subscriptions, refunds, support/grievance workflows, monitoring and production deployment.

Every milestone includes automated tests, security review and acceptance criteria before release.
