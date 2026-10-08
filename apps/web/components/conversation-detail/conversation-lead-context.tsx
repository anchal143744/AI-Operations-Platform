import { leadSourceLabels, type Lead } from "../../lib/leads/model";
import { Icon } from "../icons";
import { ButtonLink, Card } from "../ui/primitives";
import {
  LeadPriorityIndicator,
  LeadStatusBadge,
} from "../leads/lead-indicators";

export function ConversationLeadContext({
  lead,
  demo = true,
}: {
  lead: Lead | null;
  demo?: boolean;
}) {
  return (
    <Card className="conversation-detail-card conversation-lead-context conversation-area-lead">
      <div className="conversation-card-heading">
        <span className="conversation-card-icon" aria-hidden="true">
          <Icon name="target" />
        </span>
        <div>
          <p className="app-kicker">
            {demo ? "Demo relationship" : "Linked record"}
          </p>
          <h2>Lead context</h2>
        </div>
      </div>
      {lead ? (
        <>
          <div className="conversation-lead-identity">
            <strong>{lead.name}</strong>
            <span>{lead.company}</span>
          </div>
          <dl className="conversation-detail-list">
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
          </dl>
          <ButtonLink href={`/leads/${lead.id}`} variant="outline" size="small">
            View lead
            <Icon name="arrow-right" size="small" />
          </ButtonLink>
        </>
      ) : (
        <p>No lead is linked to this conversation.</p>
      )}
    </Card>
  );
}
