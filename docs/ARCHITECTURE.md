# Architecture

## Current implementation

A pnpm monorepo contains `apps/web` (Next.js with Pages 01–18), `apps/api` (NestJS authentication, tenancy, Leads, Conversations, Follow-ups, Activity, Settings profile, communication, and outbox modules), shared packages, Prisma/PostgreSQL migrations, Docker Compose for PostgreSQL and Redis, tests, and CI. Authentication, onboarding bootstrap/profile, Leads, Conversations, Follow-ups, Activity, and Settings General/Team have backend boundaries. AI Operations, workflow execution, approvals, and the remaining Settings sections are not connected. Passwords are transmitted only to the configured API, converted to Argon2id hashes, and never returned or stored by the browser.

The current application shell separates typed navigation and explicit demo context from presentation components. It provides reusable desktop and drawer navigation, header controls, workspace/user presentation, linked breadcrumbs, status messaging, and a main-content boundary. `/dashboard`, `/leads`, `/inbox`, `/follow-ups`, `/ai-operations`, `/workflows`, `/approvals`, `/activity`, `/settings`, `/leads/[leadId]`, and `/inbox/[conversationId]` are available. Signed-in Dashboard Lead/Conversation/Follow-up totals, Leads list and status aggregates, Inbox, Follow-ups, Activity, and Settings General/Team consume tenant-scoped APIs; an empty workspace honestly shows zero records. AI Operations, Workflows, Approvals, and non-General Settings remain architecture previews without execution or persistence. Existing `demo-*` detail routes are isolated synthetic fixtures, separate from authenticated records.

Activity is a historical projection boundary, not the authority for business mutations. Settings is a configuration intent boundary, not authorization or execution. Future APIs can replace the empty collections and local form state without coupling domain records to presentation components.

## Phase 19 readiness audit

Frontend domain types are read models and UI contracts, not persistence entities or authorization boundaries. Workflow definitions and workflow execution summaries are separate. Approval requests, proposals, human decisions, and execution results are separate contracts. Cross-domain fields reference the owning domain identity where possible, and internal navigation uses framework-native client transitions. Shared packages expose explicit build artifacts, but remain intentionally small until backend modules have real consumers.

The future API must return verified organization/workspace context with every tenant-owned resource projection. The browser must never supply authoritative tenant scope, role, permission, actor, policy result, or execution status. Adding required tenant ownership to database/API contracts will not require UI composition changes because current components consume resource projections and receive shell context separately.

## Phase 20 persistence foundation

The Prisma schema and versioned `tenant_persistence_foundation` migration now implement the ownership chain:

```text
User ──< Membership >── Organization ──< Workspace ──< Business entity
```

A user can belong to multiple organizations. A membership assigns one approved V1 role within one organization. An organization can own multiple workspaces. Lead, Conversation, FollowUp, AI Operation, Workflow, Approval Request, Activity Event, and Workspace Settings use a database-enforced `(organizationId, workspaceId)` relationship to Workspace. Related operational IDs are protected by tenant-composite foreign keys; a globally unique resource ID remains an identifier, never authorization.

The API now exposes a reusable `DatabaseModule` and lifecycle-managed `PrismaService`. `VerifiedTenantScope` is a branded server contract with no public constructor in this phase. Authentication/authorization code added later must create it from a verified user membership and selected workspace. Controllers must not construct it from request bodies or arbitrary route parameters.

Feature-specific persistence, repositories, business controllers, authorization, policy evaluation, execution, and external side effects remain unimplemented.

## Phase 21 authentication foundation

`AuthModule` owns registration, login, logout, session retrieval, email verification, verification resend, password recovery, and password reset. DTOs are allow-listed and validated at the HTTP boundary. `PasswordService` uses Argon2id. `AuthTokenService` generates cryptographically random secrets and stores only HMAC-SHA-256 representations. Verification codes are paired with a high-entropy HttpOnly context cookie so a six-digit code alone cannot select an account.

Opaque session secrets are issued in HttpOnly, SameSite=Lax cookies. Production cookies are Secure and omit Domain. The database stores only a keyed hash, expiry, revocation time, and optional last-used time. Logout revokes the current session; password reset revokes every session for that user; suspended, disabled, unverified, expired, and revoked sessions are rejected on every authenticated request.

The session projection may list active memberships and active workspaces, but it does not select or authorize a tenant. `TenantContextService` separately proves active membership, organization state, and workspace ownership before constructing `VerifiedTenantScope`. The Phase 22 guard described below adds role-permission enforcement for future tenant-owned routes.

