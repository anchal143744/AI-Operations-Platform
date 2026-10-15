# Release readiness review — 2026-10-13

## Executive verdict

**NOT READY FOR A PRODUCTION RELEASE.** The local core workflow and patched
Next.js 15.5.27 build are verified, but Docker/container execution and a hosted
staging deployment are unverified,
and no AWS account, SES identity, managed backup, or real external-delivery
path is available. Local green tests are not evidence of a live deployment.

## What was inspected

The review covered the web routes and AppShell; Nest API modules; Prisma schema
and all 17 migrations; authentication, membership/RBAC and workspace scoping;
Leads, Conversations, Follow-ups, settings/onboarding, workflow versions,
policies, approvals, worker/outbox, notifications and Activity; Playwright,
Vitest and CI; development and production Compose/Dockerfile; deployment and
backup runbooks; Git state and ignored files. The repository was clean on
`main` at the start. No commit, reset, normal-database migration, or seed was
performed.

## Findings and repairs

| Finding                                                    | Cause and repair                                                                                                                                                                                                                                                                                                                 | Result                                                                                              |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Browser gate could not run                                 | Matching Chromium executable was absent. Installed it with `pnpm exec playwright install chromium` and added `test:browser:local`, which creates/migrates/removes only a random loopback test schema and owns the web/API/worker ports.                                                                                          | **PASS** — five Chromium tests ran.                                                                 |
| Premature login leaked the submitted password into the URL | A server-rendered auth form had the default native GET behavior before hydration. All five auth forms now have a POST fallback and disabled controls until the client handler attaches. Added a JavaScript-disabled browser regression test. The observed password was synthetic and its disposable database schema was removed. | **PASS** — browser regression and full login flow.                                                  |
| Existing E2E selectors failed on custom controls           | Playwright used ambiguous password labels and attempted to click visually overlaid radio inputs. Tests now target exact password labels and visible card labels; verification waits for hydration. The version assertion now accounts for the additional immutable version created by policy change.                             | **PASS** — no assertions were removed.                                                              |
| Production dependency advisories                           | Updated Nest 11 to 11.2.7 (Multer 2.4.0); installed Sharp 0.35.5/source-map-js 1.2.2; constrained proxy-addr to 2.0.8, PostCSS to 8.5.28, and deepmerge-ts to 8.0.0 in pnpm workspace overrides. Prisma generation, migration checks, tests, and build passed with these resolutions.                                            | **PASS** for high/critical audit threshold; **FAIL** for two remaining moderate Next.js advisories. |
| Next.js patch download                                     | Retried the official npm registry with a longer per-request fetch timeout. `next` and Windows `@next/swc-win32-x64-msvc` are now installed at 15.5.27; the lockfile and frozen install agree.                                                                                                                                    | **PASS** — the two moderate Next.js advisories are cleared.                                         |
| Backup tooling thought unavailable                         | PostgreSQL 16 binaries were installed outside PATH. Added a guarded local rehearsal using a generated schema, synthetic probe row, custom dump, restore, migration-count and data verification, and exact-schema cleanup.                                                                                                        | **PASS** locally; hosted recovery still **BLOCKED**.                                                |

## Evidence and command results

All commands below were run from this repository. Test launchers verified the
loopback `ai_operations` base and used generated `aop_test_*`,
`aop_e2e_test_*`, or `aop_restore_test_*` schemas. They removed only schemas
they created; `public` was never reset.

