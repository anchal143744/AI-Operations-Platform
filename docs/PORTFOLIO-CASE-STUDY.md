# AI Operations Platform — portfolio case study

## The problem

Small B2B teams can lose context as enquiries move between sales, follow-up,
approval, and operations. This project explores one accountable workspace for
that handoff. The design principle is **AI proposes, policy controls, humans
approve consequential actions, and the system records what actually happened**.
The present demo proves the controlled workflow foundation; it does **not**
claim to perform live AI analysis or customer communication.

## What I built

- A responsive Next.js application with authentication, workspace onboarding,
  Dashboard, Leads, Inbox/Conversations, Follow-ups, Workflows, Human Review,
  Activity, notifications, and Settings.
- A NestJS API backed by PostgreSQL/Prisma. Server-side sessions, active
  membership, organization/workspace ownership, and role permissions gate
  business queries. Client-provided roles and tenant IDs are not authorization
  sources.
- Versioned manual workflows with explicit policy outcomes, approval requests,
  a transactional outbox, a supervised background worker, idempotent dry-run or
  internal-notification execution, and tenant-scoped audit records.
- Honest empty, loading, error, and unavailable states for data or integrations
  that do not exist yet. Synthetic `demo-*` detail routes are isolated from
  persisted customer data.

## Verified product journey

```text
Sign up → verify locally → create workspace → sign in
→ create/view operational records → create/version a manual workflow
→ define policy → trigger → approve or reject when required
→ outbox → worker → internal notification → activity/audit
```

The end-to-end result is an **internal** controlled action. No external email,
WhatsApp, or AI-provider call is implied by a successful internal execution.
See [Testing](TESTING.md) and the [release-readiness report](RELEASE-READINESS-REPORT.md)
for the dated test results and safety limits.

## Engineering choices worth discussing

| Decision                      | Reason                                                                                       |
| ----------------------------- | -------------------------------------------------------------------------------------------- |
| Modular monolith              | One deployable API boundary is simpler to review and operate at this stage.                  |
| Verified tenant context       | Object IDs alone never grant access to another workspace's records.                          |
| Server-side sessions          | Browser JavaScript never stores an access token or password.                                 |
| Immutable workflow versions   | An execution can be traced to the definition that was approved.                              |
| Transactional outbox + worker | Business state and queued internal work are committed together, with retry/recovery tests.   |
| Explicit unavailable states   | Product previews do not claim that AI, external delivery, or advanced settings already work. |

## How to demonstrate it responsibly

1. Use the documented HTTP development mode (`pnpm dev`,
   `http://localhost:3000`) on a trusted local machine, or the guarded
   production-build rehearsal in the [local runbook](LOCAL-PRODUCTION-RUNBOOK.md).
   They use **different local databases**. Never upload either database or
   `.env` with a portfolio.
2. Show a new isolated demo account/workspace, then create a Lead,
   Conversation, and Follow-up. Explain that these records persist in the
   selected workspace and that no customer message is delivered.
3. Create and version a manual workflow, show its policy and approval path,
   watch the worker complete an internal-notification action, then inspect the
   notification and Activity record. If the live environment is unavailable,
   present the passing test evidence instead of claiming a live demo.
4. Show the AI and integration pages as **planned surfaces**, not delivered
   features. Avoid real customer names, credentials, or private data in
   screenshots and recordings.

## Evidence and limits

The latest recorded local release gate passed 236 default tests (32 database
tests intentionally skipped in that run), 268 tests in a separate disposable
PostgreSQL run (0 skipped), and six Chromium browser tests. The patched Next.js
version was 15.5.27. Those numbers are dated evidence, not a guarantee that
future commits or a hosted environment pass. The current machine's Docker
Engine and a hosted staging deployment have not been verified.

**Not production-ready:** no verified AWS SES identity or live auth-email
delivery, no external customer communication, no live AI provider, no managed
PostgreSQL backup/restore rehearsal, no trusted public domain/TLS, and no
hosted CI/container/browser gate. The local self-signed HTTPS certificate is
intentionally not trusted by Windows; use HTTP development mode for an
interactive local demo rather than bypassing a browser warning.

## Next release gates

1. Publish this reviewed repository to the owner's intended GitHub remote;
   run the existing CI and inspect its result. Do not commit `.env`, databases,
   local runtime state, or private screenshots.
2. Provision an approved staging host, managed PostgreSQL with backup/restore,
   trusted TLS domain, separate web/API/worker supervision, and secret
   injection. Verify the container build and migration job against a
   disposable staging database first.
3. Configure a verified SES sender and test real verification/reset delivery
   before enabling public signup. Then run hosted browser, API, security,
   recovery, and observability checks before a production decision.
4. Only after these gates, prioritize one real external communication path and
   one evidence-bound AI operation through the existing policy/approval
   boundary. Do not claim these are part of the present release.
