# Security

Release-gate logging rule: the API startup path emits only a bounded diagnostic
code, never a raw exception that could contain a database URL or provider
detail. The worker logs aggregate operational outcomes without tenant IDs,
message bodies, or credentials. The authenticated app shell waits for a
verified session/workspace and shows a sign-in or setup state otherwise; it
does not render a synthetic user as an authenticated identity. These UI checks
do not replace server-side session, RBAC, and tenant-scoped query enforcement.

## Current controls

No secrets are committed; `.env.example` defines names and non-secret placeholders only. Phase 21 implements validated authentication endpoints, Argon2id password hashing, hashed single-use tokens, revocable database sessions, secure cookie policy, exact-origin CSRF checks, security headers, request-size limits, and baseline abuse limiting. Phase 22 implements reusable tenant/RBAC guards; Phase 23 applies them to the first protected business API, Leads.

## Phase 24/25 tenancy and Conversation boundaries

Organization bootstrap derives the user from the authenticated session and creates membership server-side; it accepts no user, membership, role, or actor claim. Transactional rollback prevents partially owned tenants. Organization/workspace list endpoints reveal only active context available to the signed-in user. Workspace switching is a convenience projection, while every protected request still passes through fresh server-side tenant and permission resolution.

Conversation list, detail, create, and internal-message paths require both organization and workspace selectors, a verified session, current active membership, and the centralized capability guard. Foreign and absent Conversation IDs share `CONVERSATION_NOT_FOUND`. Optional Lead IDs are accepted only after a same-tenant lookup. Message sender membership, direction, sender type, and persisted status are assigned by the server; request bodies cannot submit authoritative identity or tenant fields. No external delivery is attempted, and `SENT` currently means recorded as the operator's internal outbound message, not provider-confirmed delivery.

## Planned requirements

- Move authentication rate-limit state to a shared Redis-backed store before running multiple API replicas, and configure trusted-proxy handling explicitly at deployment.
- Apply the Phase 22 tenant/permission guard and tenant-owned query selectors to every future business API; test real routes against cross-tenant access before release.
- Validate and size-limit HTTP, webhook, queue, file, provider, and AI inputs; encode outputs; return safe errors with correlation IDs.
- Store secrets only in approved secret managers/environment injection; rotate them; never log tokens, credentials, or unnecessary personal data.
- Verify webhook signatures and freshness; use replay protection and idempotency keys.
- Use TLS, secure headers, least-privilege service/database accounts, encryption at rest, backups, dependency scanning, and patch policy.
- Append audit events for authorization, approvals, configuration, sensitive reads, AI actions, and external side effects.

## AI threat controls

Treat enquiry text and retrieved documents as untrusted data, never instructions. Separate system policy from content; allow only narrow typed tools; enforce tenant-scoped retrieval; validate structured output; bound cost/time; preserve evidence and confidence; redact sensitive data where possible; and require human approval for high-risk claims/actions. Model output never directly authorizes a side effect.

The current `/approvals` frontend demonstrates this control boundary with empty states and non-executing decision controls. `/activity` now reads tenant-scoped, append-only events for supported Lead and Conversation mutations. `/settings` identifies connected authentication and Phase 22 RBAC infrastructure while leaving settings, integrations, and destructive operations unavailable. No business route evaluates policy, executes an approval, or stores settings configuration.

## Phase 26 workspace and audit controls

The active workspace stored on a session is a preference, not a claim. The database requires organization and workspace to be stored together and ties the pair to the Workspace composite key. Selection persists only after `TenantContextService` proves current membership and tenant state. Session reads revalidate and clear stale preferences. Browser-supplied organization, workspace, actor, membership, role, and user values remain untrusted.

Activity writers accept verified server context and derive the actor; public clients cannot submit audit actors. Reads bind both tenant IDs. Public update/delete routes do not exist, and database triggers make the table append-only. Public projections omit metadata to avoid accidental disclosure. Audit persistence errors are not swallowed. The current mutation and audit insert are not yet atomic, so external or consequential side effects must wait for the reviewed transactional outbox/audit design.

## Phase 27 provider boundary

Provider configurations are tenant-owned and contain only a public routing reference plus an optional future secret-manager reference; no raw credential column exists. Delivery requests cannot choose provider, tenant, actor, role, user, or membership. The server resolves the conversation and active provider configuration using verified tenant scope. Idempotency uniqueness includes both organization and workspace.