| Requirement                        | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                          | Status                                                                 |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Dependency install/lock            | `pnpm install --frozen-lockfile` exited 0 after the Next.js 15.5.27 update. Both installed `next` and Windows SWC report 15.5.27.                                                                                                                                                                                                                                                                                                 | **PASS**                                                               |
| Format                             | `pnpm format` and `pnpm format:check` exited 0.                                                                                                                                                                                                                                                                                                                                                                                   | **PASS**                                                               |
| Lint                               | `pnpm lint` exited 0 with zero warnings.                                                                                                                                                                                                                                                                                                                                                                                          | **PASS**                                                               |
| Types                              | `pnpm typecheck` exited 0 for all six workspace projects.                                                                                                                                                                                                                                                                                                                                                                         | **PASS**                                                               |
| Unit/default suite                 | `pnpm test`: 235 passed, 32 DB tests skipped by design, 0 failed. Skips are not counted as passes.                                                                                                                                                                                                                                                                                                                                | **PASS** for the default suite                                         |
| PostgreSQL integration             | `node --env-file=.env scripts/local-db-integration.mjs`: 267 passed, 0 skipped, 0 failed across 43 files, including auth, RBAC, tenant isolation, Leads/Conversations and worker recovery. Fresh schema received all 17 migrations.                                                                                                                                                                                               | **PASS**                                                               |
| Local API smoke                    | `node --env-file=.env scripts/local-auth-smoke.mjs`: registration, verification, session, workspace bootstrap, Lead/Conversation/Follow-up/settings, policy/approval, internal notification, worker restart, CSRF and tenant checks passed.                                                                                                                                                                                       | **PASS**                                                               |
| Browser E2E                        | `pnpm test:browser:local`: 5 passed, 0 failed after the final dependency set. Covered signup → verification → onboarding → logout/login → workflow/version/policy → approval → outbox/worker → notification → audit/reload; rejection/failure-retry; signed-out boundary; pre-hydration auth; 18 routes at 1440 and 390 px with no document overflow or unexpected page/console errors. Expected 401/503 responses were asserted. | **PASS** locally                                                       |
| Prisma                             | `pnpm db:validate` exited 0; `pnpm db:migrate:status` reported the local `public` schema up to date with 17 migrations.                                                                                                                                                                                                                                                                                                           | **PASS**                                                               |
| Build                              | `pnpm build` exited 0 for API and web; Next generated all 19 build routes.                                                                                                                                                                                                                                                                                                                                                        | **PASS**                                                               |
| Startup/readiness                  | Browser runner launched web, API and worker itself and waited for `/health/worker`; an approved internal-notification action reached `SUCCEEDED` and appeared in UI.                                                                                                                                                                                                                                                              | **PASS** locally                                                       |
| Local logical restore              | `node --env-file=.env scripts/local-backup-rehearsal.mjs`: restored a synthetic row and all 17 migration records; removed generated schema/archive.                                                                                                                                                                                                                                                                               | **PASS** locally                                                       |
| Production Compose syntax          | `docker compose -f infra/compose.production.yml config --quiet` exited 0 using non-secret placeholders.                                                                                                                                                                                                                                                                                                                           | **PASS** syntax only                                                   |
| Production images/containers       | Docker CLI exists, but Linux Engine connection failed (`dockerDesktopLinuxEngine` pipe absent). No image was built or container started.                                                                                                                                                                                                                                                                                          | **BLOCKED**                                                            |
| Dependency security                | `pnpm audit --prod --audit-level moderate` exited 0: no known vulnerabilities found at the time of this run.                                                                                                                                                                                                                                                                                                                      | **PASS** for the local production-dependency audit                     |
| Managed recovery                   | No hosted snapshot, retention policy, PITR, RPO/RTO, or restore to a staging database was available.                                                                                                                                                                                                                                                                                                                              | **BLOCKED**                                                            |
| CI execution                       | Workflow YAML was inspected: disposable PostgreSQL, migrations, full tests and Chromium are configured. No hosted GitHub Actions run was performed; there is no Git remote configured here.                                                                                                                                                                                                                                       | **NOT RUN**                                                            |
| Live SES/customer communication/AI | No verified sender, IAM role, AWS account, customer-delivery credentials or AI provider was supplied. Unit/test adapters do not prove external delivery.                                                                                                                                                                                                                                                                          | **BLOCKED** for SES; external customer delivery/AI **NOT IMPLEMENTED** |
| Hosted deployment and smoke        | No hosting target, domain/TLS, managed database, secrets, or authenticated deployment tooling. Nothing was published.                                                                                                                                                                                                                                                                                                             | **BLOCKED**                                                            |

## Security and operational boundaries

- The Next.js security patch is installed and locally validated. This does not
  replace a future hosted dependency scan or production deployment review.

- Session, CSRF, account-state, RBAC and tenant-scope tests passed against real
  PostgreSQL. The browser gate also proved signed-out workflow data is not
  exposed. These are local checks, not a penetration test.
