import { leadSourceLabels, type Lead } from "../../lib/leads/model";
import { Icon } from "../icons";
import { Card } from "../ui/primitives";
import {
  LeadPriorityIndicator,
  LeadStatusBadge,
} from "../leads/lead-indicators";

const demoDateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeZone: "UTC",
});

export function LeadInformation({ lead }: { lead: Lead }) {
  return (
    <Card className="lead-detail-card lead-information lead-area-information">
      <div className="lead-card-heading">
        <span className="lead-card-icon" aria-hidden="true">
          <Icon name="target" />
        </span>
        <div>
          <p className="app-kicker">Structured record</p>
          <h2>Lead information</h2>
        </div>
      </div>
      <dl className="lead-information-list">
        <div>
          <dt>Status</dt>
          <dd>
            <LeadStatusBadge status={lead.status} />
          </dd>
        </div>
        <div>
          <dt>Priority</dt>
          <dd>
            <LeadPriorityIndicator priority={lead.priority} />
          </dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd>{leadSourceLabels[lead.source]}</dd>
        </div>
        <div>
          <dt>Owner</dt>
          <dd>{lead.owner ?? "Unassigned"}</dd>
        </div>
        <div>
          <dt>Created</dt>
          <dd>{demoDateFormatter.format(new Date(lead.createdAt))}</dd>
        </div>
        <div>
          <dt>Last activity</dt>
          <dd>{lead.lastActivityAt ? "Available" : "No activity yet"}</dd>
        </div>
        <div>
          <dt>Next follow-up</dt>
          <dd>{lead.nextFollowUpAt ? "Scheduled" : "Not scheduled"}</dd>
        </div>
      </dl>
    </Card>
  );
}