## Phase 22 authorization foundation

Authentication still identifies the user; it does not grant a workspace operation. Tenant-owned controllers import `AuthorizationModule` and use `@RequirePermission(Permissions.LEADS_READ)`, now exercised by the Leads API. The decorator binds `SessionAuthGuard` before `TenantAuthorizationGuard`; missing permission metadata is denied. `@CurrentTenant()` then exposes the guarded `VerifiedTenantScope` to the handler.

The browser selects context with `X-AOP-Organization-Id` and `X-AOP-Workspace-Id` UUID headers. Both are untrusted selectors. The guard rejects identity/role/tenant claims in bodies or query strings, then `TenantContextService` re-reads the user's membership and role, organization lifecycle, and workspace ownership/lifecycle from PostgreSQL. An inactive or foreign context never produces a scope. The resulting scope contains `userId`, `membershipId`, `organizationId`, `workspaceId`, and current `role`; only the resolver constructs this branded server value. No selection is persisted in the session, and no authorization decision is cached across requests.

Repository operations must require that scope and filter by both `organizationId` **and** `workspaceId`, even when a resource ID is globally unique. `tenantOwnedWhere(scope, id)` is used by Lead detail/update; composite database foreign keys remain a second ownership barrier. Permission checks do not replace policy evaluation or human approval for consequential AI/workflow actions. Registration currently creates identity but not a membership, so a separately reviewed organization/workspace bootstrap is required before new accounts can access the Leads API. Frontend settings labels and navigation are not authorization controls.

## Phase 23 PostgreSQL proof and Leads V1

The first business module has a thin `LeadsController`, `LeadsService`, allow-listed DTOs, and shared response contracts. GET list/detail/status summary, POST create, and PATCH update each require the existing session, freshly verified tenant context, and the matching centralized Lead permission. List and summary predicates include both tenant keys; detail and update also bind the lead ID through `tenantOwnedWhere`. The summary groups existing rows by status and returns actual zeroes for absent states; no demo metric is substituted on failure. Foreign IDs return the same safe not-found response as absent IDs. A creator membership is recorded from server context, never the request body. Search, status/priority/source filters, static sort choices, and page/limit are bounded at the HTTP boundary.

The versioned `lead_v1` migration adds operational fields and a tenant-composite creator relationship. It aborts before changes if pre-existing Phase 20 ownership-only Lead rows require a reviewed backfill; it invents no names. Hard DELETE is deliberately absent because Leads may be referenced by conversations, follow-ups, and durable activity. A future archive/retention design must precede deletion. No audit event writer is implemented in this phase.

The session projection now includes active workspace names for selection convenience. For multiple organizations/workspaces the browser must explicitly select one; it sends IDs only as selectors. The server rechecks membership, role, organization/workspace state, and permission on every request. V1 organization membership authorizes all active workspaces in that organization; there is no workspace-specific membership or grant. Data queries still isolate each selected workspace. The AppShell mock header remains labelled as demo and does not authorize the Leads page. The synthetic demo lead route is separate from real UUID routes.

Email delivery is an injected adapter. The current development adapter intentionally delivers nothing and logs neither recipient nor secret. A provider adapter is required before verification and recovery emails work outside integration tests.

## Phase 24 tenant bootstrap and workspace selection

`POST /organizations` creates an organization, active OWNER membership, and first workspace in one Prisma transaction. A failed step rolls back the entire bootstrap. Authenticated organization listing returns only active memberships, organizations, and workspaces. OWNER is the only role permitted to add another workspace in this phase. Workspace selection is browser-memory UI state derived from the current session projection; it is not persisted and it never grants access. Every guarded request still re-resolves membership, lifecycle state, role, and workspace ownership.

## Phase 25 Conversations V1

`ConversationsController` exposes tenant-scoped list, detail, create, and internal-message creation. Controllers require the existing session, verified tenant context, and centralized `CONVERSATIONS_READ` or `CONVERSATIONS_SEND` capability. Services carry both tenant keys in every record lookup and validate an optional Lead relationship inside the same tenant. Message sender identity is derived from the verified membership. The database migration adds channel, status, attention, participant, activity, unread, creator, and tenant-composite message relationships; it refuses to invent required values for pre-existing ownership-only rows.

