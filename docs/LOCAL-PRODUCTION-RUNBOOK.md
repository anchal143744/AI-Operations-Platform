# Local production-build runbook (Windows, updated 2026-10-14)

This is a **loopback-only production-build rehearsal**, not a public deployment.
It runs the built Next.js web app, built Nest API, built outbox worker, an
independent PostgreSQL 16 cluster, and a local HTTPS reverse proxy. It does not
use the normal `ai_operations` database or its `public` schema. No AWS, SES,
external communication, or AI provider is connected.

## Requirements and boundaries

- Node.js 22+, pnpm 11.19.0, PostgreSQL 16 command-line binaries, and the
  Playwright Chromium installation for browser tests. Default PostgreSQL bin
  directory is `C:\Program Files\PostgreSQL\16\bin`; set `AOP_PG_BIN` to a
  different PostgreSQL 16 bin directory if necessary.
- Ports 3000, 4000, 3100, 4100, and 55432 must be available. Public-facing
  listeners and the isolated database bind to `127.0.0.1` only. The web, API,
  and worker are separate child processes; the worker and HTTPS proxy have
  bounded restart/backoff after an unexpected exit. If web or API exits, or
  either restart budget is exhausted, the local supervisor stops the stack.
  This is not a multi-host supervisor.
- Active local state is now under
  `%LOCALAPPDATA%\AI-Operations-Platform\local-production`, outside the
  OneDrive-synced repository. Its `postgres-utf8` directory is the active
  PostgreSQL cluster; `config.json`, certificates, logs, and a retained logical
  backup are also there. The old `.local-production/` directory in the project
  is an **inactive recovery source**, not the active database. Do not start its
  cluster on the same port or delete it until backups are independently
  verified and it is no longer needed. Both locations contain sensitive local
  material; protect them with Windows account/disk controls and do not share
  them. Local storage is not managed backup or disk-failure recovery. No normal
  `.env` setting is overwritten by the runner.
- The API uses production validation, production Secure/HttpOnly session
  cookies, CORS/CSRF origin checks, and a non-delivering authentication email
  preview **only** when `AOP_LOCAL_PRODUCTION=true`, `NODE_ENV=production`,
  `APP_ORIGIN=https://localhost:3000`, and the development mail transport are
  all selected by the local runner. The API binds to loopback in this mode.
  This is unsuitable for real user signups or network deployment. No
  verification code is printed to server logs.

## Prepare, start, check, stop

Run from the repository root in PowerShell:

```powershell
pnpm install --frozen-lockfile
pnpm local:production:prepare
pnpm local:production:start
```

`prepare` creates the separate UTF-8 PostgreSQL cluster and
`aop_local_production` database if absent, applies reviewed Prisma migrations,
generates a localhost-only certificate, builds packages/API/web, and stops the
isolated database again. It does not reset or migrate the normal database.
It records the Next.js build ID made with
`NEXT_PUBLIC_API_ORIGIN=https://localhost:4000`. A later plain `pnpm build`
can replace that build with one targeting the wrong API origin; `start` rejects
the mismatch. Run `pnpm local:production:prepare` again after an ordinary build.
`start` runs the four processes in the foreground; keep that terminal open.
For a combined prepare-and-start, use `pnpm local:production`. A repeated
`start` against this same healthy supervised stack reports that it is already
running and exits successfully without launching another copy. Unknown port
owners, an unhealthy live supervisor, and stale supervisor markers still stop
startup for inspection. The application is at
`https://localhost:3000`, the API at `https://localhost:4000`.

In another terminal:

```powershell
pnpm local:production:status
$localPem = Join-Path $env:LOCALAPPDATA 'AI-Operations-Platform\local-production\certificates\localhost.pem'
curl.exe --cacert $localPem https://localhost:4000/health/ready
curl.exe --cacert $localPem https://localhost:4000/health/worker
```

Both health endpoints must return HTTP 200. `status` also checks the recorded
supervisor, isolated PostgreSQL cluster, and HTTPS web `/login` (all must be
healthy for exit code 0). `/health/ready` checks API/database
readiness; `/health/worker` checks a fresh worker heartbeat. An unauthenticated
`/auth/session` returning HTTP 401 is expected. The Next.js HTTP message may
show internal `http://127.0.0.1:3100`; that is not the browser origin.
Historical worker heartbeat rows may be reported as stalled after interrupted
local runs. The active worker's readiness and outbox progress are checked
separately. Do not delete these rows merely to clear the metric; investigate if
the stalled count grows.

