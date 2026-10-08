# AI Architecture

## Current

Provider keys are represented only in the environment example. The `/ai-operations` frontend route defines an empty, typed operational queue; `/approvals` defines the separate empty human-decision boundary; `/activity` defines the empty historical record; and `/settings` prepares bounded AI configuration intent. No model call, prompt, extraction, score, recommendation, draft, policy decision, approval, execution, configuration persistence, or AI activity record is implemented. Settings defaults AI action permission to proposal-only and cannot grant runtime authority.

## Planned pipeline

Normalize input → classify task → assemble tenant-approved context → call a provider adapter → require versioned structured output → schema-validate → apply deterministic business rules → persist prompt/model/schema versions, evidence, confidence, latency, usage, and outcome → route to approval or safe fallback.

Extraction explicitly represents unknown/missing fields and uncertainty. Qualification returns score, classification, reasons, evidence, and confidence; deterministic bounds and configurable policies remain authoritative. Drafting may use only approved facts and must withhold or ask about unverified price, discount, availability, delivery, or contractual terms.

Safety includes prompt/data separation, tenant-scoped retrieval, narrow tool permissions, no direct side effects, budget/time limits, output validation, retry/circuit-breaker behavior, content minimization, audit, and human approval. Evaluation datasets cover realistic enquiries, ambiguity, invalid output, injection, unsupported claims, provider outage, latency, and regression by prompt/model version.

Phase 19 confirms the intended authority chain remains explicit: AI output is a proposal, policy evaluation is a separate server-side decision input, human approval is a separately authenticated decision, execution is owned by an application/workflow service, and activity is an append-only historical projection. UI confidence controls and proposal fields cannot authorize an action.
