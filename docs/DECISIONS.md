# Architecture Decisions

## ADR-001: Modular monolith

Accepted. Keep one codebase and database with explicit domain modules; split services only for demonstrated operational need. This reduces distributed-system risk while preserving boundaries.

## ADR-002: PostgreSQL source of truth and Redis/BullMQ transport

Accepted. Durable business/workflow state lives in PostgreSQL. Redis accelerates queues and waits but cannot be the only record of an important action.

## ADR-003: Multi-tenancy from first domain migration

Accepted. Tenant ownership is explicit in schema and repository contracts, resolved from verified server context, and guarded by automated cross-tenant tests.

## ADR-004: Structured, constrained AI

Accepted. Model output is untrusted, schema-validated advice with provenance and uncertainty. Deterministic policies and human approval authorize consequential side effects.

## ADR-005: Code/config workflows before a visual builder

Accepted for V1. Versioned persisted definitions provide determinism, recovery, reviewability, and faster validation of the core workflow.

## ADR-006: Provider abstraction at integration boundaries

Accepted. Email and LLM providers implement typed adapters, while domain states remain vendor-neutral. Avoid premature generic frameworks beyond actual V1 needs.

## ADR-007: Shared operational priority scale

Accepted. Leads and follow-ups use the same `LOW`, `MEDIUM`, `HIGH`, and `URGENT` urgency semantics. The follow-up domain therefore aliases the centralized `LeadPriority` type and labels instead of maintaining a duplicate scale. This decision can be revisited only if real follow-up behavior demonstrates materially different priority semantics.

## ADR-008: AI proposals are not workflow authorization

Accepted. The frontend models AI operations as proposed work with source context and an explicit human-review flag. Workflow definitions model controlled triggers and steps separately. A future policy result and required approval must authorize consequential execution; an AI recommendation alone can never represent an executed action. The current pages visualize this boundary but implement none of its backend behavior.

## ADR-009: Approval requests reference operational context

Accepted. An approval request carries a typed source reference to an existing AI operation, workflow, lead, conversation, or follow-up. It does not duplicate those domain records. Future approval decisions, policy results, reviewer identity, and execution state must be persisted and authorized by their owning backend services; the current frontend keeps the collection empty and exposes no mutation path.

## ADR-010: Activity is a cross-domain historical projection

Accepted. Activity events reference existing AI operation, approval, workflow, lead, conversation, and follow-up identities instead of duplicating their records. The activity workspace is read-oriented history; it never authorizes or executes a business mutation. Durable audit storage, retention, integrity, and access rules remain backend responsibilities.

## ADR-011: Settings expresses configuration intent, not authority

Accepted. Workspace settings use typed frontend contracts and in-memory preview state. AI, approval, workflow, integration, notification, role, and security controls cannot grant runtime permissions or persist configuration. Future backend services must validate every setting, enforce tenant and role boundaries, protect secrets, version consequential policy changes, and emit audit events.

## ADR-012: Definitions, decisions, executions, and history are separate contracts

Accepted. Workflow definitions do not carry run statistics or failure state. Approval requests do not embed reviewer decisions or execution results. AI proposals, policy results, human decisions, execution outcomes, and append-only activity records remain distinct so the backend can authorize, retry, and audit each transition independently.

## ADR-013: Frontend resource models are projections, not tenant authority

Accepted. Current UI models shape frontend projections and may reference related resource IDs, but they do not establish organization ownership or permissions. Future database entities and API DTOs must carry required organization/workspace scope resolved from verified server context. Client-provided scope is never authoritative.

## ADR-014: V1 access role vocabulary

Accepted. The planned V1 access roles are `OWNER`, `ADMIN`, `MANAGER`, `SALES`, and `VIEWER`, matching the product roadmap. Onboarding business-function choices remain a separate vocabulary and do not grant permissions.

## ADR-015: Tenant identity is composite and server-owned

Accepted. Every tenant business table stores `organizationId` and `workspaceId`, with a composite foreign key proving that the workspace belongs to the organization. Cross-domain references include the same scope. A resource ID alone can locate a row but can never authorize it. Future application services require `VerifiedTenantScope` resolved from authenticated membership; request bodies and route parameters are not authoritative tenant context.

