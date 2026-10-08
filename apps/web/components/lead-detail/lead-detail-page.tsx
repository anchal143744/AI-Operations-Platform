"use client";

import { useState } from "react";
import {
  LEAD_ACTIONS_UNAVAILABLE_MESSAGE,
  type LeadDetail,
} from "../../lib/leads/model";
import { Icon } from "../icons";
import { HumanReviewSection } from "./human-review-section";
import { LeadActivityTimeline } from "./lead-activity-timeline";
import { LeadAISection } from "./lead-ai-section";
import { LeadEnquiryContext } from "./lead-enquiry-context";
import { LeadHeader } from "./lead-header";
import { LeadInformation } from "./lead-information";
import { LeadNextAction } from "./lead-next-action";
import { LeadNotes } from "./lead-notes";
import { LeadOperationalStatus } from "./lead-operational-status";
import { LeadOverview } from "./lead-overview";
import { LeadTags } from "./lead-tags";

export function LeadDetailPage({
  detail,
  demo = true,
}: {
  detail: LeadDetail;
  demo?: boolean;
}) {
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <div className="lead-detail-page">
      <LeadHeader
        lead={detail.lead}
        demo={demo}
        onAction={() =>
          setNotice(
            demo
              ? LEAD_ACTIONS_UNAVAILABLE_MESSAGE
              : "This editing control is not connected yet. Lead API permissions remain server-enforced.",
          )
        }
      />
      {notice ? (
        <div className="lead-detail-notice" role="status">
          <Icon name="shield-check" size="small" />
          <span>{notice}</span>
          <button
            type="button"
            aria-label="Dismiss lead message"
            onClick={() => setNotice(null)}
          >
            <Icon name="x" size="small" />
          </button>
        </div>
      ) : null}
      <div className="lead-detail-layout">
        <LeadOverview lead={detail.lead} demo={demo} />
        <LeadNextAction
          onSchedule={() =>
            setNotice(
              "Follow-up scheduling will be available when workflow services are connected.",
            )
          }
        />
        <LeadActivityTimeline activity={detail.activity} />
        <LeadEnquiryContext context={detail.enquiryContext} demo={demo} />
        <LeadAISection />
        <HumanReviewSection />
        <LeadInformation lead={detail.lead} />
        <LeadNotes
          notes={detail.notes}
          onAdd={() =>
            setNotice(
              "Notes will be available when the workspace is connected.",
            )
          }
        />
        <LeadTags
          tags={detail.tags}
          onAdd={() =>
            setNotice("Tags will be available when the workspace is connected.")
          }
        />
        <LeadOperationalStatus demo={demo} />
      </div>
    </div>
  );
}
