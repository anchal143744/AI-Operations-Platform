# API

## Current

`GET /health` is liveness. `GET /health/ready` performs a bounded database readiness check and returns a safe unavailable response when PostgreSQL cannot be reached; it does not certify external provider availability.

`GET /leads/summary` requires the existing session, verified organization/workspace selectors, and `LEADS_READ`. It returns database-derived totals for each Lead status, scoped by both tenant keys. A new workspace returns zeroes; API errors are not represented as zeroes in the web UI.

`GET /follow-ups`, `GET /follow-ups/summary`, `POST /follow-ups`, `PATCH /follow-ups/:id/complete`, and `PATCH /follow-ups/:id/reschedule` use the verified session and `(organizationId, workspaceId)` scope. Reads require `FOLLOW_UPS_READ`; mutations require `FOLLOW_UPS_MANAGE`. Optional Lead/Conversation references are independently checked in that same scope. Mutations and activity records share a transaction. This is manual follow-up management, not a scheduler, reminder sender, or automation engine.

`GET /settings/general` and `PATCH /settings/general` read/update the workspace profile with `SETTINGS_READ`/`SETTINGS_MANAGE`. `GET /settings/team` reads organization memberships with `MEMBERSHIP_READ`; inviting or changing roles is not implemented. Organization bootstrap may include profile fields, saved atomically with the new workspace. Other Settings panels do not send configuration to the API.

## Planned conventions

Expose versioned HTTP endpoints with JSON contracts, strict request/response schemas, stable error codes, correlation IDs, pagination, filtering, idempotency keys for side effects, and OpenAPI generated from authoritative contracts. Authentication, tenant context, permission checks, and audit hooks are mandatory at server boundaries.

Provider webhooks use dedicated endpoints with signature verification, raw-body support where required, replay windows, persisted receipt IDs, fast acknowledgement, and asynchronous processing. Internal queue payloads are versioned and validated like public input.

No planned route is claimed as available until its module, authorization, integration tests, and documentation ship together.
