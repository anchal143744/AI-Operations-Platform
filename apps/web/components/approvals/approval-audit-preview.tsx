import { Card } from "../ui/primitives";

const futureEvents = [
  "Review requested",
  "Policy evaluated",
  "Reviewer opened request",
  "Action approved",
  "Action rejected",
  "Action edited",
  "Action executed",
] as const;

export function ApprovalAuditPreview() {
  return (
    <Card className="approval-audit-preview">
      <p className="app-kicker">Audit trail</p>
      <h2>Decisions leave evidence</h2>
      <div className="ops-panel-empty">No approval activity recorded yet.</div>
      <p>Future events: {futureEvents.join(" · ")}</p>
    </Card>
  );
}
