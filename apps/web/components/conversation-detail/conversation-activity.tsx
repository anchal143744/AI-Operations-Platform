import { Icon } from "../icons";
import { Card } from "../ui/primitives";
import type { ConversationActivity as ConversationActivityRecord } from "../../lib/conversations/model";

export function ConversationActivity({
  activity,
}: {
  activity: readonly ConversationActivityRecord[];
}) {
  return (
    <Card className="conversation-detail-card conversation-area-activity">
      <div className="conversation-card-heading">
        <span className="conversation-card-icon" aria-hidden="true">
          <Icon name="history" />
        </span>
        <div>
          <p className="app-kicker">Audit trail</p>
          <h2>Operational activity</h2>
        </div>
      </div>
      {activity.length === 0 ? (
        <div className="conversation-activity-empty">
          <span aria-hidden="true" />
          <div>
            <h3>No operational activity recorded yet.</h3>
            <p>
              AI analysis, human review, status changes, follow-ups and sent
              messages will be recorded here when services are connected.
            </p>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