The generated certificate is self-signed. Tests and the example `curl`
commands trust **only this certificate**. A normal browser may show a
certificate warning because it is not installed in a Windows trusted-root
store. The runner never adds root trust. Do not bypass TLS validation or
install it in a machine-wide store. Any later trust decision needs separate
owner approval after reviewing the active certificate thumbprint.
The current active certificate has SHA-1 thumbprint
`9CF80F907AD0E5F3D914DFE4E184D86FA8AE1FCF` and expires 2027-01-13.
It is not in the trusted-root store; the owner explicitly chose **not** to
trust it.
Recheck the thumbprint against the active `.cer` file if that choice changes.
Without trust, ordinary browser access
is not verified as warning-free; the certificate-pinned Chromium release tests
still exercise HTTPS and Secure cookies. For interactive local use without
changing Windows certificate trust, stop this stack with
`pnpm local:production:stop`, then start the separate `pnpm dev` HTTP stack and
open `http://localhost:3000`. That mode reads the repository's `.env` and its
configured development database, **not** the isolated `aop_local_production`
database. Accounts and records do not automatically move between these modes.
Never browse the production build's internal port 3100 as an HTTP substitute:
its API origin and Secure cookies are configured for HTTPS.

Read web, API, worker, and proxy logs in the `start` terminal. PostgreSQL logs
are in `%LOCALAPPDATA%\AI-Operations-Platform\local-production\postgres.log`.
From another terminal, run
`pnpm local:production:stop` and wait for the supervisor to drain the worker,
stop the app services, and print `Local production-build stack stopped`. This
preserves the database. On Windows, terminal Ctrl+C can terminate the process
group before graceful worker cleanup, so use the explicit stop command for
normal shutdown. Restart with `pnpm local:production:start`; `prepare` is needed
after an ordinary build or source/dependency or migration changes. A second
`start` only succeeds as a readiness report for the same healthy supervisor;
it does not create another process group. If the supervisor has died
but its marker remains, first inspect the PID and ports. Then
`pnpm local:production:recover` first stops only the verified isolated
PostgreSQL cluster if it survived the dead supervisor, then removes the stale
marker and its stop request. It refuses recovery when an application port is
still occupied, and does not delete database files. Do not use
`prisma migrate reset`.

## Verification and disposable tests

With the foreground stack **stopped** and ports free:

```powershell
pnpm local:production:e2e
pnpm local:production:db-test
pnpm local:production:restore-test
```

`e2e` creates a randomly named database **inside the isolated cluster**,
applies all migrations, starts the built web/API/worker/HTTPS stack, runs all
six browser release-gate tests, checks persisted User, Workflow,
Notification, and Activity row counts across a normal stack restart, then
stops its stack and removes only that generated test database. It refuses
occupied web/API ports. The browser suite covers registration/verification,
login, onboarding, persisted Leads/Conversations and their detail pages,
workflows/policies/approvals, outbox worker, internal notification, audit,
signed-out boundaries, and desktop/mobile route layout.
`restore-test` runs a custom `pg_dump` of **only the isolated local-production
database**, restores it into a generated database in the isolated cluster,
checks Prisma connection, migration history and operational row counts, and
removes only the generated restore target and temporary archive. It does not
restore over the source. Preserve a separate encrypted backup if you need
long-term recovery; this command is a rehearsal, not a retention policy.
`db-test` runs every Vitest suite with database integration enabled against a
different generated database in the isolated cluster, then removes that test
database. It never uses the normal `ai_operations` database.

To retain a logical backup of the isolated application database while the
local stack is running, use PowerShell from the repository root. The password
is read locally and is never put in a command argument or printed. The dump
remains in the non-synced local directory; copy it separately to a protected
location if it needs to survive disk failure.

```powershell
$localState = Join-Path $env:LOCALAPPDATA 'AI-Operations-Platform\local-production'
$backupDirectory = Join-Path $localState 'backups'
New-Item -ItemType Directory -Force -Path $backupDirectory | Out-Null
$localConfig = Get-Content (Join-Path $localState 'config.json') -Raw | ConvertFrom-Json
$env:PGPASSWORD = $localConfig.databasePassword
$backupFile = Join-Path $backupDirectory ('aop-local-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.dump')
try {
  & 'C:\Program Files\PostgreSQL\16\bin\pg_dump.exe' -h 127.0.0.1 -p 55432 -U aop_local_runtime -d aop_local_production --format=custom --no-owner --no-acl "--file=$backupFile"
  if ($LASTEXITCODE -ne 0) { throw 'Local backup failed; do not treat the dump as valid.' }
} finally {
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
  Remove-Variable localConfig -ErrorAction SilentlyContinue
}
```

