import { Icon } from "../icons";
import { AIConversationAssistant } from "./ai-conversation-assistant";
import { ConversationContext } from "./conversation-context";
import { ConversationOperationalStatus } from "./conversation-operational-status";
import { HumanReviewState } from "./human-review-state";

export function ConversationPanel() {
  return (
    <section
      className="conversation-detail-panel"
      aria-labelledby="conversation-panel-title"
    >
      <div className="conversation-panel-topline">
        <div>
          <span className="conversation-panel-icon" aria-hidden="true">
            <Icon name="mail" />
          </span>
          <div>
            <p className="app-kicker">Conversation view</p>
            <h3 id="conversation-panel-title">Select a conversation</h3>
          </div>
        </div>
        <span className="conversation-planned-label">No selection</span>
      </div>

      <div className="conversation-panel-empty">
        <div className="conversation-flow-mark" aria-hidden="true">
          <span>
            <Icon name="inbox" size="small" />
          </span>
          <i />
          <span>
            <Icon name="spark" size="small" />
          </span>
          <i />
          <span>
            <Icon name="user-check" size="small" />
          </span>
        </div>
        <h4>Review messages in operational context</h4>
        <p>
          Choose a conversation from the inbox to review messages, context and
          next actions.
        </p>
        <small>
          The message composer will become available after a communication
          channel is connected.
        </small>
      </div>

      <div className="conversation-future-grid">
        <ConversationContext />
        <AIConversationAssistant />
        <HumanReviewState />
        <ConversationOperationalStatus />
      </div>
    </section>
  );
}
