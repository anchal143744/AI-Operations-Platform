import Link from "next/link";
import { leadSourceLabels, type Lead } from "../../lib/leads/model";
import { Icon } from "../icons";
import { Button } from "../ui/primitives";
import {
  LeadPriorityIndicator,
  LeadStatusBadge,
} from "../leads/lead-indicators";

export function LeadHeader({
  lead,
  demo = true,
  onAction,
}: {
  lead: Lead;
  demo?: boolean;
  onAction: () => void;
}) {
  return (
    <header className="lead-detail-header">
      <div className="lead-detail-identity">
        <Link className="lead-back-link" href="/leads">
          <Icon name="arrow-right" size="small" />
          Back to Leads
        </Link>
        <div className="lead-detail-title-row">
          <div>
            <span className="lead-demo-label">
              {demo ? "Frontend demo lead" : "Workspace lead"}
            </span>
            <h1>{lead.name}</h1>
            <p>{lead.company ?? "Company not provided"}</p>
          </div>
          <div
            className="lead-detail-state"
            aria-label="Lead status and priority"
          >
            <LeadStatusBadge status={lead.status} />
            <LeadPriorityIndicator priority={lead.priority} />
            <span className="lead-source-badge">
              {leadSourceLabels[lead.source]} source
            </span>
          </div>
        </div>
        <div className="lead-detail-owner">
          <span aria-hidden="true">{demo ? "DO" : "—"}</span>
          <div>
            <small>Owner</small>
            <strong>{lead.owner ?? "Unassigned"}</strong>
          </div>
        </div>
      </div>
      <div className="lead-header-actions" aria-label="Lead actions">
        <Button variant="outline" size="small" onClick={onAction}>
          <Icon name="draft" size="small" />
          Edit lead
        </Button>
        <Button variant="outline" size="small" onClick={onAction}>
          <Icon name="sliders" size="small" />
          Change status
        </Button>
        <Button variant="outline" size="small" onClick={onAction}>
          <Icon name="users" size="small" />
          Assign owner
        </Button>
        <Button size="small" onClick={onAction}>
          Add note
        </Button>
      </div>
    </header>
  );
}