## ADR-016: Restrictive deletion and durable activity

Accepted. User-membership, organization-membership, organization-workspace, workspace-business, and operational cross-references use restrictive deletion. Disabling and status transitions are preferred to cascade deletion. Activity events are append-only and protected against update/delete by a database trigger; retention changes require a reviewed migration.

## ADR-017: Membership uniqueness represents a lifecycle

Accepted. `(userId, organizationId)` is unique across all membership statuses. This stronger invariant prevents duplicate active records and ambiguous role derivation. Invitation, activation, suspension, and revocation update one membership lifecycle record; historical changes will be represented in durable activity/audit records.

## ADR-018: Opaque server-side sessions instead of JWT authorization claims

Accepted. Browsers receive a cryptographically random opaque cookie; PostgreSQL stores only its keyed hash and lifecycle timestamps. Sessions contain no role, workspace, or permission claims and are revalidated against current user state. Logout and password reset can revoke them immediately. JWT infrastructure is not justified for the current same-product web/API topology.

## ADR-019: Argon2id and keyed single-use authentication tokens

Accepted. Passwords use Argon2id through the prebuilt `@node-rs/argon2` runtime because the initial native-build package was rejected by pnpm supply-chain policy. Verification/reset secrets use HMAC-SHA-256 with an injected pepper, expiry, conditional one-time consumption, and restrictive user relationships. Raw secrets exist only long enough to set a cookie or hand them to the email adapter.

## ADR-020: Exact-origin CSRF defense and bounded local rate limiting

Accepted for the single-instance foundation. Unsafe HTTP methods require an exact `APP_ORIGIN`; CORS permits that origin with credentials, and cookies are HttpOnly/SameSite. Authentication routes use bounded fixed-window per-IP counters. Before horizontal scaling, counters must move behind the existing Redis boundary and deployment must configure trusted proxy handling. Neither control is an authorization substitute.

## ADR-021: Authentication and tenant authorization remain separate

Accepted. A valid session exposes identity plus a read-only projection of active memberships/workspaces. It does not select a tenant or grant a business permission. `TenantContextService` rechecks persistence before constructing `VerifiedTenantScope`; Phase 22 adds centralized RBAC guard infrastructure without adding business APIs.

## ADR-022: Static server-side V1 capability matrix

Accepted. The five Phase 20 `MembershipRole` values are the only organization roles. `apps/api/src/authorization/permissions.ts` owns a typed 24-capability vocabulary and one deterministic role mapping; there is no Role table, global superuser, or frontend-authoritative permission map. Owner receives all capabilities, Admin all except organization management, Manager operational management and approval decisions without tenant administration, Sales lead/conversation/follow-up operation without administration or approval, and Viewer read-only access. The exact lists are recorded in `docs/SECURITY.md`. A capability is necessary but not sufficient for future policy-governed side effects.

## ADR-023: Explicit, verified workspace selection per request

Accepted. Future business requests provide `X-AOP-Organization-Id` and `X-AOP-Workspace-Id` UUID headers as untrusted selectors. The session proves user identity. Tenant resolution re-reads membership role and state, organization state, and workspace ownership/state on every guarded request, then issues a branded server-only scope. The authorization guard rejects top-level body/query authority claims and does not use stale session/workspace-switcher role projections. This avoids mutable workspace state in a cookie or session and supports users in multiple organizations. Resource repositories must bind both tenant IDs; future controller APIs must import and apply this guard explicitly.

## ADR-024: Leads are the first guarded business API

Accepted. Lead list/detail/create/update use the Phase 22 session, tenant resolver, and capability guards; Prisma operations bind both organization and workspace. A real PostgreSQL integration suite is the release gate for this first use of authorization infrastructure. Lead V1 adds only structured contact/operational fields and server-derived creator membership. The migration stops if ownership-only rows exist rather than fabricating a required name.

## ADR-025: Defer destructive Lead deletion and workspace-specific grants

Accepted. Hard DELETE is excluded from Leads V1 despite a reserved `LEADS_DELETE` permission because restrictive cross-domain references and future audit retention require an explicit archive/retention policy. The V1 organization membership grants access to all active workspaces within its organization; a workspace selector is still verified and every query remains workspace-scoped. Per-workspace grants would require a separately reviewed model change. No Lead audit-event writer is added until event semantics and retention are defined.

