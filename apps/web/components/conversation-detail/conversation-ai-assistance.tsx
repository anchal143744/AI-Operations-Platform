import { Icon } from "../icons";
import { Badge, Card } from "../ui/primitives";

const plannedCapabilities = [
  "Summary",
  "Intent",
  "Suggested response",
  "Recommended next action",
  "Risk signals",
] as const;

export function ConversationAIAssistance() {
  return (
    <Card className="conversation-detail-card conversation-area-ai">
      <div className="conversation-card-heading">
        <span className="conversation-card-icon" aria-hidden="true">
          <Icon name="spark" />
        </span>
        <div>
          <p className="app-kicker">Processing not connected</p>
          <h2>AI assistance</h2>
        </div>
      </div>
      <p className="conversation-supporting-copy">
        AI-generated summaries, intent detection and response suggestions will
        appear here when conversation processing is connected.
      </p>
      <ul className="conversation-planned-capabilities">
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
