# Database

PostgreSQL is the system of record and Prisma owns versioned application migrations.

## Phase 20 implemented

The initial migration creates `User`, `Organization`, `Workspace`, and `Membership`. Users may hold one membership lifecycle record per organization. Organizations are tenant boundaries and may own multiple workspaces. V1 membership roles are `OWNER`, `ADMIN`, `MANAGER`, `SALES`, and `VIEWER`.

Tenant-owned foundation tables exist for Lead, Conversation, FollowUp, AI Operation, Workflow, Approval Request, Activity Event, and Workspace Settings. Phase 20 intentionally adds only ownership, timestamps, and safe cross-domain references; feature fields and state machines remain for their owning phases.

Every tenant-owned row stores both `organization_id` and `workspace_id`. Its composite foreign key targets `(workspace.id, workspace.organization_id)`, so a mismatched organization/workspace pair cannot be inserted. Cross-domain references use `(resource_id, organization_id, workspace_id)`, preventing a conversation, follow-up, AI operation, approval, or activity event from referencing a resource in another tenant.

Global organization slugs are unique. Workspace slugs are unique within an organization. Migration-level checks require canonical lowercase slugs and normalized lowercase email values. A stronger unique constraint on `(user_id, organization_id)` prevents duplicate active memberships and parallel inactive duplicates; status transitions retain the same membership identity.

All important foreign keys use `ON DELETE RESTRICT`; tenant history is not cascade-deleted. Activity events omit an update timestamp and the migration installs a PostgreSQL trigger that rejects updates and deletes, making normal application activity append-only. Retention or correction requires an explicit, reviewed migration.

Production schema changes never use `db push` or destructive resets. Migrations are reviewed, applied by deployment automation, tested on a disposable PostgreSQL database, and paired with backup/restore procedures.

## Not implemented

Authentication, sessions, RBAC enforcement, feature APIs, feature state machines, row-level security, queues, AI processing, approval decisions, workflow execution, integrations, and analytics are not implemented.
