import { Icon } from "../icons";
import { ButtonLink, Card, StatusIndicator } from "../ui/primitives";

export function LeadOperationalStatus({ demo = true }: { demo?: boolean }) {
  return (
    <Card className="lead-detail-card lead-operational lead-area-operational">
      <div className="lead-card-heading">
        <span className="lead-card-icon" aria-hidden="true">
          <Icon name="workflow" />
        </span>
        <div>
          <p className="app-kicker">Service state</p>
          <h2>Operational status</h2>
        </div>
      </div>
      <div className="lead-configuration-state">
        <StatusIndicator state="pending" />
        <span>No operational services connected</span>
      </div>
      {demo ? (
        <ButtonLink
          href="/inbox/demo-conversation-001"
          variant="outline"
          size="small"
        >
          View demo conversation
          <Icon name="arrow-right" size="small" />
        </ButtonLink>
      ) : null}
    </Card>
  );
}
