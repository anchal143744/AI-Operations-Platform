# AI Operations Platform

Production-oriented foundation for a multi-tenant B2B enquiry-to-execution platform.

## Current implementation

- pnpm TypeScript monorepo with Next.js web and NestJS API shells
- shared `ui`, `types`, `config`, and `utils` package boundaries
- PostgreSQL/Prisma identity and multi-tenant persistence foundation with a versioned initial migration, plus local Redis infrastructure reserved for later BullMQ adoption
- lint, formatting, typecheck, test, build, CI, and Docker foundations
- production-quality Page 01 landing page, a backend-connected authentication experience (Pages 02–06), Page 07 onboarding, the Page 08 application/dashboard shell, Pages 09–13 operational workspaces, Page 14 AI Operations, Page 15 Workflows, Page 16 Human Review, Page 17 Activity/Audit, Page 18 Workspace Settings, and NestJS health/authentication endpoints

The landing page is presentation-only and uses explicitly isolated mock data for its product preview. Authentication routes call the typed NestJS boundary without storing credentials or session secrets in browser storage. Onboarding performs an atomic organization, OWNER membership, and initial-workspace bootstrap. Authenticated users can persist a preferred organization/workspace pair on their server-side session; every use still re-verifies current membership and tenant lifecycle state. Leads and Conversations use real tenant-scoped APIs. Supported mutations append tenant-scoped Activity events, and `/activity` reads that append-only history. Phase 27 added a provider-neutral delivery boundary, tenant-scoped idempotency, verified webhook normalization, and an explicitly TEST-only conversation adapter that performs no network requests. Phase 28 makes supported business mutations and their audit records atomic, queues outbound delivery through a transactional PostgreSQL outbox, and provides a separately runnable bounded-retry worker. Authentication email has an opt-in SES adapter, but no live AWS delivery has been verified; customer-conversation email, WhatsApp, Instagram, SMS, and web-chat providers are not connected. A narrow manual workflow/approval slice supports a no-op dry run and a tenant-scoped in-app notification after human approval; this is **not** AI, customer communication, or general automation. The two `demo-*` detail routes remain isolated synthetic fixtures, never production API data.

For a signed-in workspace, `/dashboard` reads real tenant-scoped Lead, Conversation, and Follow-up totals. Zero means the workspace has no records; an API failure is shown as unavailable with a retry action, not as zero. `/follow-ups` supports persisted manual creation, completion, and rescheduling with tenant/RBAC checks and activity records; its queue and totals refresh while visible. `/activity` now queries the append-only record with server-side search, view, actor, date, sort, pagination, and workflow scoping. General workspace profile settings can be saved; Team reads real organization memberships. AI Operations remains a future-state interface. Workflows and approvals support only the two bounded actions described above. No synthetic business metrics are shown.

Onboarding now saves its business/workspace profile in the same transaction as organization, OWNER membership, and workspace creation. Its role, goal, channel, and enquiry-owner choices remain presentation context and are not yet persisted or used by automation. The Settings AI, policy, workflow, integration, notification, and danger-zone sections are disabled previews, not effective configuration.
The Leads pipeline cards also read a permission-checked, tenant-scoped status aggregate rather than showing placeholder totals.

Phase 19 audited the frontend/backend boundary before backend work. Phase 20 adds `User`, `Organization`, `Workspace`, and `Membership`, tenant-composite ownership for future operational records, restrictive referential actions, an append-only activity-table guard, and a reusable NestJS `DatabaseModule`/`PrismaService`. It does not add authentication, authorization enforcement, business APIs, providers, queues, or feature execution.

Phase 21 added Argon2id password hashing, keyed-hash verification/reset tokens, revocable server-side sessions, HttpOnly cookies, email-delivery abstraction, validated authentication endpoints, exact-origin CSRF checks, an authentication guard, and verified tenant-context resolution. Authentication abuse counters now use shared PostgreSQL atomic updates, not process-local memory. Production email requires verified SES configuration; the repository does not provision an AWS account. RBAC and business authorization were added in later phases.

Phase 22 adds centralized RBAC and verified tenant context. Phase 23 applies it to Leads and proves cross-tenant isolation against disposable PostgreSQL. Phase 24 adds atomic organization/workspace bootstrap and real workspace selection. Phase 25 adds tenant-scoped Conversation list/detail/create and internal message creation, plus real Inbox integration. External delivery, inbound ingestion, realtime updates, AI assistance, and conversation audit emission remain later phases.

