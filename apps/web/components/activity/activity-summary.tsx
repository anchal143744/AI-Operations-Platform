import { activitySummaryItems } from "../../lib/activity/model";
import { Card } from "../ui/primitives";

export function ActivitySummary() {
  return (
    <section className="ops-summary" aria-labelledby="activity-summary-title">
      <h2 className="sr-only" id="activity-summary-title">
        Activity summary
      </h2>
      {activitySummaryItems.map((item) => (
        <Card className="ops-summary-card" key={item.label}>
          <span>{item.label}</span>
          <strong aria-label={`${item.label}: no data`}>—</strong>
          <small>{item.description}</small>
        </Card>
      ))}
    </section>
  );
}
