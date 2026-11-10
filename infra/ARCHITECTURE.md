# Architecture decisions

## Deployment topology

- Next.js web client and Expo mobile client call a versioned NestJS API.
- NestJS owns business rules; clients never make verification, subscription or moderation decisions.
- PostgreSQL is the system of record. Redis is used for rate limits, queues and ephemeral coordination, not as the source of truth.
- Private object storage stores identity evidence and member photos. Separate buckets/policies and encryption keys should be used for sensitive evidence and ordinary media.
- Background workers process email/SMS notifications, image moderation, retention/deletion tasks and provider webhooks.

## Trust boundaries

1. Public clients are untrusted. Validate every input server-side.
2. API services use least-privilege database and storage identities.
3. Admin tools use separate authentication, MFA and role-specific authorization.
4. Verification provider callbacks require signature validation, replay protection and idempotency.
5. Private files are delivered only after authorization, via short-lived signed URLs.

## Matching design

The first matching release should use explainable hard constraints and weighted preference compatibility. Do not use marital history, widowhood, divorce, disability, caste or income as a hidden quality score. Members control explicit preferences; the product should explain why a profile is recommended and allow preference edits. Sensitive attributes must not be inferred.

## Status model

`Profile.maritalStatus` is the member's declared status. `VerificationCase` stores the independent review state and the status claimed at submission. Public profile responses should expose a narrowly defined verification label only after approval; never expose documents, reviewer notes or internal evidence.
