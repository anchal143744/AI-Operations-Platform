# Worker operations (current foundation)

The outbox is PostgreSQL-backed. `pnpm dev` builds the API into `apps/api/dist-dev`
and starts the web, API watch process, and one separately compiled worker from
that development output. `pnpm build` writes the production API into
`apps/api/dist`; the two outputs are independent. Production must run
`pnpm --filter @aop/api worker` as an independently supervised service after
`pnpm db:migrate:deploy` and `pnpm --filter @aop/api build`. Do not run a
production worker from Next.js or an HTTP request handler.

## Health and telemetry

- `GET /health` is API process liveness. `GET /health/ready` checks PostgreSQL
  only. Neither asserts background processing.
- `GET /health/worker` checks persisted worker heartbeats. It returns 200 only
  with at least one heartbeat younger than 20 seconds and no poll in flight
  longer than 90 seconds and fewer than three consecutive poll failures;
  otherwise 503 `WORKER_NOT_READY`. The public response reports readiness only;
  aggregate active/stalled counts are in worker logs, not tenant data or host IDs.
- Each worker registers a random process ID in `worker_heartbeats`, updates its
  heartbeat every five seconds, and marks it stopped after completing the
  current job on SIGINT/SIGTERM or the local supervisor's IPC shutdown request.
  Windows development uses IPC because terminating a child process there does
  not reliably deliver a catchable POSIX signal. A crash leaves an unclosed row that is counted
  as stalled. Rows are operational metadata, not audit events. Define a
  retention policy before long-running production deployment.
- Worker stdout emits one-line JSON for startup, shutdown, attempt outcomes,
  heartbeat failures, poll failures, and a 60-second aggregate snapshot. The
  snapshot includes pending/processing/failed outbox counts, pending retries,
  retry exhaustion, stale leases, oldest pending age, and running/failed/stale
  execution counts. It never includes message text, tenant IDs, credentials,
  or provider payloads. Collect/alert on these logs in the deployment platform;
  no hosted metrics/alerting service is connected yet.

## Supervision and recovery

Run one worker on a single host. A supervisor must restart an exited worker
with bounded backoff, forward SIGTERM, grant at least 60 seconds of termination
grace (the provider timeout is 30 seconds plus database finalization), and
alert if `/health/worker` is non-200, stalled workers appear, failed/retry
exhausted counts rise, or pending age grows. Do not interpret HTTP API readiness
as worker readiness. Local `pnpm dev` performs bounded worker restarts but is
not a production process supervisor.

Multiple worker hosts may share one migrated PostgreSQL database: outbox claims
use `FOR UPDATE SKIP LOCKED` and lock tokens, workflow execution transitions
are compare-and-set, and the internal notification is unique per execution.
Workers do not need a distributed leader for this bounded queue. This is
**at-least-once**, not exactly-once external delivery. A worker killed between
an external provider accepting a request and the database commit can leave an
uncertain result; only a provider that honors the persisted idempotency key is
safe for automatic resend. Non-idempotent adapters fail closed for manual
reconciliation. Stale outbox leases recover after five minutes; bounded retries
stop at the configured attempt ceiling. Authentication abuse counters are now
shared through PostgreSQL across API hosts; this does not itself certify a
multi-host rollout. Proxy attribution, managed database capacity, supervision,
and staging failover must still be verified.

Deployment order: migrate database, deploy API/web, start supervised worker,
verify `/health/ready` and `/health/worker`, then exercise a tenant-scoped
internal notification workflow in staging. Rollback should stop new workers
before reverting application code; do not roll back an additive migration by
dropping the heartbeat table while workers use it. Backup/restore, hosted
alerts, fault-injection soak, and staging failover remain release gates.