Phase 28 introduces the first durable asynchronous boundary. `pnpm --filter @aop/api worker` claims due outbox rows with PostgreSQL row locking, uses the existing tenant-scoped idempotency key when calling the provider adapter, and records provider outcomes atomically with message/outbox state. Retry delays are bounded to 30 seconds, 2 minutes, and 10 minutes with a three-attempt ceiling. Stale processing leases are recoverable. Redis/BullMQ and a managed secret store are intentionally not required yet; provider configurations accept opaque `secret://` references only.

The next reliability slice adds `/health/ready`, aggregate outbox diagnostics in worker logs, stale-lease exhaustion handling, and an explicit uncertain-delivery state for future providers that cannot deduplicate sends. CI now runs the disposable-PostgreSQL integration suite. Amazon SES is an opt-in transport for **authentication verification and reset email only** (`AUTH_EMAIL_TRANSPORT=ses`, `AWS_REGION`, `SES_FROM_EMAIL`); it uses the AWS SDK credential chain and has not been exercised against a live AWS account. Customer-conversation delivery remains TEST-only. No AWS infrastructure or hosted environment is deployed.

## Local setup

1. Install Node.js 22+ and pnpm 11.
2. Copy `.env.example` to `.env` and replace development secrets.
3. Start the project PostgreSQL service with `docker compose -f infra/docker-compose.yml up -d`, or use an existing local PostgreSQL instance dedicated to this project. Do not point `DATABASE_URL` at another application's database.
4. Run `pnpm install`.
5. Run `pnpm db:validate`.
6. Apply migrations only to a reviewed local database with `pnpm db:migrate:deploy`.
7. Run `pnpm dev`. It builds shared types and the API, then starts web, API watch mode, and the outbox worker as one supervised local session. Worker crashes restart after bounded backoff. Restart `pnpm dev` after changing worker source; API watch mode does not hot-reload the compiled worker. Production must run the worker as a separately supervised service (`pnpm --filter @aop/api worker`). API readiness alone does not prove worker health.

Web defaults to `http://localhost:3000`; API liveness and database readiness default to `http://localhost:4000/health` and `/health/ready`. Check `/health/worker` separately for fresh background-worker readiness (503 when no active worker). Replace `AUTH_TOKEN_PEPPER` before creating accounts; changing it later invalidates existing verification, reset, and session tokens. Run a single `pnpm dev` session. A second launch recognizes an already-healthy web/API/worker set instead of starting duplicate servers; an occupied or unhealthy set produces an explicit error. Development and production Next builds use separate `.next-dev` and `.next` outputs so `pnpm build` cannot remove a live development page. Worker supervision, telemetry, and deployment limits are documented in [Worker operations](docs/WORKER-OPERATIONS.md).

With `NODE_ENV=development`, a loopback `APP_ORIGIN`, and `AUTH_EMAIL_TRANSPORT=development`, the API binds to `127.0.0.1` and a newly registered user sees a short-lived verification code in the signup response. The code is not emailed or logged and is never shown in production or with SES. Re-registering a pending account reveals a new local code only when its existing password matches. This local preview is for a trusted developer machine only; do not expose the development API through a public reverse proxy. Password-reset delivery still requires a configured email transport. To opt in to SES for authentication email, configure an AWS role/credential chain, a verified sender, region, and `AUTH_EMAIL_TRANSPORT=ses`; do not place AWS keys in the repository.

To check the local signup-to-workspace-to-lead-and-conversation path without changing normal application data, run `node --env-file=.env scripts/local-auth-smoke.mjs`. The script uses and removes a randomly named test schema in the local `ai_operations` database; see `docs/TESTING.md` for its limits.

## Validation

Run `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm db:validate`, and `pnpm build`. PostgreSQL tests are opt-in: provide a disposable database whose name contains `test`, apply migrations, set `RUN_DATABASE_INTEGRATION_TESTS=true` and `TEST_DATABASE_URL`, then run `pnpm test:db:integration`, `pnpm test:auth:integration`, `pnpm test:authorization:integration`, `pnpm test:leads:integration`, and `pnpm test:tenant-conversations:integration`. Never use an unknown or production `DATABASE_URL` for these tests.

## Documentation

Start with `docs/PRODUCT.md`, `docs/V1-ROADMAP.md`, and `docs/ARCHITECTURE.md`. Status language is deliberate: **current** means implemented; **planned** means approved V1 scope; **future** means outside V1 or awaiting approval.
