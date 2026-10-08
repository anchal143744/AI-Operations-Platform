import { Icon } from "../icons";
import { Badge, Card } from "../ui/primitives";

const plannedAICapabilities = [
  "AI summary",
  "Intent detection",
  "Qualification",
  "Recommended next action",
  "Risk signals",
] as const;

export function LeadAISection() {
  return (
    <Card className="lead-detail-card lead-ai-section lead-area-ai">
      <div className="lead-card-heading">
        <span className="lead-card-icon" aria-hidden="true">
          <Icon name="spark" />
        </span>
        <div>
          <p className="app-kicker">Future assistance</p>
          <h2>AI assistance</h2>
        </div>
      </div>
      <p>
        AI-generated qualification, summaries and recommended next actions will
        appear here when AI processing is connected.
      </p>
      <ul className="lead-planned-list">
        {plannedAICapabilities.map((capability) => (
          <li key={capability}>
            <span>{capability}</span>
            <Badge>Planned</Badge>
          </li>
        ))}
      </ul>
    </Card>
  );
}