## ADR-026: Transactional first-tenant bootstrap

Accepted. A verified user creates the organization, active OWNER membership, and initial workspace in one database transaction. The API derives identity and role; the browser supplies names/slugs only. Failure rolls back all three records. V1 organization membership continues to grant access to all active workspaces in that organization, while every business query remains scoped to the selected workspace.

## ADR-027: Server-persisted workspace preference remains non-authoritative

Superseded in Phase 26. The application shell still sends explicit organization/workspace selectors, but a successfully verified pair is now persisted on the opaque server-side Session and returned in its projection. A composite foreign key prevents mismatched pairs. Session reads revalidate current membership and tenant state and clear stale preferences. No tenant authority is stored in browser storage or cookie contents, and every guarded request still resolves fresh authorization context.

## ADR-028: Conversation messages are persisted before provider integration

Accepted. Conversation and Message records establish the tenant-safe operational data model and allow an internal outbound human message to be recorded. No communication provider is called and no delivery guarantee is represented. Provider delivery state, inbound ingestion, idempotency, retries, realtime updates, AI drafting, workflow triggers, and audit emission require separately reviewed phases.

## ADR-029: One append-only Activity writer and conservative failure handling

Accepted. `ActivityEventService` derives tenant and actor identity from verified server context and is the only application writer. Public reads are bounded and tenant-scoped; metadata is withheld. Database triggers reject updates and deletes. Supported mutation requests fail if audit persistence fails rather than silently claiming audited success. The mutation and audit insert are not yet atomic, so consequential external side effects require a later transactional audit/outbox decision.

## ADR-030: Provider-neutral communication with a TEST-only adapter

Accepted. Channel and provider are separate. Conversation domain code never calls a vendor SDK; delivery resolves a tenant-owned provider configuration and a registry-approved adapter. Phase 27 registers only `TEST`, stores no raw provider secrets, and makes no network calls. Unknown providers/channels fail closed without fallback.

## Phase 28: PostgreSQL transactional outbox before a distributed queue

Accepted. The database transaction owns business state, Activity, and the delivery intent. A separate worker claims outbox rows with `FOR UPDATE SKIP LOCKED` and invokes provider adapters outside the database transaction. Delivery is at-least-once and every adapter receives a stable tenant-scoped idempotency key. Retryable failures are bounded to three attempts (30 seconds, 2 minutes, 10 minutes); permanent failures stop immediately. Five-minute stale leases are recoverable. Redis/BullMQ is deferred until measured scale or operational needs justify it.

## Phase 28: provider configurations contain references, not secrets

Accepted. Provider configuration may persist a validated opaque `secret://` reference, never a raw API key, token, password, or provider credential. Resolution is a replaceable infrastructure boundary and is intentionally unavailable until a managed secret store is selected. Worker logs and audit summaries exclude message bodies, tokens, secret references, and provider payloads.

## ADR-031: Delivery lifecycle, idempotency, and webhook trust

Accepted. Internal message creation is not delivery. Provider-bound state is monotonic and validated: queue, submission, provider acceptance, verified delivery, then read; terminal states cannot return to queued except a documented failed-operation retry. Outbound idempotency is unique per organization/workspace. Webhook identity is unique per provider configuration and must be verified and normalized before domain processing. Tenant resolution comes from provider configuration, never payload tenant fields. Automated retries and inbound-message ingestion remain deferred.

## ADR-032: Ambiguous non-idempotent delivery requires reconciliation

Accepted. A database outbox supplies durable local intent, not exactly-once remote delivery. Stale claims at the retry ceiling never trigger a fourth send; a submitted final attempt becomes uncertain even for an idempotent adapter. If a provider lacks an idempotency guarantee and a send could have occurred, automatic retries stop with `DELIVERY_OUTCOME_UNKNOWN` and an append-only uncertainty event. An operator must reconcile provider status before deliberately retrying; a timeout or process crash cannot be interpreted as provider rejection. The TEST adapter remains idempotent and may use bounded retries before that ceiling.

