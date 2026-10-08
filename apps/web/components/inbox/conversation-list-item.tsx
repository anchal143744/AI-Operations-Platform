import {
  conversationAttentionLabels,
  conversationChannelLabels,
  conversationStatusLabels,
  type Conversation,
} from "../../lib/conversations/model";
import Link from "next/link";

export function ConversationListItem({
  conversation,
}: {
  conversation: Conversation;
}) {
  return (
    <li>
      <Link
        className="conversation-list-item"
        href={`/inbox/${conversation.id}`}
      >
        <span>
          <strong>{conversation.participantName}</strong>
          <small>{conversation.participantCompany ?? "No company"}</small>
        </span>
        <span>{conversationChannelLabels[conversation.channel]}</span>
        <span>{conversationStatusLabels[conversation.status]}</span>
        <span>{conversationAttentionLabels[conversation.attentionState]}</span>
      </Link>
    </li>
  );
}