Webhook processing is provider-neutral and requires adapter verification before normalization or persistence. Tenant scope is derived from a unique provider-configuration reference rather than webhook payload claims. Duplicate provider event IDs are ignored within that configuration. The TEST-only verifier accepts a literal test signature solely in the internal test adapter; no public webhook controller or production provider is exposed. Raw provider errors are translated to stable codes and never return credentials, headers, or stack traces.

Retryable failures are identified separately from permanent rejection. Phase 27 does not run a queue or automatic retry loop. A future worker may retry a failed operation at most three times with exponential backoff and jitter, using the same tenant-scoped idempotency key; permanent failures are never retried automatically.

## Security gates

Threat-model each new integration, add abuse and permission tests, review data retention, and verify observability without sensitive leakage. Beta requires cross-tenant, escalation, webhook replay, malicious input, prompt injection, and approval-bypass tests.

## Phase 19 frontend audit

The Phase 19 snapshot contained no browser storage, cookies, network clients, provider SDKs, embedded credentials, or real personal data. Phase 21 deliberately adds one typed authentication network client with `credentials: include`; it does not use localStorage/sessionStorage or expose cookie contents. Password values remain form-local and are not logged. Demo lead and conversation fixtures remain isolated and visibly labelled.

## Phase 20 tenant boundary

The database now enforces the structural ownership chain from organization to workspace to operational records. Tenant-owned tables carry both IDs and use composite foreign keys, including cross-domain references. This prevents mismatched tenant relationships even if future application code supplies an incorrect related ID.

The presence of these IDs does not authorize access. Future authentication middleware must resolve the user, active organization membership, role, and selected workspace; only that server-owned context may become `VerifiedTenantScope`. Controllers must ignore or reject client claims that attempt to choose authoritative organization, workspace, membership, role, or actor values. Services and repositories must scope reads, updates, and deletes by both organization and workspace, including lookups by globally unique resource ID.

Foreign-key deletion is restrictive, not cascading. Status transitions will disable identity and tenant records while preserving related operational history. Activity events are protected by an append-only database trigger. Database credentials remain environment-provided; Docker Compose requires `POSTGRES_PASSWORD` rather than shipping a literal password. Phase 20 adds no credentials, password hashing, sessions, JWT/cookies, RBAC enforcement, row-level security, or public data APIs.

## Phase 21 authentication controls

- Password hashes use Argon2id with 19 MiB memory, two passes, one lane, and a 32-byte output. Missing-user login attempts perform a dummy Argon2 verification to reduce timing differences.
- Verification and password-reset secrets are never stored raw. HMAC-SHA-256 uses `AUTH_TOKEN_PEPPER`, which must be injected and contain at least 32 characters. Verification codes expire after 15 minutes; reset tokens after 30 minutes. Both are single-use and race-safe through conditional transactional consumption.
- The example pepper is rejected at production startup. For local-only development with the non-delivering email adapter, a verification code can be previewed in the initiating browser response only when `NODE_ENV=development` and `APP_ORIGIN` is loopback; the API binds to `127.0.0.1` in that mode. A pending account can receive a local preview on re-registration only after its existing password is verified. No raw code is logged or persisted; the preview must never be exposed via a public proxy. Production and SES responses never include it. Password-reset token preview is intentionally unavailable because recovery must not reveal account existence.
- Session secrets contain no identity or authorization claims. The cookie is HttpOnly, SameSite=Lax, Secure in production, and scoped to the API host without Domain. Only a keyed hash is persisted. Normal sessions last 12 hours; explicitly remembered sessions last 30 days.
- Exact `Origin` validation protects every unsafe HTTP method. CORS permits credentials only from `APP_ORIGIN`. Helmet supplies security headers, and request bodies are limited to 100 KB. This assumes the documented browser-to-API deployment topology; alternate origins require a reviewed change.
- Login, registration, verification, resend, recovery, and reset endpoints use atomic fixed-window counters in PostgreSQL, shared by API replicas. Counter keys are HMAC digests of endpoint plus IP/account context; raw IPs, emails, and tokens are not stored. Authentication returns 503 rather than falling back to process-local limits if PostgreSQL is unavailable. Deploy the additive counter-table migration before the API. At a reverse proxy, client-IP attribution needs an explicitly trusted proxy topology; arbitrary forwarded headers are not trusted.
- Password-recovery responses are identical whether an account exists, including when the email adapter fails; provider errors are logged without recipient or token material. Disabled and suspended users receive the same login failure as invalid credentials. Password reset revokes every existing session.
- The development email adapter suppresses delivery and logs no recipient, code, reset token, or link. Integration tests inject a capturing adapter only inside a disposable test process.

