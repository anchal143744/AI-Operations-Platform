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

**Current, locally verified:** PostgreSQL-backed identity and workspace onboarding; server-side sessions; tenant-scoped RBAC; Leads, Conversations, Follow-ups, Dashboard counts, and Activity; general workspace settings; versioned manual workflows with explicit policy outcomes, human approval, a transactional outbox, supervised worker, dry-run/internal-notification actions, and audit records. These paths are exercised by local unit, disposable-database integration, and Chromium release-gate tests. The two `demo-*` detail routes use isolated synthetic fixtures; they are not customer records.

**Not yet operational:** AI understanding, qualification/scoring, generated drafts, inbound website/email ingestion, external customer message delivery, automatic follow-up based on replies, most advanced settings, team invitations, and analytics beyond current dashboard aggregates. These capabilities must not be described as implemented. Authentication email has an optional SES adapter, but no verified AWS sender or live delivery test; local verification preview does not send mail.

**Deployment status:** The production build works as a local portfolio demonstration, not as a verified hosted release. Public signups and customer operations require trusted HTTPS, managed PostgreSQL and restore proof, deployed web/API/worker supervision, a verified email sender, and hosted security/browser checks. See the [release-readiness report](RELEASE-READINESS-REPORT.md) and [portfolio case study](PORTFOLIO-CASE-STUDY.md) for exact evidence and limitations. Future integrations and richer AI should be added only after those boundaries are verified.
