import { Icon } from "../icons";

export function ConversationOperationalStatus() {
  return (
    <section
      className="conversation-context-card"
      aria-labelledby="conversation-status-title"
    >
      <div className="conversation-context-heading">
        <span aria-hidden="true">
          <Icon name="workflow" size="small" />
        </span>
        <h4 id="conversation-status-title">Operational status</h4>
        <small>Unavailable</small>
      </div>
      <p>
        Attention, customer-waiting, processing and resolution states will
        appear here.
      </p>
    </section>
  );
}
