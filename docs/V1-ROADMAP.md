# V1 Roadmap

Status legend: **Current** = implemented now; **Planned** = approved V1 work not yet implemented; **Future** = explicitly outside V1 or conditional.

## Phase 0 — Product definition (Current)

Document target customer, problem, value proposition, V1 scope, non-goals, user journeys, success metrics, and Definition of Done. Exit: stakeholders can evaluate V1 without implied functionality.

## Phase 1 — System architecture (Current: design; Planned: implementation)

Adopt a modular monolith: Next.js/TypeScript web, NestJS/TypeScript API and workers, PostgreSQL/Prisma, Redis/BullMQ, schema-validated LLM integration, provider-abstracted email, optional S3-compatible storage, and Docker. Exit: boundaries, data ownership, failure modes, and deployment topology are documented.

## Phase 2 — Monorepo foundation (Current)

Establish apps, shared packages, database, docs, infrastructure, tests, strict TypeScript, lint/format, environment contract, Docker services, versioned migration directory, and CI checks. Exit: clean install and all foundation validation commands pass.

## Phase 3 — Authentication (Planned)

Registration, login/logout, verification, password reset, secure sessions/tokens, strong password hashing, rate limits, validation, and secure cookie/token handling. Exit: authentication integration and abuse tests pass.

## Phase 4 — Organizations and multi-tenancy (Planned)

Model User → Organization → Workspace → Business data. Tenant context is resolved server-side; repositories require tenant scope; cross-tenant tests are mandatory. Exit: Company A cannot observe or mutate Company B data.

## Phase 5 — RBAC (Planned)

Provide OWNER, ADMIN, MANAGER, SALES, VIEWER roles mapped to centrally defined permissions. Exit: policy tests cover allowed and denied operations without controller-level role literals.

## Phase 6 — Core dashboard (Planned)

Show database-derived totals for new, qualified, hot, follow-up, approvals, response time, conversion, and recent activity. Exit: no demo metrics and empty/error/loading states are honest.

## Phase 7 — Lead management (Planned)

Implement tenant-scoped CRUD, search, filters, assignment, notes, activity, and fields for identity, source, requirement, status, score, priority, owner, and timestamps. Pipeline: NEW, QUALIFIED, CONTACTED, QUOTED, NEGOTIATION, WON, LOST. Exit: permissions, validation, and audit coverage pass.

## Phase 8 — Enquiry ingestion (Planned)

Support only website forms and email. Normalize provider payloads into a channel-neutral message, authenticate webhooks, deduplicate events, validate inputs, and persist raw provenance safely. Exit: retrying a webhook cannot create a duplicate lead.

## Phase 9 — AI extraction engine (Planned)

Extract intent, customer/company, product, quantity, location, budget, deadline, missing information, evidence, and explicit uncertainty via versioned strict schemas. Reject invalid output and use safe retry/fallback behavior. Exit: representative and adversarial evaluation sets meet agreed field thresholds.

## Phase 10 — AI qualification (Planned)

Score purchase intent, budget, urgency, value, customer fit, relationship, and completeness; return score, HOT/WARM/COLD classification, reasons, evidence, model/prompt version, and confidence. Exit: deterministic policy boundaries wrap model suggestions and scores remain explainable.

## Phase 11 — AI response drafting (Planned)

Create reviewable drafts using approved organization knowledge. Prices, discounts, availability, delivery, and contractual claims require verified facts and applicable approvals; otherwise the draft asks for clarification. Exit: hallucination-sensitive tests pass.

## Phase 12 — Human approval engine (Planned)

Classify actions as low, medium, or high risk. Low: lead creation/classification/summaries/reminders. Medium: response/follow-up drafts. High: pricing, quotations, discounts, contracts, sensitive communication. Enforce approve/edit/reject with immutable decision history. Exit: high-risk actions cannot execute without authorized approval.

## Phase 13 — Email sending (Planned)

Send only approved content through an adapter; track queued, sent, delivered, bounced, failed, and replied states where supported. Correlate provider events idempotently. Exit: retries cannot duplicate sends and failures are visible.

## Phase 14 — Workflow engine (Planned)

Implement persisted, deterministic trigger → condition → action → wait steps with stable versions, idempotency keys, retry policy, timeout, cancellation, and resumability. Begin with code/config workflows, not a visual builder. Exit: interrupted workflows recover without replaying completed side effects.

## Phase 15 — Follow-up automation (Planned)

Support configurable Day 0, 24-hour, 72-hour, and 7-day sequences. Lock per conversation, prevent duplicates, and atomically cancel pending jobs when a customer reply is accepted. Exit: race tests prove no follow-up is sent after a recorded reply.

## Phase 16 — Activity and audit (Planned)

Record actor, action, time, tenant, resource, correlation, relevant metadata, outcome, and AI/provider provenance. Separate user-facing activity from security-grade audit where retention differs. Exit: the end-to-end workflow is reconstructable.

## Phase 17 — Company knowledge (Planned: simple; Future: advanced retrieval)

Store approved FAQs, products/services, policies, and documents with publication state and version. Use direct structured retrieval first. Add vector/RAG only after corpus size and measured retrieval needs justify it. Exit: drafts cite the approved knowledge version used.

## Phase 18 — Analytics (Planned)

Calculate lead, qualification, temperature, contact, quote, win, conversion, source, response-time, and follow-up metrics from database events. Define time zones, attribution, and metric semantics. Exit: queries reconcile against underlying records.

## Phase 19 — Settings (Planned incrementally)

Expose organization profile, users, roles, email, AI, workflow, notification, scoring, follow-up, and knowledge settings only when their owning capability exists. Exit: changes are permissioned, validated, and audited.

## Phase 20 — Security (Current: principles; Planned: continuous implementation)

Implement authentication, authorization, tenant isolation, validation, rate limits, headers, secrets, audit, safe errors, database controls, prompt-injection defenses, AI permission boundaries, hallucination controls, approvals, and AI logging. Exit: threat model and security suite pass before beta.

## Phase 21 — Testing (Current: runner; Planned: suites)

Add unit business logic; API/database/auth/tenant integration; AI schema/failure/hallucination tests; full enquiry-to-follow-up E2E; authorization and malicious-input security tests; and failure tests for AI, email, database, duplicate webhooks, queue interruption, replies during follow-up, and workflow recovery. Exit: critical paths and failures are automated in CI.

## Phase 22 — Observability (Planned)

Provide structured correlated logs, error tracking, API and AI latency, queue depth/health, workflow/email failures, database health, alerts, and runbooks. Exit: operators can find a failed workflow and its cause from a correlation ID.

## Phase 23 — Deployment (Current: local Docker/CI skeleton; Planned: environments)

Establish Development → Staging → Production, immutable images, environment-specific configuration, migration gates, backups/restores, health/readiness checks, rollback, and least-privilege secrets. Exit: staging deployment and restore rehearsal succeed.

## Phase 24 — Beta (Planned)

Onboard 3–5 real businesses; measure workflow completion, extraction accuracy, response time, reliability, time saved, adoption, conversion, failures, and willingness to pay. Exit: critical incidents are resolved and launch thresholds are met.

## Phase 25 — V1 launch (Planned)

V1 is complete only when a real business reliably runs enquiry → AI understanding → structured lead → qualification → response draft → human approval → email → automated follow-up → reply detection → cancellation → activity history → useful analytics. Launch is an evidence gate, not a date or feature count.

## Future functionality

Additional channels, advanced knowledge retrieval, visual workflow design, broader integrations, mobile clients, and enterprise capabilities remain outside V1 unless separately approved.
