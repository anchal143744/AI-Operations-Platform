# Deployment

## Release-gate process configuration

The repository does not provision AWS or a hosted database. Build immutable
artifacts with Node.js 22+ and pnpm 11.19.0. Install and build once, run reviewed
Prisma migrations as a **separate, single deployment step** against the intended
managed PostgreSQL database, then start three independently supervised
processes. Do not run `prisma migrate reset` or point a local test at a user
database.

```sh
pnpm install --frozen-lockfile
pnpm db:generate
pnpm build
pnpm db:migrate:deploy
```

| Process    | Exact command                       | Required configuration                                                                                                                                      |
| ---------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web        | `pnpm --filter @aop/web start`      | `NODE_ENV=production`, `PORT` (web listener), `NEXT_PUBLIC_API_ORIGIN` (public HTTPS API origin, supplied **at build time**)                                |
| API        | `pnpm --filter @aop/api start`      | `NODE_ENV=production`, `PORT` (API listener), `DATABASE_URL`, `APP_ORIGIN`, `AUTH_TOKEN_PEPPER`, `AUTH_EMAIL_TRANSPORT=ses`, `AWS_REGION`, `SES_FROM_EMAIL` |
| Worker     | `pnpm --filter @aop/api worker`     | `NODE_ENV=production`, `DATABASE_URL`, optional `OUTBOX_POLL_INTERVAL_MS`; no public listener/`PORT` is required                                            |
| PostgreSQL | Managed service, not a repo process | Private network, TLS, least-privilege database user, backups and restore rehearsal; inject `DATABASE_URL` into API/worker only                              |

`APP_ORIGIN` must be the **exact** HTTPS browser origin. Web and API must use
same-site HTTPS hostnames; the API allows only that origin for credentialed CORS
and rejects state-changing requests with a different `Origin`. The production
session cookie is host-only, Secure, HttpOnly, SameSite=Lax. `AUTH_TOKEN_PEPPER`
must be a unique random secret of at least 32 characters supplied by a secret
manager; do not reuse the `.env.example` placeholder. Never expose it or
`DATABASE_URL` to the browser. `NEXT_PUBLIC_API_ORIGIN` is intentionally public.
The API honors `PORT` in production; Next.js `next start` honors `PORT` for the
web. The worker does not listen on a public port.

Gate API traffic on `GET /health/ready` (database readiness), monitor
`GET /health/worker` separately (fresh worker heartbeat; 503 if absent/stalled),
and use `GET /health` only for API process liveness. Supervise web/API/worker
independently with restart and graceful termination. Authentication abuse
counters are now shared through an atomic PostgreSQL upsert, keyed by HMAC
digests of endpoint plus IP/account context. API replicas observe the same
limits, and authentication fails closed with 503 if the counter store is
unavailable. Deploy migration `20261008170000_shared_auth_rate_limits` before
the corresponding API version. The application does not trust arbitrary
`X-Forwarded-For` headers. Clients behind a reverse proxy may share one IP
bucket, though account buckets remain independent; review the trusted proxy
topology before multi-host exposure.

### Single-host supervised process package

`infra/Dockerfile` builds one immutable image for all three processes;
`infra/compose.production.yml` runs web, API, and worker with independent
restart policies and graceful-stop windows. It contains **no** PostgreSQL
container. Supply a managed PostgreSQL URL and secrets via an external secret
manager/deployment environment, never a committed `.env`. Build with the final
public API HTTPS origin, perform a reviewed managed-database backup, and apply
migrations as a separate operation before starting the application:

```sh
docker build -f infra/Dockerfile --build-arg NEXT_PUBLIC_API_ORIGIN=https://api.example.com -t aop/application:REPLACE_RELEASE_ID .
export AOP_IMAGE=aop/application:REPLACE_RELEASE_ID
docker compose --env-file /secure/path/to/deployment.env -f infra/compose.production.yml --profile operations run --rm migrate
docker compose --env-file /secure/path/to/deployment.env -f infra/compose.production.yml up -d web api worker
```

Replace the example domains and image tag. These commands do **not** imply
that a cloud environment or registry already exists. Terminate TLS at a
trusted reverse proxy in front of loopback-only host ports. API container
health uses `/health/ready`; web health requests `/login`. Monitor
`/health/worker` externally and alert on a non-200 response/stale heartbeat.
Compose is a single-host reference, not a multi-host orchestrator or a
substitute for managed-service monitoring. Roll back to the previous immutable
image only after confirming migration compatibility. Container execution has
not been validated locally because the Docker daemon is unavailable here.

