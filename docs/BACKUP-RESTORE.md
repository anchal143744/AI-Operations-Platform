# PostgreSQL backup and restore runbook

This runbook is for a **managed** PostgreSQL service. No cloud database or
backup policy is provisioned by this repository. The account owner must set
an RPO/RTO, retention, encryption key, backup schedule, operator access, and
restore rehearsal cadence before accepting production data.

1. Enable the managed provider's automated backups and point-in-time recovery.
   Monitor the last successful backup and alert when it exceeds the approved
   RPO. Keep backup credentials separate from the application database role.
2. Before each schema migration, retain a provider snapshot and record the
   release/image tag, migration status, and snapshot identifier in the change
   record. The application never runs migrations at process startup.
3. For an independent logical export, configure `PGSERVICE` and `PGPASSFILE`
   outside the repository. Run `pg_dump --format=custom --no-owner --no-acl
--file=/encrypted/backups/aop-REPLACE_TIMESTAMP.dump` from a secured host.
   Do not put a credential-bearing connection URL in shell history or CI logs.
4. Rehearse recovery into a **new empty disposable database**, never over the
   live database. Configure its separate `PGSERVICE` and run
   `pg_restore --exit-on-error --no-owner --no-acl
--dbname=REPLACE_DISPOSABLE_DATABASE
/encrypted/backups/aop-REPLACE_TIMESTAMP.dump`. Validate migration history,
   tenant foreign keys, row counts, API readiness, and a representative
   authenticated workflow without external sends. Record measured restore
   time, backup age, and any errors.
5. On a failed compatible application release, stop workers, roll back the
   web/API/worker image together, and verify readiness and outbox progression.
   Do **not** reverse an additive migration by dropping tables in place. If a
   data restore is required, follow incident approval, isolate the live
   endpoint, restore into a new managed instance, verify, then repoint traffic.

PostgreSQL 16 binaries are installed outside the local PATH. On 2026-10-13,
`pnpm test:backup:local` created and migrated a random disposable schema in
the confirmed loopback `ai_operations` database, inserted one synthetic probe
row, dumped only that schema, restored it, verified the row and all 17
migration records, then removed the generated schema and archive. The script
refuses remote or unknown database targets. This is a local logical restore
rehearsal, **not** evidence of managed backup retention, point-in-time
recovery, RPO/RTO, or a hosted restore. A separate staging restore into a new
disposable database remains a release gate. Docker Engine was unavailable.