For the automated restore into a **new generated database**, stop the stack
and run `pnpm local:production:restore-test`. It makes a fresh dump rather
than restoring an older retained archive; a retained-archive disaster-recovery
procedure still needs a separate explicit, reviewed target and verification.

During the October 2026 move away from OneDrive, a verified custom-format
archive of the former isolated database was retained at
`%LOCALAPPDATA%\AI-Operations-Platform\local-production\backups\aop-before-storage-migration-20261013-202227.dump`
(SHA-256 `7921BDA6C944D87B7CDEBD6ADA057862D236D217A54B361A70CC1FAA44959F7A`).
It was restored only to the newly initialized isolated database. The original
cluster remains in the repository as an inactive recovery source. Do not
delete either copy without an explicit retention decision and another
independently verified backup.

The default `pnpm test` skips DB integration tests by design. The existing
`node --env-file=.env scripts/local-db-integration.mjs` script runs the full
DB suite against a guarded disposable schema in the normal local database,
so **do not invoke it** if your policy is to leave that database completely
untouched. Run it only after reviewing that exact target and accepting its
create/drop of a generated test schema. `pnpm local:production:e2e` does not
touch the normal database.

## Troubleshooting and actual review status

| Check                                                        | Status      | Detail                                                                                                                                                                 |
| ------------------------------------------------------------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Built web/API/worker + isolated PostgreSQL + HTTPS readiness | **PASS**    | 200 API and worker readiness; HTTPS `curl` verified with the local certificate.                                                                                        |
| Production-build browser workflow                            | **PASS**    | Six release-gate tests passed against the final HTTPS production rebuild; 0 failed, including Lead/Conversation persistence.                                           |
| Isolated PostgreSQL integration                              | **PASS**    | All 43 files and 268 tests passed against a generated migrated database; 0 failed, 0 skipped.                                                                          |
| Database persistence/restart                                 | **PASS**    | User, Workflow, Notification, and Activity row counts were nonzero and unchanged after stopping/restarting the built stack.                                            |
| Explicit graceful local stop/restart                         | **PASS**    | `pnpm local:production:stop` drained the worker, stopped the isolated database and released all service ports; the next start reached readiness.                       |
| Local backup/restore                                         | **PASS**    | Custom dump restored to generated DB; Prisma, migration count and operational counts matched.                                                                          |
| Normal-browser trust without warning                         | **BLOCKED** | Current-user certificate trust needs interactive owner confirmation.                                                                                                   |
| Docker image/container runtime                               | **BLOCKED** | Docker Desktop Linux backend crashes before Engine readiness in optional Model Runner/Inference socket handling. No container was built/run; no Docker data was reset. |
| External email/AI/customer delivery                          | **NOT RUN** | No provider credentials, verified identity, or permission were supplied. Local verification preview sends nothing.                                                     |
| Public production release                                    | **NOT RUN** | No hosting/domain/managed backup/SES identity; not requested for this local mission.                                                                                   |

One disposable browser launch exited before readiness without a conclusive
diagnostic. Separately, one restart served an unexpected certificate and a
supervisor failed to stop within 90 seconds. After verifying exact PIDs and
the isolated data path, that run was stopped and recovered. A later normal
startup saw the HTTPS proxy exit with Windows code `3221226505`; the
supervisor stopped the stack cleanly, but the underlying native exit has no
confirmed root cause. Bounded proxy supervision was added, then a deliberate
stop of the **verified app-owned** proxy child recovered to web/API/worker 200;
the idle worker was also deliberately stopped and recovered to readiness.
These checks do not explain the native proxy exit. Subsequent direct
startup/shutdown and the complete six-test run passed. A plain
`pnpm build` also replaced the local web build with a wrong API origin and
caused five browser tests to fail; the build-identity guard now refuses such
an artifact, and a fresh `prepare` produced the passing six-test run. These
are historical failures, not passing results. If a shutdown or certificate
mismatch recurs, preserve and inspect the supervisor output before retrying.

If the app cannot start, check the five ports, run `pnpm local:production:status`,
inspect the foreground output and
`%LOCALAPPDATA%\AI-Operations-Platform\local-production\postgres.log`, and verify
PostgreSQL 16 binaries exist. If the certificate is rejected, use the local
PEM with `curl --cacert` or review/approve current-user trust; never set
`NODE_TLS_REJECT_UNAUTHORIZED=0`. If migration fails, stop and inspect the
isolated target; never reset either database. If worker readiness is 503,
inspect worker logs/heartbeat and retry after a clean restart. Docker Desktop
needs separate vendor/environment repair; the native runtime does not depend
on it.