- Tracked files contain `.env.example`, not `.env`; `.gitignore` and
  `.dockerignore` exclude local environment files and generated artifacts. No
  real password, API token, or provider credential was added.
- The outbox/worker path is durable and idempotency/recovery tests passed.
  `INTERNAL_NOTIFICATION` success is an in-product notification, **not** proof
  of externally delivered email or customer communication.
- Authentication email uses a non-delivering preview only in loopback
  development or the separately guarded local production-build rehearsal.
  Production SES delivery is not configured or tested.
- Docker/Compose is a single-host reference. No multi-host failover, provider
  timeout soak, production supervision, or live alerting was exercised.
- AI Operations remains a future-facing surface; no real AI provider or AI
  execution result was verified.

## Files changed for this review

Created: `apps/web/components/auth/use-auth-form-ready.ts`,
`scripts/local-browser-e2e.mjs`, `scripts/local-backup-rehearsal.mjs`, and this
report. Modified: five auth form components, `e2e/release-gate.spec.ts`, root
`package.json`, `apps/api/package.json`, `apps/web/package.json`,
`pnpm-workspace.yaml`, `pnpm-lock.yaml`, `docs/TESTING.md`,
`docs/DEPLOYMENT.md`, and `docs/BACKUP-RESTORE.md`. No files were removed.

### Next.js patch follow-up — 2026-10-13

- Before the retry: `apps/web/package.json` specified `^15.5.25`, the lockfile
  resolved 15.5.25, and the installed Next.js version was 15.5.25.
- Registry: `https://registry.npmjs.org/`; DNS returned IPv4 and IPv6 records,
  TCP port 443 succeeded, and direct HTTPS HEAD requests for the 15.5.27
  metadata, Next.js tarball, and Windows SWC tarball all returned HTTP 200.
  No inspected HTTP(S)/npm proxy variables or WinHTTP proxy were configured. The prior
  transfer timeouts could not be reproduced during this retry; there is no
  evidence of a persistent DNS, proxy, or TLS configuration failure. Metadata
  requests were intermittently slow, consistent with a transient network or
  registry-transfer problem. TLS verification remained enabled and packages
  came from the configured official npm registry.
- `pnpm --filter @aop/web add next@15.5.27 --save-exact --fetch-timeout 300000`
  exited 0 after approximately 2m14s. pnpm retained a caret-style manifest
  specifier, so `pnpm pkg set` and `pnpm install --lockfile-only --offline`
  pinned the reviewed release exactly (`15.5.27`) in both manifest and lockfile.
  The actual installed Next.js and Windows SWC packages are both 15.5.27. No
  framework-major upgrade was introduced.
- Validation: frozen install, production audit at moderate threshold, format
  check, lint, typecheck, Prisma validation and production build all exited 0.
  Default tests: 235 passed, 32 DB tests intentionally skipped. The separate
  disposable PostgreSQL run: 267 passed, 0 skipped. Browser release gate:
  5 passed, 0 failed. Both disposable test schemas were removed by their
  launchers; the normal application schema was not reset.

## Exact remaining release steps

1. Provision an approved AWS staging account, same-site HTTPS web/API domains,
   private managed PostgreSQL, secret injection, and a verified `us-east-1` SES
   identity with least-privilege send permission. Test actual verification and
   password-reset delivery; do not enable production signups before this.
2. Bring up a reviewed Docker Engine or CI image builder; build the production
   image, run Compose's migration job against a **disposable staging target**,
   start web/API/worker, and verify readiness, restart and logs. Do not run
   these steps against the normal local or unknown database.
3. Configure managed backup/PITR, define RPO/RTO, restore into a new staging
   database, verify tenant data and an authenticated workflow, then rehearse
   compatible rollback. The local schema-only rehearsal is insufficient.
4. Run the configured CI job and hosted staging browser/API smoke tests,
   review observability and worker alerts, then make a deliberate release
   approval. There is no production URL or live release from this review.

The working tree is intentionally uncommitted for review.

## Local production-build follow-up — 2026-10-13

The owner requested a complete **local** runtime, not hosting. The previous
public-release verdict remains **NOT READY FOR A PRODUCTION RELEASE**. The
native Windows production-build rehearsal is a separate result; it does not
prove container execution or external delivery. Exact operator commands and
boundaries are in `docs/LOCAL-PRODUCTION-RUNBOOK.md`.

