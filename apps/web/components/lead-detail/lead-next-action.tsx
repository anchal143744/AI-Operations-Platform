import { Icon } from "../icons";
import { Button, Card } from "../ui/primitives";

export function LeadNextAction({ onSchedule }: { onSchedule: () => void }) {
  return (
    <Card className="lead-detail-card lead-next-action lead-area-next">
      <div className="lead-card-heading">
        <span className="lead-card-icon" aria-hidden="true">
          <Icon name="arrow-right" />
        </span>
        <div>
          <p className="app-kicker">Decision point</p>
          <h2>Next action</h2>
        </div>
      </div>
      <div className="lead-next-state">
        <span aria-hidden="true" />
        <strong>Not scheduled</strong>
      </div>
      <p>
        Follow-up actions will appear here when workflow and communication
        services are connected.
      </p>
      <Button onClick={onSchedule}>Schedule follow-up</Button>
    </Card>
  );
}
