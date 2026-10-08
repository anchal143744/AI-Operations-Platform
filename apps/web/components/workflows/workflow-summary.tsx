import { workflowSummaryItems } from "../../lib/workflows/model";
import { Card } from "../ui/primitives";

export function WorkflowSummary() {
  return (
    <section className="ops-summary" aria-labelledby="workflow-summary-title">
      <h2 className="sr-only" id="workflow-summary-title">
        Workflow summary
      </h2>
      {workflowSummaryItems.map((item) => (
        <Card className="ops-summary-card" key={item.label}>
          <span>{item.label}</span>
          <strong aria-label={`${item.label}: no data`}>—</strong>
          <small>{item.description}</small>
        </Card>
      ))}
    </section>
  );
}