| Requirement                           | Actual result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Status                                     |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| Docker Engine                         | Docker Desktop was installed and started with its normal launcher, but its Linux backend crashed in optional Model Runner/Inference startup while accessing its `dockerInference` socket/reparse point. The Engine pipe remained unavailable. No volumes, Docker data, or application database were reset; no image or container was run.                                                                                                                                                                                                                                                        | **BLOCKED**                                |
| Isolated native PostgreSQL            | PostgreSQL 16 `initdb` created a UTF-8 cluster in gitignored `.local-production/postgres-utf8` on loopback port 55432. It uses generated local credentials and `aop_local_production`, separate from normal `ai_operations`. All 17 versioned migrations applied.                                                                                                                                                                                                                                                                                                                                | **PASS**                                   |
| Built services and HTTPS              | `pnpm local:production:prepare` built shared types, API, and Next 15.5.27; `pnpm local:production:start` started built web/API/worker and a loopback HTTPS proxy. `pnpm local:production:status` returned API 200 and worker 200. `curl --cacert` verified TLS and web `/login` 200, API `/health/ready` 200, and unauthenticated `/auth/session` 401.                                                                                                                                                                                                                                           | **PASS**                                   |
| Secure local authentication           | Production Secure/HttpOnly cookies and the existing CORS/CSRF rules remained intact. The non-delivering verification preview requires production mode, `AOP_LOCAL_PRODUCTION=true`, HTTPS localhost `APP_ORIGIN`, and development mail transport, with the API bound to loopback. No email or provider connection was claimed.                                                                                                                                                                                                                                                                   | **PASS** for local-only path               |
| Full browser workflow                 | `pnpm local:production:e2e` applied 17 migrations to a random database in the isolated cluster and ran six Chromium release-gate tests against the built HTTPS stack. All 6 passed in 1.1 minutes, 0 failed. The journeys included signup/verification/onboarding/login, persisted Lead and Conversation creation/detail/reload, workflow version/policy/approval, outbox worker completion, persisted internal notification/audit, rejection/failure-retry, unauthenticated boundaries, 18-route desktop/mobile layout and console checks. The runner removed only its generated test database. | **PASS**                                   |
| Isolated PostgreSQL integration       | `pnpm local:production:db-test` applied all 17 migrations to another random database in the isolated cluster. All 43 Vitest files and 268 tests passed, 0 failed, 0 skipped, including database-backed auth, authorization, Leads, conversations, worker operations/recovery. It removed only the generated integration database; the normal database was untouched.                                                                                                                                                                                                                             | **PASS**                                   |
| Persistence across restart            | The browser test database contained nonzero User, Workflow, Notification, and Activity rows. The built stack was stopped and restarted without rebuilding or migrating; counts matched afterward. The runner then stopped the stack and removed its generated database.                                                                                                                                                                                                                                                                                                                          | **PASS**                                   |
| Logical restore                       | `pnpm local:production:restore-test` dumped only `aop_local_production`, restored into a random database inside the isolated cluster, verified Prisma connection, matching migration history and operational counts, then removed only that generated restore database/archive. The first verifier query failed because it used Prisma model names instead of mapped SQL table names; corrected and rerun successfully.                                                                                                                                                                          | **PASS**                                   |
| Ordinary browser certificate trust    | A 3-month localhost certificate was generated and verified via certificate-pinned curl/Chromium. Attempting current-user Root trust prompted Windows confirmation, which was cancelled; no silent trust-store change was made. A normal browser may still warn until the owner reviews and approves trust interactively.                                                                                                                                                                                                                                                                         | **BLOCKED** for warning-free manual access |
| External providers and hosted release | No AWS account, SES identity, live mail, external communication, AI provider, hosting, managed recovery, or public endpoint was configured or exercised.                                                                                                                                                                                                                                                                                                                                                                                                                                         | **NOT RUN**                                |

