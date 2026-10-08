import { Icon } from "../icons";
import { Card, StatusIndicator } from "../ui/primitives";

export function HumanReviewSection() {
  return (
    <Card className="lead-detail-card human-review lead-area-human">
      <div className="lead-card-heading">
        <span className="lead-card-icon" aria-hidden="true">
          <Icon name="shield-check" />
        </span>
        <div>
          <p className="app-kicker">Policy control</p>
          <h2>Human review</h2>
        </div>
      </div>
      <p>
        Consequential AI-assisted actions will require review and approval
        according to workspace policy.
      </p>
      <div className="lead-configuration-state">
        <StatusIndicator state="pending" />
        <span>Not configured</span>
      </div>
    </Card>
  );
}
