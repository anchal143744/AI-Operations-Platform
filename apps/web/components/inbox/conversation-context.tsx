import { conversationContextAreas } from "../../lib/conversations/model";
import { Icon } from "../icons";

export function ConversationContext() {
  const leadContext = conversationContextAreas[0];
  const followUpContext = conversationContextAreas[3];

  return (
    <section
      className="conversation-context-card"
      aria-labelledby="context-title"
    >
      <div className="conversation-context-heading">
        <span aria-hidden="true">
          <Icon name="target" size="small" />
        </span>
        <h4 id="context-title">Operational context</h4>
      </div>
      <dl>
        <div>
          <dt>{leadContext.label}</dt>
          <dd>Not linked</dd>
        </div>
        <div>
          <dt>{followUpContext.label}</dt>
          <dd>Not scheduled</dd>
        </div>
      </dl>
      <p>
        Lead and follow-up details will appear after operational data is
        connected.
      </p>
    </section>
  );
}