The web Inbox consumes these APIs with the HttpOnly session and explicit tenant selectors. It stores no auth secret and makes no authorization decision. Message creation records an internal outbound human message with no delivery side effect. There is no provider, inbound webhook, realtime transport, AI output, workflow trigger, or audit-event writer in this phase.

## Phase 26 persistent workspace context and Activity

The session stores `activeOrganizationId` and `activeWorkspaceId` as one nullable, database-constrained pair. `PATCH /organizations/active-workspace` accepts those IDs only as selectors, resolves a fresh `VerifiedTenantScope`, and then stores the pair. Session projection revalidates the preference against current active membership, organization, and workspace state. A stale, inactive, deleted, inaccessible, or mismatched pair is cleared rather than used. The preference improves continuity across refreshes; it is never authorization evidence.

`ActivityEventService` is the single audit writer. Supported Lead and Conversation mutations derive tenant and user actor information from verified server context and append structured events. `GET /activity` requires `ACTIVITY_READ`, tenant scope, bounded pagination, allow-listed sorting, and safe enum filters; metadata is not exposed by the public read contract. Database triggers continue to reject Activity updates and deletes. Current writes fail the request if audit persistence fails, but the business mutation and audit insert are not yet one database transaction; transactional audit/outbox design remains required before consequential external effects.

## Phase 27 communication provider foundation

Conversation code does not import a vendor SDK. `CommunicationDeliveryService` resolves an active tenant-owned `ProviderConfiguration`, then delegates to `ProviderRegistryService` and a typed `CommunicationProviderAdapter`. Channel and provider are separate enums, permitting multiple providers per channel later. The only registered adapter is `TestCommunicationProvider`: it is deterministic, explicitly test-only, and performs no network operation.

Internal message recording remains separate from delivery. Provider-bound messages move `QUEUED → SUBMITTED → PROVIDER_ACCEPTED`; only a verified normalized webhook may advance them to `DELIVERED` or `READ`. Tenant-scoped idempotency keys prevent duplicate outbound records. Webhook receipts use provider-configuration plus provider-event identity for duplicate suppression and resolve tenant ownership from the server-owned provider configuration, not payload tenant claims. The inbound conversation/message ingestion pipeline is intentionally not implemented.

## Planned V1 shape

## Delivery reliability and SES authentication-email boundary

The outbox worker reports aggregate queue health without customer payloads. Its database claim can recover a stale processing lease, but a claim already at the three-attempt ceiling is terminalized without another provider call. A submitted final attempt is marked uncertain, even for an idempotent adapter, because remote acceptance is not proved. Provider invocations have a bounded timeout and receive a cancellation signal. If a provider cannot deduplicate a send and an attempt has an ambiguous outcome, the worker records `DELIVERY_OUTCOME_UNKNOWN`, leaves the message submitted, and stops automatic retries. An operator must reconcile that result before any resend. Database claims and lock tokens prevent concurrent local completion; they cannot by themselves prove whether a remote provider accepted an interrupted request.

`SesAuthEmailService` is a separate adapter for verification and password-reset mail. It is enabled only by configuration and uses the AWS SDK credential chain, not database provider configurations or the conversation outbox. It does not make the communication channel live. `/health/ready` proves PostgreSQL connectivity only; worker queue diagnostics are logged as aggregate counts and age.

Use a modular monolith with separately runnable web, API, and eventually worker processes. Domain modules own contracts and persistence access: identity, tenancy, authorization, leads, ingestion, AI, approvals, messaging, workflows, knowledge, audit, and analytics. PostgreSQL is the source of truth; Redis/BullMQ transports background work but does not own business state.

Request path: browser/provider → API boundary → authentication/webhook verification → tenant context → validation → application service → transaction/outbox → database. Async path: outbox dispatcher → queue → idempotent worker → provider/AI adapter → persisted result/event.

## Key boundaries

- Web never receives secrets or connects directly to the database.
- Controllers translate protocols; application services enforce use cases; repositories enforce tenant scope.
- LLM and email vendors sit behind typed adapters.
- Schemas validate all external input and AI output.
- Side effects require idempotency keys and durable state transitions.
- Transactions protect local invariants; an outbox connects database changes to queues.

## Data and tenancy

Every business-owned row carries organization/workspace ownership. Tenant identity comes from verified server context, never a client-selected filter alone. Composite keys, foreign keys, and indexes include tenant identifiers. Future repository methods must require `VerifiedTenantScope` and include both values in every unique lookup and mutation. PostgreSQL row-level security may later be added as defense in depth, but is not a substitute for application authorization.

