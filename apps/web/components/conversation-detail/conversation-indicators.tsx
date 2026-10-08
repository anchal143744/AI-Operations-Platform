import {
  conversationAttentionLabels,
  conversationChannelLabels,
  conversationStatusLabels,
  type ConversationAttentionState,
  type ConversationChannel,
  type ConversationStatus,
} from "../../lib/conversations/model";

export function ConversationStatusBadge({
  status,
}: {
  status: ConversationStatus;
}) {
  return (
    <span
      className={`conversation-status-badge conversation-status-${status.toLowerCase()}`}
    >
      <span aria-hidden="true" />
      {conversationStatusLabels[status]}
    </span>
  );
}

export function ConversationChannelBadge({
  channel,
}: {
  channel: ConversationChannel;
}) {
  return (
    <span className="conversation-channel-badge">
      {conversationChannelLabels[channel]} channel
    </span>
  );
}

export function ConversationAttentionIndicator({
  attention,
}: {
  attention: ConversationAttentionState;
}) {
  return (
    <span
      className={`conversation-attention conversation-attention-${attention.toLowerCase()}`}
    >
      <span aria-hidden="true" />
      {conversationAttentionLabels[attention]}
    </span>
  );
}
