import { Icon } from "../icons";
import { Card, StatusIndicator } from "../ui/primitives";

export function ConversationHumanReview() {
  return (
    <Card className="conversation-detail-card conversation-area-human">
      <div className="conversation-card-heading">
        <span className="conversation-card-icon" aria-hidden="true">
          <Icon name="user-check" />
        </span>
        <div>
          <p className="app-kicker">Demonstration state</p>
          <h2>Human review</h2>
        </div>
      </div>
      <div className="conversation-review-state">
        <StatusIndicator state="pending" />
        <strong>Human review required</strong>
      </div>
      <p className="conversation-supporting-copy">
        Consequential AI-assisted actions will require human approval according
        to workspace policy.
      </p>
    </Card>
  );
}
