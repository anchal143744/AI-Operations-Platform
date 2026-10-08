import {
  conversationChannelLabels,
  type Conversation,
} from "../../lib/conversations/model";
import { Icon } from "../icons";
import { Card } from "../ui/primitives";
import {
  ConversationAttentionIndicator,
  ConversationStatusBadge,
} from "./conversation-indicators";

const detailDateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

export function ConversationDetails({
  conversation,
}: {
  conversation: Conversation;
}) {
  return (
    <Card className="conversation-detail-card conversation-area-details">
      <div className="conversation-card-heading">
        <span className="conversation-card-icon" aria-hidden="true">
          <Icon name="sliders" />
        </span>
        <div>
          <p className="app-kicker">Structured record</p>
          <h2>Conversation details</h2>
        </div>
      </div>
      <dl className="conversation-detail-list">
        <div>
          <dt>Channel</dt>
          <dd>{conversationChannelLabels[conversation.channel]}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>
            <ConversationStatusBadge status={conversation.status} />
          </dd>
        </div>
        <div>
          <dt>Attention</dt>
          <dd>
            <ConversationAttentionIndicator
              attention={conversation.attentionState}
            />
          </dd>
        </div>
        <div>
          <dt>Owner</dt>
          <dd>{conversation.owner}</dd>
        </div>
        <div>
          <dt>Created</dt>
          <dd>
            {detailDateFormatter.format(new Date(conversation.createdAt))}
          </dd>
        </div>
        <div>
          <dt>Last activity</dt>
          <dd>
            {conversation.lastMessageAt
              ? detailDateFormatter.format(new Date(conversation.lastMessageAt))
              : "No activity"}
          </dd>
        </div>
      </dl>
    </Card>
  );
}
