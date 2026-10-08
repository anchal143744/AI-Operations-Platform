import { approvalSummaryItems } from "../../lib/approvals/model";
import { Card } from "../ui/primitives";

export function ApprovalSummary() {
  return (
    <section className="ops-summary" aria-labelledby="approval-summary-title">
      <h2 className="sr-only" id="approval-summary-title">
        Approval summary
      </h2>
      {approvalSummaryItems.map((item) => (
        <Card className="ops-summary-card" key={item.label}>
          <span>{item.label}</span>
          <strong aria-label={`${item.label}: no data`}>—</strong>
          <small>{item.description}</small>
        </Card>
      ))}
    </section>
  );
}
