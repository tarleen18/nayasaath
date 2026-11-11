# Production readiness gates

This checklist is intentionally strict because the platform handles highly sensitive personal and family information.

## Identity, auth and account lifecycle
- [ ] Production OTP provider with resend limits, expiry, replay protection and abuse monitoring.
- [ ] Email verification and account recovery with secure one-time tokens.
- [ ] JWT/session guard, refresh-token rotation, revocation and device/session management.
- [ ] Age eligibility enforcement on the server, with legal review of the age policy.
- [ ] Admin SSO or strong MFA, separate staff identities and least-privilege RBAC.

## Verification and document handling
- [ ] Contract and DPIA/privacy review for each verification vendor.
- [ ] Private object storage, encryption, malware scanning, MIME sniffing and file-size limits.
- [ ] Short-lived signed upload/download URLs; never expose storage keys publicly.
- [ ] Human reviewer training, escalation, appeals, reason codes and separation of duties.
- [ ] Retention schedule and deletion jobs approved by counsel.
- [ ] Do not store Aadhaar biometrics or build an Aadhaar repository. Use a compliant authorised provider and minimised data flow where legally permitted.

## Safety and trust
- [ ] Block/report endpoints enforced at API and WebSocket layers.
- [ ] Abuse controls: rate limits, device risk, duplicate accounts, scam/payment solicitation detection.
- [ ] Grievance officer workflow, published contact route and response SLAs reviewed by counsel.
- [ ] Staff access logs and alerts for unusual document access.
- [ ] Safety escalation and law-enforcement request handling playbooks.

## Privacy and India compliance
- [ ] Map personal-data purposes, lawful basis/consent where applicable, notices and withdrawal paths.
- [ ] DPDP Act and Rules applicability/commencement mapped by counsel at launch date.
- [ ] IT Rules/intermediary applicability assessed for actual product features and operations.
- [ ] Child-safety controls and adult-only onboarding tested.
- [ ] Data principal request workflows: access/correction/erasure/grievance as applicable.
- [ ] Cross-border transfer, subprocessors and data residency assessed.

## Payments and operations
- [ ] Payment gateway hosted checkout, signed webhook validation, idempotency and reconciliation.
- [ ] Refund, cancellation, renewal and consumer disclosure review.
- [ ] Production secrets manager; no secrets in source control or build logs.
- [ ] TLS, WAF, private database network, backup encryption and restore drills.
- [ ] Central logs, metrics, alerting, incident response and on-call ownership.
- [ ] Independent penetration test, dependency scanning and secure code review.
- [ ] Load, failover and disaster-recovery tests.
- [ ] App-store privacy disclosures and review.

## Release policy
No real member onboarding until every critical gate above is assigned to an owner, tested, and signed off. Staging must use synthetic data only.

### Limited private profile persistence

The Render Blueprint can enable `PRIVATE_PROFILE_MODE=true` while leaving `AUTH_ONLY_MODE=true`. This exposes only authenticated owner profile read/save and preference save endpoints. Publishing, discovery, messaging, verification, safety, and admin endpoints remain unavailable. Profile data is stored in the production database, so use synthetic data only until the release gates above, including privacy notice, retention, deletion, and operational access controls, are approved.


## Authentication and verification milestone update

- Member passwords use Argon2id. Refresh credentials are opaque random values, persisted as SHA-256 hashes, rotated on use, and revocable.
- OTP challenge records store keyed hashes, expire after five minutes, allow at most five attempts, and are single-use. OTP request/verify endpoints are authenticated and support email or phone channel selection.
- In local development, no messages are sent; the operator may configure `OTP_DEV_FIXED_CODE` to exercise the flow. Production requests are intentionally rejected until a real email/SMS delivery adapter has been implemented and configured.
- Verification review uses an explicit state machine, immutable event history, audit records, reviewer role checks, self-review protection, and an optimistic concurrency check to prevent two reviewers overwriting each other.
- The staff web dashboard supports sign-in, queue filtering, starting/resuming review, approval, requesting information, and rejection with a reason. It intentionally does not expose document previews before audited private storage is implemented.

### Apply the new schema locally

After setting up PostgreSQL and installing workspace dependencies, run `pnpm --dir apps/api prisma:migrate` and name the migration `otp_challenges`. This adds the OTP challenge table and indexes.
