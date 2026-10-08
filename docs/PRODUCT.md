# Product Definition

## Target customer

Small and medium B2B companies that receive enquiries through websites and email and still perform substantial sales and operations work manually.

## Problem and value proposition

Teams repeatedly read enquiries, re-enter data, qualify opportunities, draft responses, assign ownership, track replies, and follow up. The platform turns that work into a controlled, observable workflow: AI suggests, schemas validate, policies constrain, humans approve important actions, and software executes.

## V1 scope

Website/email ingestion; normalized messages; strict AI extraction; tenant-scoped leads; qualification/scoring; response drafts; risk-based approval; provider-abstracted email; deterministic follow-ups; reply cancellation; activity/audit records; and database-backed analytics.

## Non-goals

No payroll, HR, accounting, ERP, inventory, custom model training, mobile apps, broad integration catalog, enterprise billing, social media management, unrestricted agents, premature microservices, visual workflow builder, or giant CRM surface.

## Primary user journeys

1. A customer submits an enquiry; the system validates, extracts, creates, and scores a lead.
2. A sales user reviews the lead and an evidence-bound draft.
3. An authorized approver approves, edits, or rejects the draft before sending.
4. The system schedules idempotent follow-ups and cancels them when a reply is detected.
5. Managers inspect the activity history and real operational metrics.

## Success metrics

Workflow completion rate, extraction field accuracy, median response time, send/follow-up reliability, duplicate-send rate, hours saved, adoption, conversion impact, approval turnaround, incident rate, and willingness to pay.

## Current, planned, future

Current: tooling/documentation foundation and the frontend-only Pages 01–18 journey. Activity defines cross-domain event, actor, context, status, filter, and audit-control contracts over an intentionally empty event collection. Settings provides typed, in-memory workspace, team, role/permission, AI, approval-policy, workflow, integration, notification, security, and danger-zone surfaces. Settings edits are not persisted; provider connections, invitations, authorization, security enforcement, and destructive operations remain unavailable. The detail views remain the only visibly labelled synthetic business fixtures. Phase 19 audited and tightened navigation, accessibility, domain boundaries, service contracts, shared-package exports, repository hygiene, and documentation without adding product functionality. Authentication, persistence, tenancy enforcement, workspace creation, notifications, communications, scheduling, audit storage, configuration services, and business data do not exist yet. Planned: the backend foundation and V1 business workflow described above. Future: additional channels, richer knowledge retrieval, configurable builders, and integrations only after evidence justifies them.