## ADR-033: AWS SES is opt-in for authentication email only

Accepted as a deployment target, not a claim of live integration. `AUTH_EMAIL_TRANSPORT=ses` switches verification/password-reset delivery to SES using the AWS SDK credential chain, explicit region, and verified sender. No static AWS keys are required in the repository. SES `SendEmail` offers no client idempotency token, so this adapter is not reused as a customer-conversation outbox provider. Live send, deliverability, bounce handling, IAM, and production-access validation remain staging work.

## ADR-034: Readiness and CI database proof

Accepted. `/health` remains liveness; `/health/ready` checks PostgreSQL. The worker emits aggregate queue snapshots without content. GitHub Actions applies migrations and runs the opt-in database suites against an isolated PostgreSQL service. This improves regression confidence but does not substitute for AWS staging, backup/restore, failover, or provider fault-injection tests.

## Open decisions

## ADR-035: Manual Follow-ups before automated scheduling

Accepted. Follow-ups are real tenant-owned records with required future due time, optional tenant-verified Lead/Conversation context, and explicit manual complete/reschedule operations. Due-today/upcoming/overdue are calculated on a UTC-day boundary for now; workspace-local timezone semantics need a later reviewed scheduler design. There is no reminder sender, background due-state transition, or AI-generated next action. Mutations and Activity records are atomic.

## ADR-036: Persist General workspace profile, disable ineffective settings

Accepted. Organization bootstrap saves optional workspace profile fields in the same transaction as organization, membership, and workspace creation. The Settings General panel updates that profile through a tenant/RBAC-guarded API; Team is a read-only projection of real organization memberships. AI, approval policy, workflow, integration, and notification panels remain disabled until their owning engines and enforcement are designed. Showing local toggles as effective settings would be misleading.

AWS SES is selected for authentication email and AWS is the intended hosting platform; neither has been live-validated. Customer-conversation delivery provider, LLM provider/models, object storage, error tracking, data residency/retention, and beta service objectives remain open decisions.

## ADR-037: Narrow, fail-closed workflow control before external automation

Accepted. Extend the existing tenant-owned Workflow and ApprovalRequest scaffolds; reuse the existing ActivityEvent store and transactional outbox. Persist a separate Policy, PolicyEvaluation, WorkflowExecution, ExecutionStep, and ApprovalDecision. V1 control accepts only a manual trigger and `DRY_RUN_LOG`, never arbitrary user code, AI output, or a provider action. New workflows default to DRAFT and REQUIRE_APPROVAL. Policy BLOCK creates no outbox intent; approval is a single authorized decision; execution idempotency is unique per organization/workspace; the outbox lease and compare-and-set guard local completion. This is a real persistence/authorization proof, not a production workflow executor. Expiry scheduling, multi-step versions, external side effects, provider-specific idempotency, crash/failover soak, and operational retry tooling remain open.

## ADR-038: Approved internal notification is the first bounded workflow action

Accepted. Reuse the existing outbox and append-only Activity store. `INTERNAL_NOTIFICATION` may create one tenant-scoped in-app notification for the initiating active membership only after policy-required human approval; it cannot use `ALLOW_DRY_RUN`. A unique execution reference and compare-and-set completion prevent duplicate local records. The worker checks current membership and tenant lifecycle before acting. Approval requests expire after 24 hours through a worker sweep, and transient local failures use bounded retries. This does not deliver email, send customer messages, enable AI, or prove production crash/failover safety. The worker remains a separate process, even when the local dev command launches it.

## ADR-039: Immutable workflow snapshots and supervised local worker

Accepted. New executions pin an append-only, tenant-composite `WorkflowDefinitionVersion`; policy changes and draft/paused definition edits create a new snapshot. PostgreSQL rejects snapshot update/delete. Existing executions remain nullable/unpinned because their historical definition cannot be reconstructed honestly. The runtime uses the pinned step and snapshot, not a mutable current definition. A stale `RUNNING` execution is reconciled against persisted step/outbox evidence; a completed step is never replayed. Local `pnpm dev` builds the API and supervises a separate worker process with bounded restart backoff. Production supervision, telemetry, external-provider idempotency, and fault-injection/soak remain separate deployment gates.
