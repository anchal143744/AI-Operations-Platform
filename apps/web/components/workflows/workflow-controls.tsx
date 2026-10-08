import {
  workflowControlStages,
  workflowSafetyPrinciples,
} from "../../lib/workflows/model";
import { Icon } from "../icons";
import { Badge, Card } from "../ui/primitives";
import Link from "next/link";

export function WorkflowControlPanel() {
  return (
    <Card className="workflow-control">
      <p className="app-kicker">Workflow control</p>
      <h3>Structured from signal to evidence</h3>
      <p>
        Automation should be deterministic, permission-aware, policy-controlled,
        and auditable.
      </p>
      <div>
        {workflowControlStages.map((stage, index) => (
          <span key={stage}>
            <small>{String(index + 1).padStart(2, "0")}</small>
            <strong>{stage}</strong>
            {index < workflowControlStages.length - 1 ? (
              <Icon name="arrow-right" size="small" />
            ) : null}
          </span>
        ))}
      </div>
    </Card>
  );
}
export function AIWorkflowConnection() {
  return (
    <section
      className="ai-workflow-connection"
      aria-labelledby="ai-workflow-title"
    >
      <div>
        <p className="app-kicker">
          Future AI connection · Architecture preview
        </p>
        <h2 id="ai-workflow-title">
          AI proposes. Workflow carries an approved decision forward.
        </h2>
      </div>
      <div>
        {[
          "AI recommendation",
          "Policy evaluation",
          "Workflow",
          "Human approval if required",
          "Action",
          "Audit",
        ].map((step, index) => (
          <div key={step}>
            <span>{index + 1}</span>
            <strong>{step}</strong>
            {index < 5 ? <Icon name="arrow-right" size="small" /> : null}
          </div>
        ))}
      </div>
    </section>
  );
}
export function WorkflowSafety() {
  return (
    <Card className="ops-panel workflow-safety">
      <p className="app-kicker">Automation safety</p>
      <h3>Guardrails are part of the workflow</h3>
      <div className="policy-states">
        {workflowSafetyPrinciples.map((principle) => (
          <Badge key={principle}>Planned · {principle}</Badge>
        ))}
      </div>
      <p>
        The current engine supports manual dry runs and approval-gated internal
        notifications. The worker retries bounded failures; external actions, AI
        decisions, and customer delivery remain unavailable.
      </p>
    </Card>
  );
}
export function WorkflowActivity() {
  return (
    <Card className="ops-panel">
      <p className="app-kicker">Workflow activity</p>
      <h3>Operational history</h3>
      <p>
        Workflow, policy, review, and dry-run transitions are recorded in the
        workspace activity log.
      </p>
      <Link href="/activity">View activity</Link>
    </Card>
  );
}
