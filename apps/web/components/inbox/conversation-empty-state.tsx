import { CHANNEL_CONNECTION_UNAVAILABLE_MESSAGE } from "../../lib/conversations/model";
import { Icon } from "../icons";
import { Button, ButtonLink } from "../ui/primitives";

export function ConversationEmptyState({
  title,
  description,
  canConnect,
  onUnavailable,
}: {
  title: string;
  description: string;
  canConnect: boolean;
  onUnavailable: (message: string) => void;
}) {
  return (
    <div className="conversation-empty-state">
      <span className="conversation-empty-icon" aria-hidden="true">
        <Icon name="inbox" />
      </span>
      <p className="app-kicker">Ready for messages</p>
      <h3>{title}</h3>
      <p>{description}</p>
      {canConnect ? (
        <div className="conversation-empty-actions">
          <Button
            variant="outline"
            size="small"
            onClick={() =>
              onUnavailable(CHANNEL_CONNECTION_UNAVAILABLE_MESSAGE)
            }
          >
            Connect a channel
          </Button>
          <ButtonLink href="/inbox/demo-conversation-001" size="small">
            Preview demo conversation
          </ButtonLink>
        </div>
      ) : null}
    </div>
  );
}
