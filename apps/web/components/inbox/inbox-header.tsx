import { Icon } from "../icons";
import { Button } from "../ui/primitives";

export function InboxHeader({
  onNewConversation,
}: {
  onNewConversation: () => void;
}) {
  return (
    <header className="inbox-header">
      <div>
        <p className="app-kicker">Communication workspace</p>
        <h1>Inbox</h1>
        <p>Manage customer conversations across your operational channels.</p>
      </div>
      <Button onClick={onNewConversation}>
        <Icon name="mail" size="small" />
        New conversation
      </Button>
    </header>
  );
}
