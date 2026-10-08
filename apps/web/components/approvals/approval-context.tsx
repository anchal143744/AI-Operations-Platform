import { approvalContextLinks } from "../../lib/approvals/model";
import { Card } from "../ui/primitives";

export function ApprovalContext() {
  return (
    <Card className="approval-context-card">
      <p className="app-kicker">Business context</p>
      <h3>No operational context linked</h3>
      <p>
        Lead, conversation, follow-up, AI operation, and workflow references
        will appear only when a real request supplies them.
      </p>
      <nav aria-label="Approval context destinations">
        {approvalContextLinks.map((item) => (
          <a href={item.href} key={item.type}>
            {item.label}
          </a>
        ))}
      </nav>
    </Card>
  );
}