The new sixth browser case initially failed because the Inbox form's shared
button defaulted to `type="button"`, so clicking “Create conversation” never
submitted. The component now specifies `type="submit"`; the rebuilt stack
passed all six cases with real database persistence. No existing assertion
was removed or weakened. A separate browser-run attempt exited before API/
worker readiness without a diagnostic root cause. Direct built-stack startup,
explicit `pnpm local:production:stop`, and the subsequent full browser run
passed. Treat startup repeatability as a remaining local reliability concern
until that isolated failure can be reproduced and explained.
The explicit stop command exited 0, emitted `worker.stopped`, shut down the
isolated PostgreSQL cluster, and released all five local ports and the
supervisor marker. A fresh start then reached API/worker 200 and HTTPS web
200; this final stack was left running for local use.

The local database directory is inside a OneDrive-synced project path. That
is acceptable for this isolated functional rehearsal, but not a durable
production data-placement or backup strategy. Keep that directory out of
sync and establish independent backups before retaining important records.
The live worker readiness was 200 with an active heartbeat; its metrics also
reported **stalled historical heartbeats** from earlier interrupted local
processes. Those rows were left intact as operational evidence, not deleted to
make the metric look clean. They did not prevent the active worker from
consuming the browser-test outbox event; investigate unexpected shutdowns if
the count continues to grow.

Local runtime files created: `scripts/local-production.mjs`,
`scripts/local-production-proxy.mjs`,
`scripts/local-production-certificate.ps1`, and
`docs/LOCAL-PRODUCTION-RUNBOOK.md`. This follow-up modified `.gitignore`,
`.dockerignore` (to exclude generated local credentials from image contexts),
`package.json`, `playwright.config.ts`, API auth/bootstrap files,
`apps/web/components/inbox/conversation-create-form.tsx`, the relevant auth
security test, and `e2e/release-gate.spec.ts`. No schema, migration, normal `.env`, or normal
database was modified for the native runtime.

## Local hardening addendum — 2026-10-14

This addendum updates the **local** rehearsal, not the public-release verdict:
**NOT READY FOR A PRODUCTION RELEASE**. The prior findings above remain the
historical record of their respective runs.

- Active isolated runtime state, including PostgreSQL, generated credentials,
  certificate and logs, was relocated from the OneDrive-synced repository to
  `%LOCALAPPDATA%\AI-Operations-Platform\local-production`. The old
  `.local-production/` cluster was preserved as an inactive recovery source;
  neither it nor the normal `ai_operations` database was reset or deleted.
  A retained custom-format `pg_dump` archive was SHA-256 hashed and passed
  `pg_restore --list`, then restored into the newly initialized AppData
  `aop_local_production` database. The old and restored databases both had
  all 17 migration records but **zero** User, Workflow, Notification and
  Activity records at relocation; this was not a populated-data migration
  proof. Separately, `pnpm local:production:restore-test` restored the active
  database into a generated test database with matching migrations and
  counts, also zero operational records at that time. The later browser test
  proved nonzero records persisted across a normal stack restart **inside
  its own disposable test database**. None of these checks establishes
  independent off-host backup, retention, or disaster recovery.
  The retained archive is
  `%LOCALAPPDATA%\AI-Operations-Platform\local-production\backups\aop-before-storage-migration-20261013-202227.dump`
  (SHA-256 `7921BDA6C944D87B7CDEBD6ADA057862D236D217A54B361A70CC1FAA44959F7A`).
- An ordinary `pnpm build` replaced the web artifact with one targeting the
  wrong API origin, and five browser cases failed. Preparation now records and
  checks the local HTTPS build identity before startup. After a fresh
  `pnpm local:production:prepare`, `pnpm local:production:e2e` passed all
  **6/6** Chromium release-gate cases against the built HTTPS stack. The
  failed intermediate run is not counted as a pass.
