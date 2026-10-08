import { Icon } from "../icons";
import { ButtonLink, Card } from "../ui/primitives";

export function ConversationNotFound() {
  return (
    <Card className="conversation-not-found">
      <span aria-hidden="true">
        <Icon name="inbox" />
      </span>
      <p className="app-kicker">Frontend demonstration</p>
      <h1>Conversation not found</h1>
      <p>
        This conversation isn&apos;t available in the current frontend demo.
      </p>
      <ButtonLink href="/inbox">
        Back to Inbox
        <Icon name="arrow-right" size="small" />
      </ButtonLink>
    </Card>
  );
}
