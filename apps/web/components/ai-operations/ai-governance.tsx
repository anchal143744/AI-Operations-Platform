import { AI_CONTEXT_CONNECTIONS } from "../../lib/ai-operations/model";
import { Badge, Card } from "../ui/primitives";

export function AIHumanReview() {
  return (
    <Card className="ops-panel">
      <p className="app-kicker">Human review</p>
      <h3>Review consequential work</h3>
      <p>
        AI actions that can affect customers or business operations can be
        routed for human approval according to workspace policy.
      </p>
      <div className="ops-panel-empty">No AI actions require review.</div>
    </Card>
  );
}
export function AIPolicyPanel() {
  return (
    <Card className="ops-panel">
      <p className="app-kicker">AI policy</p>
      <h3>Rules before execution</h3>
      <p>
        Workspace policies will determine which AI actions can run automatically
        and which require human approval.
      </p>
      <div className="policy-states">
        {[
          "Auto-approved",
          "Human approval required",
          "Blocked",
          "Policy validation",
        ].map((state) => (
          <Badge key={state}>Planned · {state}</Badge>
        ))}
      </div>
    </Card>
  );
}
export function AIActivity() {
  return (
    <Card className="ops-panel" id="ai-activity">
      <p className="app-kicker">AI activity</p>
      <h3>Trace every important decision</h3>
      <div className="ops-panel-empty">No AI activity recorded yet.</div>
      <p className="ops-future-line">
        Future events: Analysis started · Recommendation generated · Human
        reviewed · Action approved · Action executed · Action blocked
      </p>
    </Card>
  );
}
export function AIContextConnections() {
  return (
    <section className="ops-context" aria-labelledby="ai-context-title">
      <div>
        <p className="app-kicker">Connected context</p>
        <h2 id="ai-context-title">One control layer across operations</h2>
        <p>
          AI work will reference existing operational objects instead of
          creating duplicate records.
        </p>
      </div>
      <div>
        {AI_CONTEXT_CONNECTIONS.map((connection) => (
          <a href={connection.href} key={connection.label}>
            <strong>{connection.label}</strong>
            <span>{connection.description}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