- The completed validation before the latest supervisor-lifecycle follow-up
  was: `pnpm format`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck`,
  `pnpm db:validate`, `pnpm build`, and the production dependency audit all
  exited 0; Prisma reported all 17 migrations current. Default `pnpm test`
  had **236 passed, 32 intentionally skipped** database tests; the separate
  isolated `pnpm local:production:db-test` had **268 passed, 0 skipped, 0
  failed** across 43 files. Skips are not passes. Revalidation after any
  subsequent lifecycle change must be reported separately.
- The owner chose not to install the self-signed localhost certificate into
  Windows trusted roots. Certificate-pinned HTTPS checks and browser tests
  passed, but warning-free ordinary-browser access remains unverified. Docker
  Desktop's Linux backend still crashes while handling its optional Inference
  socket/reparse point; no Docker image or container was built, and no Docker
  reset was performed. The native runtime does not depend on Docker.
- Earlier local runs exposed an unexplained pre-readiness exit, an unexpected
  certificate on one restart, and a supervisor stop that exceeded 90 seconds.
  The latest completed direct startup/shutdown and six-test browser run passed,
  but these observations remain reliability follow-ups rather than being
  erased. The active certificate and supervisor/port state should be checked
  after future restarts.
- Another normal startup ended when the HTTPS proxy exited with Windows
  code `3221226505`. The supervisor shut down the application and isolated
  database cleanly, and a retry passed, but Windows event logs did not yield
  a conclusive faulting module. The HTTPS proxy now has bounded restarts and
  backoff like the worker; each sends an IPC-ready signal from its own process.
  A controlled termination of the verified proxy child was followed by a
  logged restart and web/API/worker 200. A controlled termination of the
  verified idle worker child similarly re-registered and returned to 200.
  This proves supervised recovery for those cases, **not** the root cause of
  the intermittent native exit or long-term reliability.
- No verified SES sender or AWS staging account, real external customer
  delivery, AI provider, hosted deployment, or managed backup has been tested.
  The local verification preview is non-delivering. Do not treat this
  production-build rehearsal as a production deployment or external-delivery
  proof.

### Final lifecycle revalidation — 2026-10-14

- `prepare` now rejects a live supervisor before rebuilding, and validates
  that the PFX/PEM certificate pair matches without silently regenerating it.
  `start` waits for a worker IPC-ready signal from the newly registered worker
  as well as the HTTPS web/API/worker checks. The built-stack test waits for
  the same supervisor-ready signal and web page. A verified stale-supervisor
  recovery also stops only its isolated PostgreSQL cluster before clearing
  its marker. Shutdown checks child and database exits and reports incomplete
  cleanup instead of printing a false success message.
- After those changes, `pnpm format`, `pnpm format:check`, `pnpm lint`,
  `pnpm typecheck`, `pnpm db:validate`, `pnpm test`, `pnpm build`,
  `pnpm local:production:prepare`, `pnpm local:production:db-test`,
  `pnpm local:production:e2e`, `pnpm local:production:restore-test`, and
  `pnpm audit --prod --audit-level moderate` exited 0. Default tests were
  **236 passed / 32 intentionally skipped**; isolated DB tests were
  **268 passed / 0 skipped**; Chromium release tests were **6 passed / 0
  failed**. All 17 migrations were current on the isolated database.
- A normal built-stack start returned web/API/worker HTTP **200**, and
  certificate-pinned `curl` returned web `/login` **200** with TLS verification
  result **0**. A second `start` and an attempted `prepare` while it ran each
  failed as intended without disturbing the healthy stack. The supported
  `stop` exited 0, logged `worker.stopped`, and shut down only the isolated
  PostgreSQL cluster. Historical stalled worker-heartbeat rows remain as
  evidence from interrupted runs; the active worker passed readiness. The
  final normal restart/status is recorded separately in the handoff.
- Following the bounded proxy restart change, the final gates were rerun:
  formatting/check, lint, typecheck, Prisma validation, default tests
  (**236 passed / 32 skipped**), production build (Next **15.5.27**),
  isolated DB tests (**268 passed / 0 skipped**), HTTPS browser release gate
  (**6 passed / 0 failed**), restore rehearsal, and production dependency
  audit (no known moderate-or-higher vulnerabilities) all passed. A normal
  final start was left running; `pnpm local:production:status` returned
  supervisor/PostgreSQL running and web/API/worker **200**. Pinned TLS `curl`
  returned `/login` **200** with verification result **0**. The untrusted
  normal-browser certificate warning remains by owner choice; the
  intermittent native proxy exit remains unexplained despite verified
  bounded recovery.

### Interactive localhost follow-up — 2026-10-14

- The reported `Port 3000 is occupied` came from launching a second copy while
  this application's own HTTPS proxy already held port 3000. The existing
  supervisor, web, API, and worker were healthy (all readiness checks 200).
  `local:production:start` now reports an already-running healthy stack without
  launching a duplicate; it still refuses unknown port owners, unhealthy live
  supervisors, stale markers, and a mismatched disposable test database.
- The in-app browser's `ERR_CERT_AUTHORITY_INVALID` was caused by the known
  self-signed localhost certificate, not an API or authentication failure. The
  owner again chose **not** to trust that certificate in Windows. The built
  HTTPS stack was stopped cleanly, and the existing HTTP `pnpm dev` stack was
  started instead against the separate configured `ai_operations` development
  database. The browser opened `http://localhost:3000/login` with enabled form
  controls; API and worker readiness returned 200, and unauthenticated session
  returned the expected 401. This avoids certificate warnings without changing
  the Windows trust store. Records do not automatically move between the two
  local databases.