### Browser release test (disposable local database only)

`pnpm test:browser` is an actual Chromium browser suite, not an HTTP smoke
test. It creates accounts and workflow records, so it deliberately refuses to
run unless `AOP_E2E_DISPOSABLE_DB=true` and `DATABASE_URL` points to a loopback
database or schema with `test` in its name. Apply migrations to that disposable
target first; do **not** start a separate `pnpm dev` session for the test. Use
`AUTH_EMAIL_TRANSPORT=development` only in local development so the UI can
show its single-use verification code. Install the Playwright Chromium browser
with `pnpm exec playwright install chromium` on an approved test host, then run
`pnpm test:browser`. On the confirmed local `ai_operations` instance,
`pnpm test:browser:local` safely creates, migrates, and removes a random
disposable test schema around that browser run. The runner starts and stops
its own `pnpm dev` stack and
refuses to reuse occupied web/API ports, so it cannot silently test a service
pointed at another database. Optional `AOP_E2E_WEB_ORIGIN` and
`AOP_E2E_API_ORIGIN` select the two local origins. Do not point this suite at
staging, production, or a personal development database; it does not clean up
accounts or records automatically. The isolated local-production runner
passed all six Chromium release-gate tests on 2026-10-14. No hosted browser
test or deployment has been verified. See
`docs/LOCAL-PRODUCTION-RUNBOOK.md` and `docs/RELEASE-READINESS-REPORT.md`.

## Current

The development Compose file defines PostgreSQL and Redis, but the current
application worker uses PostgreSQL outbox rows, not Redis. GitHub Actions
configures a disposable PostgreSQL service and a Chromium release gate. No
hosted environment, image publishing, managed backup, or CD is configured.

## Planned environments

Development uses local services and safe test credentials. Staging mirrors production topology and is the migration/integration gate. Production uses immutable container images, managed secrets, least privilege, TLS, health/readiness checks, autoscaling where measured, and controlled promotion.

Deployment order: backup/restore assurance → compatible expand migration → API/workers/web rollout → readiness and smoke checks → contract migration cleanup later. Failed releases roll back application code without destructive database reversal. Define RPO/RTO, automated backups, restore rehearsals, queue recovery, observability alerts, and incident runbooks before beta.

Phase 28 provides a separately runnable database-backed delivery worker (`pnpm --filter @aop/api worker`). Deploy the outbox migration before starting the worker. API instances may begin creating pending rows after the migration; worker replicas then claim rows with PostgreSQL row locks. Monitor pending age, processing leases, retry counts, permanent failures, and provider latency. Gracefully stop workers before application rollback. Redis/BullMQ is not part of this phase.

## AWS/SES staging target

AWS is the selected future deployment host; no AWS environment has been provisioned or verified here. A staging deployment needs a managed PostgreSQL database, a separately deployed API and outbox worker, TLS, secrets supplied by the platform, log/alert collection, backups and restore rehearsal, and a reviewed rollout/rollback procedure. `/health` is liveness; `/health/ready` checks database connectivity and should gate API traffic. The worker emits aggregate outbox counts and oldest pending age every minute; alert on sustained pending age, stale processing, terminal failures, and uncertain delivery. Do not log message bodies or credentials.

Authentication email can opt in to SES through `AUTH_EMAIL_TRANSPORT=ses`, `AWS_REGION`, and `SES_FROM_EMAIL`. Use IAM roles/default AWS credential resolution with only the required SES send permission, a verified sender identity, and SES production access in the chosen region. The SDK is configured for one send attempt; registration/recovery should not claim delivery unless the provider confirms it. This is not a customer-conversation adapter, and no live SES call or deliverability test has been completed.

Production API startup now refuses the non-delivering development email transport and an HTTP `APP_ORIGIN`. Use HTTPS custom domains that are same-site for web and API (for example, `app.example.com` and `api.example.com`), with `APP_ORIGIN` set to the exact web origin and `NEXT_PUBLIC_API_ORIGIN` to the API origin. The API uses host-only Secure/HttpOnly/SameSite=Lax session cookies and exact-origin CSRF checks; deploying web and API on unrelated sites requires a separate cookie/CSRF review. Do not route production traffic until a real SES verification and password-reset cycle succeeds in staging.