## Workflow reliability

Workflow instances and steps are persisted with version, state, attempt, timestamps, correlation ID, and next-run time. Workers claim jobs safely, record completion before acknowledging, use bounded retries/dead-letter handling, and reconcile stalled work. Reply processing and follow-up cancellation use locking/transactions to close races.

## Deployment evolution

Development uses Docker dependencies and local processes. Staging/production package the web, API, and worker as containers while retaining one codebase and database. Split services only when measured scaling, ownership, isolation, or reliability needs justify the operational cost.

## Workflow → policy → approval → dry-run foundation

The existing `Workflow`, `ApprovalRequest`, `OutboxEvent`, and append-only `ActivityEvent` tables were extended rather than replaced. New tenant-composite foreign keys bind Policy, PolicyEvaluation, WorkflowExecution, ApprovalDecision, and ExecutionStep to their workspace and source records. A workflow definition is distinct from each execution. One versioned policy per definition is evaluated and snapshotted for each request. Approval decisions reference an actual membership in the same organization. The server reads that membership afresh through the existing guard before permitting a decision.

The only active trigger is `MANUAL`. The two bounded actions are `DRY_RUN_LOG` and `INTERNAL_NOTIFICATION`; the latter persists a notification for the initiating active membership after approval, without external delivery. Application transactions commit policy outcomes, approval requests or outbox intents, and Activity evidence together. Each new execution pins an immutable tenant-owned definition version; policy or draft/paused definition changes create another version. Pre-migration executions remain marked unpinned rather than being given false historical provenance. The worker routes both event types through the existing outbox, lock token, and execution compare-and-set. Execution idempotency is unique within organization/workspace; notification uniqueness is per execution. Pending approvals have a 24-hour expiry. Stale `RUNNING` executions are reconciled against step/outbox state before any replay; transient worker failures have bounded retry. External effects, AI providers, arbitrary step graphs, scheduled triggers, and production crash/failover guarantees remain outside this slice. `pnpm dev` now starts a locally supervised worker alongside web/API, while production must supervise the worker separately.

## Phase 28 transactional reliability foundation

Supported Lead and Conversation writes now place the domain mutation and Activity insert in one Prisma transaction. Outbound message creation similarly writes the QUEUED message, `MESSAGE_QUEUED` Activity event, and `OutboxEvent` in one transaction. The provider call is deliberately outside that transaction: a separately runnable worker claims due rows with `FOR UPDATE SKIP LOCKED`, advances the message lifecycle, invokes the provider-neutral adapter with the persisted idempotency key, and commits the provider result, Activity event, and outbox completion atomically.

Delivery is at-least-once. Provider adapters must honor the supplied idempotency key because a worker may crash after provider acceptance but before the database commit. Processing leases older than five minutes can be reclaimed; a message already in `SUBMITTED` is safely resubmitted with the same key without duplicating the submission Activity event. Retryable failures use bounded delays of 30 seconds, 2 minutes, and 10 minutes and stop after three attempts. Permanent failures never retry automatically.

PostgreSQL is the queue source of truth for V1. This avoids adding Redis/BullMQ before throughput requires it while preserving a clean outbox boundary. The worker is an independent Nest application context and can be deployed separately from the API. Provider configuration stores only opaque `secret://` references; actual secret resolution remains an unimplemented infrastructure boundary.

Worker process liveness is recorded independently of outbox events in `worker_heartbeats`. `/health/worker` fails when all worker heartbeats are stale or a poll exceeds the stall threshold; `/health/ready` remains database-only. The worker emits aggregate queue, retry, failure, and execution snapshots in structured stdout logs. See [Worker operations](WORKER-OPERATIONS.md) for single/multi-host supervision and its at-least-once limitations. These telemetry records are not business audit events and do not alter tenant-scoped workflow or outbox execution semantics.

The Activity API is the existing append-only, tenant-scoped audit read boundary. Its bounded list query supports event category, actor, action/summary search, UTC date range, sort, pagination, and an optional workflow ID. The workflow UI links to this filtered record and displays persisted policy/step status. The Activity UI does not claim export, an aggregate metrics endpoint, or coverage of operations that are still conceptual. Visible approval/workflow/notification/follow-up/dashboard screens use bounded polling of their existing authenticated APIs; this is not a separate event bus or push channel.