- Before switching modes, the guarded production-build Chromium gate passed
  **6/6** again against a disposable database. It included signup, local-only
  verification, onboarding, logout/login, persisted operational records,
  workflow approval/worker/notification/audit, route rendering, and failure
  recovery. The disposable database was removed by the guarded runner; the
  normal development database was not reset. This remains local verification,
  not hosted production proof.
- A fresh HTTP development start initially launched the worker while Nest watch
  was replacing `dist-dev`, causing a transient missing-module exit. The dev
  launcher now checks for an existing healthy stack **before** prerequisite
  builds and waits for API readiness and the compiled worker file before
  launching or retrying the worker. A clean restart showed no missing-module
  error; a second `pnpm dev` reported the existing healthy stack without
  rebuilding or starting duplicates. This resolves the observed startup race,
  not every possible watch-mode failure.
- The landing page's obsolete “No backend connection” footer and misleading
  “V1 capabilities” badge were corrected to distinguish persisted workspace
  features from planned AI/external providers. A missing favicon asset that
  returned 404 is now served from the existing brand palette; HTTP `/favicon.svg`
  returned 200. The final build, format check, lint, typecheck, default tests,
  and Prisma validation passed after the application changes. HTTP web `/login`,
  API readiness, and worker readiness each returned 200 after restart.

### Portfolio-readiness review — 2026-10-15

- The product definition still described the app as frontend-only and claimed
  that authentication, persistence, and business data did not exist. It has
  been corrected to distinguish locally verified capabilities from planned
  AI, customer delivery, and hosted operation. A
  [portfolio case study](PORTFOLIO-CASE-STUDY.md) now gives a truthful demo
  journey, engineering decisions, evidence, and release gates. This is
  documentation/presentation work, not a new product feature.
- `pnpm format:check` initially failed on `scripts/dev.mjs`. That file was
  formatted with the existing Prettier configuration; the full check then
  passed. `pnpm lint`, `pnpm typecheck`, `pnpm db:validate`, and `pnpm build`
  exited 0. The build included all 19 Next.js routes and used Next.js
  **15.5.27**. Default `pnpm test` finished **236 passed / 32 intentionally
  skipped / 0 failed**; the skipped cases are database integration tests, not
  successes. `pnpm db:migrate:status` reported **17 current migrations** on
  the normal local `ai_operations` database; no migration was applied here.
- The already-running HTTP development stack returned **200** for web `/`,
  `/login`, and `/signup`, API `/health/ready`, and worker `/health/worker`,
  including after the production build. This verifies process readiness and
  those anonymous routes, not the full authenticated journey in this review.
  The earlier guarded **6/6** Chromium release gate remains the latest
  completed browser journey. Direct observation of the current in-app browser
  was blocked by its URL security policy; no alternate-browser workaround was
  attempted and no fresh browser QA is claimed.
- The repository's guarded `local-db-integration.mjs` runner created a random
  `aop_test_*` schema in the reviewed localhost database, applied all **17**
  migrations, ran **268/268** tests across **43** files with **0 skipped or
  failed**, and removed only that generated schema. This did not reset or
  migrate the normal `public` application schema.
- Git remains on `main` with uncommitted changes and **no remote**. `.env`,
  build outputs, and `node_modules` are ignored; no environment file is
  tracked. This is ready for a reviewed GitHub handoff only after the owner
  provides the intended repository URL and the worktree is reviewed. No
  GitHub publication or hosted deployment occurred.