Authentication proves identity, not permission. The client cannot create `VerifiedTenantScope`; `TenantContextService` must verify an active membership, active organization, and active workspace.

## Phase 22 tenant authorization and RBAC

`@RequirePermission` composes the existing session guard with the tenant authorization guard. The browser may send `X-AOP-Organization-Id` and `X-AOP-Workspace-Id` as **selectors only**. The server rejects submitted `userId`, `actorId`, `membershipId`, `role`, `organizationId`, or `workspaceId` claims in guarded request bodies/query strings, and verifies selected IDs against the signed-in user in PostgreSQL. Missing membership, inactive membership/organization/workspace, cross-organization workspace, and insufficient permission fail closed with stable codes and generic messages. No global administrator bypass exists.

The role comes from the current membership database row on each authorization check, never the browser's session projection or settings preview. The exact role-to-permission mapping is in `apps/api/src/authorization/permissions.ts` and summarized below. Permission grants only the named capability; sending a message, executing a workflow, or deciding an approval will still require the owning API's policy and audit controls when implemented.

| Role    | Exact granted capabilities                                                                                                                                                                                                                                                                                                      |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OWNER   | All 24 defined capabilities.                                                                                                                                                                                                                                                                                                    |
| ADMIN   | All defined capabilities except `ORGANIZATION_MANAGE`.                                                                                                                                                                                                                                                                          |
| MANAGER | `ORGANIZATION_READ`, `WORKSPACE_READ`, `MEMBERSHIP_READ`, `LEADS_READ`, `LEADS_CREATE`, `LEADS_UPDATE`, `CONVERSATIONS_READ`, `CONVERSATIONS_SEND`, `FOLLOW_UPS_READ`, `FOLLOW_UPS_MANAGE`, `AI_OPERATIONS_READ`, `WORKFLOWS_READ`, `WORKFLOWS_MANAGE`, `APPROVALS_READ`, `APPROVALS_DECIDE`, `ACTIVITY_READ`, `SETTINGS_READ`. |
| SALES   | `ORGANIZATION_READ`, `WORKSPACE_READ`, `LEADS_READ`, `LEADS_CREATE`, `LEADS_UPDATE`, `CONVERSATIONS_READ`, `CONVERSATIONS_SEND`, `FOLLOW_UPS_READ`, `FOLLOW_UPS_MANAGE`, `AI_OPERATIONS_READ`, `ACTIVITY_READ`.                                                                                                                 |
| VIEWER  | `ORGANIZATION_READ`, `WORKSPACE_READ`, `LEADS_READ`, `CONVERSATIONS_READ`, `FOLLOW_UPS_READ`, `AI_OPERATIONS_READ`, `WORKFLOWS_READ`, `APPROVALS_READ`, `ACTIVITY_READ`, `SETTINGS_READ`.                                                                                                                                       |

The error codes are `UNAUTHENTICATED`, `TENANT_CONTEXT_REQUIRED`, `TENANT_CONTEXT_CLAIM_REJECTED`, `MEMBERSHIP_REQUIRED`, `MEMBERSHIP_INACTIVE`, `ORGANIZATION_INACTIVE`, `WORKSPACE_ACCESS_DENIED`, `WORKSPACE_INACTIVE`, and `PERMISSION_DENIED` (plus Phase 21 `INVALID_SESSION`). They omit internal IDs and Prisma details. Future object lookups must include both organization and workspace IDs alongside the resource ID; a unique ID or frontend-hidden control cannot authorize an object.

Leads, Conversations, Follow-ups, Activity, and the Settings General/Team boundary are connected APIs. There is no membership invitation API, role-change API, or audit emission from authorization decisions. The AppShell renders a signed-out state but frontend visibility never grants access. A signed-in user without a membership cannot obtain tenant authorization. Shared PostgreSQL authentication limits remove the process-local counter dependency; reverse-proxy attribution and hosted operations still need deployment verification.

Follow-up create, completion, and rescheduling derive tenant and actor from the verified server context, check optional Lead/Conversation references in the same workspace, and record activity in the mutation transaction. Settings profile updates derive the workspace from that context; client-submitted organization, workspace, role, user, or membership IDs are not accepted as authority. Organization bootstrap can save an optional profile atomically with initial workspace creation. Settings AI/policy/workflow/notification controls are disabled previews and do not affect authorization or execution.

## Phase 23 Lead boundary