Before AWS staging promotion, verify the chosen region, SES sender identity and production access, task role IAM policy, HTTPS certificates, secret injection, managed PostgreSQL network/TLS, migration execution, `/health/ready`, backup/restore, logging and alerting, and release rollback. No infrastructure has been provisioned by this repository; these checks cannot be claimed as complete from local tests.

### Staging setup checklist for the account owner

Nothing in this checklist has been performed in an AWS account. The default placeholder region is `us-east-1`; change it deliberately if data residency or latency requires another region. SES identities and sandbox/production access must be checked in the selected region.

1. Create or select a dedicated AWS staging account. Enable MFA, billing alerts/budgets, and a least-privilege administrator process. Record its account ID outside the repository. Do not create long-lived application access keys.
2. Own a domain and plan same-site HTTPS web/API hostnames (for example, `app.example.com` and `api.example.com`). Prepare DNS and TLS certificates. The browser sends host-only secure cookies to the API; unrelated web/API sites are **not** supported by the current CSRF/cookie design.
3. In the `us-east-1` SES console, create a sender domain identity (preferred) or sender email identity. Publish SES-provided DNS verification and DKIM records, wait for verified status, and choose a `SES_FROM_EMAIL` address under that identity. See [AWS identity setup](https://docs.aws.amazon.com/ses/latest/dg/creating-identities.html). While SES is in the sandbox, use a verified recipient or the SES mailbox simulator for testing; arbitrary customer recipients are not available until production access is approved. See [verified identities](https://docs.aws.amazon.com/ses/latest/dg/verify-addresses-and-domains.html) and [production access](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html).
4. Create a dedicated API task role (for example, an ECS task role) with only `ses:SendEmail` for the verified SES identity ARN and a `ses:FromAddress` condition for the selected sender. Replace all values in the illustrative policy below. Do **not** use `ses:*` or put static AWS credentials in `.env`. See [AWS SES IAM guidance](https://docs.aws.amazon.com/ses/latest/dg/control-user-access.html) and [SDK credential resolution](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-credentials-node.html).

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": "ses:SendEmail",
         "Resource": "arn:aws:ses:us-east-1:REPLACE_ACCOUNT_ID:identity/REPLACE_VERIFIED_DOMAIN",
         "Condition": {
           "StringEquals": {
             "ses:FromAddress": "no-reply@REPLACE_VERIFIED_DOMAIN"
           }
         }
       }
     ]
   }
   ```

5. Provision a private managed PostgreSQL staging database and separately deployed API, Next.js web server, and outbox worker. Supply `DATABASE_URL`, a strong `AUTH_TOKEN_PEPPER`, `APP_ORIGIN`, `NEXT_PUBLIC_API_ORIGIN`, `AUTH_EMAIL_TRANSPORT=ses`, `AWS_REGION=us-east-1`, and `SES_FROM_EMAIL` through managed deployment configuration. Do not commit values. Review TLS, network access, backup retention, and restore procedure. `NEXT_PUBLIC_API_ORIGIN` is a public build-time browser configuration value, not a secret.
6. Apply reviewed Prisma migrations to staging, then start the API and worker. Gate API traffic on `/health/ready`, monitor aggregate outbox status, and confirm that no customer-message provider is enabled. In a staging account only, exercise registration → verification, forgot-password → reset, login/logout, tenant isolation, and one TEST-adapter outbox cycle. Keep real customer addresses/data out of tests.
7. Configure SES bounce/complaint monitoring and an incident owner before accepting unrestricted signups. Do not claim send success from an SES `MessageId` alone: it confirms provider acceptance, not inbox delivery. Rehearse database restore and application rollback, then request SES production access only when the sender identity and handling process are ready.

No live SES call, AWS deployment, verified identity, IAM role, domain, or staging database exists from this local implementation. Until the account owner completes these steps, leave `AUTH_EMAIL_TRANSPORT=development` for local development only; production startup intentionally rejects that non-delivering transport.

SES `SendEmail` does not expose a client idempotency token. A timeout after a send attempt has an unknown outcome: a blind retry can duplicate mail. The outbox worker therefore stops automatic retry for non-idempotent providers after an ambiguous attempt and records `DELIVERY_OUTCOME_UNKNOWN` for operator reconciliation. Never treat that state as delivered or retry it automatically without provider-level reconciliation.
