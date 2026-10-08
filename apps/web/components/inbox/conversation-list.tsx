import {
  getActiveConversationFilterCount,
  getConversationEmptyState,
  type Conversation,
  type ConversationFilterState,
} from "../../lib/conversations/model";
import { ConversationEmptyState } from "./conversation-empty-state";
import { ConversationListItem } from "./conversation-list-item";

export function ConversationList({
  conversations,
  query,
  filters,
  onUnavailable,
}: {
  conversations: readonly Conversation[];
  query: string;
  filters: ConversationFilterState;
  onUnavailable: (message: string) => void;
}) {
  const emptyState = getConversationEmptyState(query, filters);

  return (
    <section
      className="conversation-list"
      aria-labelledby="conversation-list-title"
    >
      <div className="conversation-panel-heading">
        <div>
          <h3 id="conversation-list-title">Conversations</h3>
          <span>
            {conversations.length === 0 ? "Empty" : conversations.length}
          </span>
        </div>
        <p>Participant, channel, status and attention</p>
      </div>

      {conversations.length === 0 ? (
        <ConversationEmptyState
          title={emptyState.title}
          description={emptyState.description}
          canConnect={
            !query.trim() && getActiveConversationFilterCount(filters) === 0
          }
          onUnavailable={onUnavailable}
        />
      ) : (
        <ul className="conversation-items">
          {conversations.map((conversation) => (
            <ConversationListItem
              key={conversation.id}
              conversation={conversation}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