Every Lead endpoint composes cookie-backed session validation, fresh membership/organization/workspace checks, and a typed `LEADS_*` permission. Both tenant IDs are required in list and object predicates. POST assigns tenant and creator membership from verified server context. PATCH cannot change ownership; foreign and missing records share `LEAD_NOT_FOUND`. DTO validation rejects unknown fields, malformed IDs, invalid enum values, oversized text, and unbounded pagination. Sort fields are selected from server constants, not passed into Prisma from the client. The browser's workspace selection is never authority; no role, user, membership, or actor ID is accepted as a claim.

The isolated PostgreSQL 16 Phase 23 test cluster applied migrations and exercised real session cookies, guards, permissions, cross-organization/workspace requests, role changes, revocation, DTOs, and Lead persistence. Tests use disposable `.invalid` identities and clean up their own records. Same-organization workspace access is allowed by the approved organization-membership model; records remain workspace-isolated. Workspace-specific grants are **not** implemented. Lead DELETE and activity-event writes remain deferred pending an approved retention/audit design. The development email adapter and multi-instance rate-limit limitation are unchanged.

## Workflow control boundary

Workflow and approval endpoints require the existing HttpOnly session, a freshly verified active membership/organization/workspace, and centralized `WORKFLOWS_*` or `APPROVALS_*` permissions. Request bodies cannot assert role, user, membership, organization, or workspace identity. Every workflow, policy, execution, approval, decision, outbox, and activity lookup binds both tenant keys. Composite foreign keys make cross-workspace references fail at the database layer too. An approval decision is a single compare-and-set transition with a unique decision row; it is not an execution grant for any action other than the no-op dry run. Client visibility is never authority.

The workflow worker accepts only a no-op dry run or an approved internal notification. It does not accept arbitrary code, customer messages, AI output, external network calls, or customer-record mutations as workflow steps. The internal notification is restricted to the active initiating membership and active verified tenant; it is not external delivery. A 24-hour review expiry sweep cancels unreviewed executions. Existing outbox leases, tenant-composite foreign keys, execution idempotency, and a unique notification/execution constraint prevent duplicate local completion. New executions pin an immutable definition version, including action and policy; pre-migration executions cannot claim an exact historical version. Stale `RUNNING` reconciliation is audited and fails closed on inconsistent state. `pnpm dev` starts a local worker, but production still needs independent worker supervision, health monitoring, and crash/failover testing. API readiness does not imply worker readiness.

## Phase 28 reliability and secret boundaries

Outbound delivery requests never perform a provider side effect in the request transaction. The API transaction persists the tenant-scoped message, audit event, and outbox intent together. The worker owns provider invocation and requires the same organization/workspace scope on every message/configuration lookup. A database lock token prevents two workers from completing the same claim; only a provider with a real idempotency guarantee can protect the unavoidable crash window between remote acceptance and local commit. Other providers require uncertain-outcome reconciliation instead of automatic resend.

Retries are allowed only for explicitly retryable failures and are capped at three attempts. Failure codes are stable application codes; payloads, message content, raw exceptions, credentials, and provider secrets are not written to worker logs. Stale leases are reclaimed after five minutes. Provider configurations may contain only validated opaque `secret://` references. Phase 28 does not resolve those references and does not claim a production secret manager is connected.

The outbox is durable but is not an authorization source. Entries can only be created by authenticated, authorized application services inside their verified tenant transaction. Provider webhook signature verification still occurs before normalization, persistence, message mutation, or audit emission.

Stale exhausted claims are terminalized without an extra provider invocation. For adapters without server-side idempotency, an ambiguous send or reclaimed submitted attempt is marked `DELIVERY_OUTCOME_UNKNOWN` rather than automatically retried. This favors avoiding duplicate customer contact over pretending delivery certainty; operational reconciliation remains required. A local timeout cannot guarantee a remote request was cancelled.

The opt-in SES adapter sends authentication verification/recovery mail only. It uses AWS credential-chain resolution and a configured, verified sender; no access key is stored in source or Prisma. It sends plain text and never logs raw tokens or full messages. Live SES delivery, IAM policy, regional identity verification, sandbox/production access, bounce handling, and deployment secrets must be validated in a controlled AWS staging environment before production use. Authentication rate limiting is now shared through PostgreSQL rather than local process memory.

Production startup refuses the development email adapter and requires an HTTPS `APP_ORIGIN`; this prevents a deployment that could not deliver verification mail or would set secure cookies on an insecure public origin. These checks do not prove SES credentials, deliverability, or correct TLS/proxy configuration. Same-site web/API domains are required by the current host-only cookie and SameSite=Lax design unless that design is separately reviewed.
