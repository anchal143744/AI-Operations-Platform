import { Icon } from "../icons";
import { Button, Card } from "../ui/primitives";

export function ConversationNextAction({
  onSchedule,
}: {
  onSchedule: () => void;
}) {
  return (
    <Card className="conversation-detail-card conversation-next-action conversation-area-next">
      <div className="conversation-card-heading">
        <span className="conversation-card-icon" aria-hidden="true">
          <Icon name="repeat" />
        </span>
        <div>
          <p className="app-kicker">Operational decision</p>
          <h2>Next action</h2>
        </div>
      </div>
      <div className="conversation-next-state">
        <span aria-hidden="true" />
        <strong>Follow-up not scheduled</strong>
      </div>
      <p>
        Follow-up scheduling will be available when workflow and communication
        services are connected.
      </p>
      <Button size="small" onClick={onSchedule}>
        Schedule follow-up
        <Icon name="arrow-right" size="small" />
      </Button>
    </Card>
  );
}
