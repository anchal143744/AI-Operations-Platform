import type {
  Conversation,
  ConversationMessage,
} from "../../lib/conversations/model";
import { Icon } from "../icons";
import { Card } from "../ui/primitives";

const demoTimeFormatter = new Intl.DateTimeFormat("en", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
});

export function MessageTimeline({
  conversation,
  messages,
  demo = true,
}: {
  conversation: Conversation;
  messages: readonly ConversationMessage[];
  demo?: boolean;
}) {
  return (
    <Card className="conversation-detail-card message-timeline conversation-area-messages">
      <div className="conversation-card-heading">
        <span className="conversation-card-icon" aria-hidden="true">
          <Icon name="inbox" />
        </span>
        <div>
          <p className="app-kicker">
            {demo ? "Fictional message history" : "Message history"}
          </p>
          <h2>Conversation</h2>
        </div>
        {demo ? (
          <span className="conversation-demo-disclosure">Demo content</span>
        ) : null}
      </div>

      <div className="conversation-subject">
        <span>Subject</span>
        <strong>{conversation.subject}</strong>
      </div>

      <ol
        aria-label={
          demo ? "Fictional demonstration messages" : "Conversation messages"
        }
      >
        {messages.map((message) => {
          const customer = message.senderType === "CUSTOMER";
          return (
            <li
              className={`conversation-message conversation-message-${message.direction.toLowerCase()}`}
              key={message.id}
            >
              <span className="conversation-message-avatar" aria-hidden="true">
                {customer ? "JL" : "DO"}
              </span>
              <article
                aria-label={`${customer ? "Customer" : "Operator"} message`}
              >
                <header>
                  <strong>{customer ? "Jordan Lee" : "Demo Owner"}</strong>
                  <span>{customer ? "Customer" : "Operator"}</span>
                  <time dateTime={message.createdAt}>
                    {demoTimeFormatter.format(new Date(message.createdAt))}
                  </time>
                </header>
                <p>{message.content}</p>
              </article>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
