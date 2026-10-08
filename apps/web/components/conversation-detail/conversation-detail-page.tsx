"use client";

import { useState } from "react";
import {
  CONVERSATION_ACTION_UNAVAILABLE_MESSAGE,
  CONVERSATION_FOLLOW_UP_UNAVAILABLE_MESSAGE,
  type ConversationDetail,
} from "../../lib/conversations/model";
import { Icon } from "../icons";
import { ConversationActivity } from "./conversation-activity";
import { ConversationAIAssistance } from "./conversation-ai-assistance";
import { ConversationDetails } from "./conversation-details";
import { ConversationHeader } from "./conversation-header";
import { ConversationHumanReview } from "./conversation-human-review";
import { ConversationLeadContext } from "./conversation-lead-context";
import { ConversationNextAction } from "./conversation-next-action";
import { MessageComposer } from "./message-composer";
import { MessageTimeline } from "./message-timeline";

export function ConversationDetailPage({
  detail,
  onSend,
}: {
  detail: ConversationDetail;
  onSend?: (content: string) => Promise<void>;
}) {
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <div className="conversation-detail-page">
      <ConversationHeader
        conversation={detail.conversation}
        onAction={() => setNotice(CONVERSATION_ACTION_UNAVAILABLE_MESSAGE)}
      />

      {notice ? (
        <div className="conversation-detail-notice" role="status">
          <Icon name="shield-check" size="small" />
          <span>{notice}</span>
          <button
            type="button"
            aria-label="Dismiss conversation message"
            onClick={() => setNotice(null)}
          >
            <Icon name="x" size="small" />
          </button>
        </div>
      ) : null}

      <div className="conversation-detail-layout">
        <MessageTimeline
          conversation={detail.conversation}
          messages={detail.messages}
          demo={!onSend}
        />
        <MessageComposer {...(onSend ? { onSend } : {})} />
        <ConversationActivity activity={detail.operationalActivity} />
        <ConversationLeadContext lead={detail.lead} demo={!onSend} />
        <ConversationAIAssistance />
        <ConversationHumanReview />
        <ConversationNextAction
          onSchedule={() =>
            setNotice(CONVERSATION_FOLLOW_UP_UNAVAILABLE_MESSAGE)
          }
        />
        <ConversationDetails conversation={detail.conversation} />
      </div>
    </div>
  );
}
