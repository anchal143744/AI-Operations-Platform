import { Badge, Card } from "../ui/primitives";

export function ApprovalPolicyPanel() {
  return (
    <Card className="approval-policy-panel" id="approval-policy">
      <p className="app-kicker">Approval policy</p>
      <h2>Boundaries before execution</h2>
      <p>
        Current policies control manual dry runs and internal notifications.
        Internal notifications always require human review. External actions
        remain unavailable.
      </p>
      <div className="approval-policy-states">
        <Badge>Allow dry run</Badge>
        <Badge tone="warning">Human approval required</Badge>
        <Badge>Blocked</Badge>
      </div>
      <div className="approval-policy-empty">
        <strong>Policy evaluation</strong>
        <span>
          Each request records its applied policy version and outcome.
          Customer-facing execution policies are not enabled.
        </span>
      </div>
    </Card>
  );
}
