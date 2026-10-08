import Link from "next/link";
import type { Conversation } from "../../lib/conversations/model";
import { Icon } from "../icons";
import { Button } from "../ui/primitives";
import {
  ConversationAttentionIndicator,
  ConversationChannelBadge,
  ConversationStatusBadge,
} from "./conversation-indicators";

export function ConversationHeader({
  conversation,
  onAction,
}: {
  conversation: Conversation;
  onAction: () => void;
}) {
  return (
    <header className="conversation-detail-header">
      <div className="conversation-detail-identity">
        <Link className="conversation-back-link" href="/inbox">
          <Icon name="arrow-right" size="small" />
          Back to Inbox
        </Link>
        <div className="conversation-detail-title-row">
          <div>
            <span className="conversation-demo-label">
              Frontend demo conversation
            </span>
            <h1>{conversation.participantName}</h1>
            <p>{conversation.participantCompany}</p>
          </div>
          <div
            className="conversation-detail-state"
            aria-label="Conversation channel, status, and attention"
          >
            <ConversationStatusBadge status={conversation.status} />
            <ConversationAttentionIndicator
              attention={conversation.attentionState}
            />
            <ConversationChannelBadge channel={conversation.channel} />
          </div>
        </div>
        <div className="conversation-detail-owner">
          <span aria-hidden="true">DO</span>
          <div>
            <small>Owner</small>
            <strong>{conversation.owner}</strong>
          </div>
        </div>
      </div>

      <div
        className="conversation-header-actions"
        aria-label="Conversation actions"
      >
        <Button variant="outline" size="small" onClick={onAction}>
          <Icon name="x" size="small" />
          Close conversation
        </Button>
        <Button variant="outline" size="small" onClick={onAction}>
          <Icon name="users" size="small" />
          Assign owner
        </Button>
        <Button variant="outline" size="small" onClick={onAction}>
          <Icon name="check" size="small" />
          Mark resolved
        </Button>
        <Button size="small" onClick={onAction}>
          More actions
        </Button>
      </div>
    </header>
  );
}
