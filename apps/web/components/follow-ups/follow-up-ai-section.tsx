import { FOLLOW_UP_AI_UNAVAILABLE_MESSAGE } from "../../lib/follow-ups/model";
import { Icon } from "../icons";
import { Badge, Card } from "../ui/primitives";

const plannedCapabilities = [
  "Recommended next action",
  "Recommended timing",
  "Reason for recommendation",
  "Customer intent",
  "Follow-up priority",
  "Suggested message",
] as const;

export function FollowUpAISection() {
  return (
    <Card className="follow-up-ai-card">
      <div className="follow-up-context-heading">
        <span aria-hidden="true">
          <Icon name="spark" />
        </span>
        <div>
          <p className="app-kicker">Not connected</p>
          <h3>AI follow-up assistance</h3>
        </div>
      </div>
      <p>{FOLLOW_UP_AI_UNAVAILABLE_MESSAGE}</p>
      <ul>
        {plannedCapabilities.map((capability) => (
          <li key={capability}>
            <span>{capability}</span>
            <Badge>Planned</Badge>
          </li>
        ))}
      </ul>
    </Card>
  );
}
