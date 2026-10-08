import { Icon } from "../icons";

export function AIConversationAssistant() {
  return (
    <section
      className="conversation-context-card"
      aria-labelledby="conversation-ai-title"
    >
      <div className="conversation-context-heading">
        <span aria-hidden="true">
          <Icon name="spark" size="small" />
        </span>
        <h4 id="conversation-ai-title">AI assistance</h4>
        <small>Planned</small>
      </div>
      <p>
        AI assistance will appear here when conversation processing is
        connected.
      </p>
      <span className="conversation-capability-line">
        Summary · Suggested response · Intent · Next action
      </span>
    </section>
  );
}
