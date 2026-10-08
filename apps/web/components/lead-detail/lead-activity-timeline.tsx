import type { LeadActivity } from "../../lib/leads/model";
import { Icon } from "../icons";
import { Card } from "../ui/primitives";

export function LeadActivityTimeline({
  activity,
}: {
  activity: readonly LeadActivity[];
}) {
  return (
    <Card className="lead-detail-card lead-activity lead-area-activity">
      <div className="lead-card-heading">
        <span className="lead-card-icon" aria-hidden="true">
          <Icon name="history" />
        </span>
        <div>
          <p className="app-kicker">Operational record</p>
          <h2>Activity</h2>
        </div>
      </div>
      {activity.length === 0 ? (
        <div className="lead-section-empty">
          <span className="lead-timeline-marker" aria-hidden="true" />
          <div>
            <h3>No activity yet</h3>
            <p>
              Lead activity will appear here when operational data is connected.
            </p>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
