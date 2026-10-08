import type { Lead } from "../../lib/leads/model";
import { Icon } from "../icons";
import { Card } from "../ui/primitives";

export function LeadOverview({
  lead,
  demo = true,
}: {
  lead: Lead;
  demo?: boolean;
}) {
  return (
    <Card className="lead-detail-card lead-overview lead-area-overview">
      <div className="lead-card-heading">
        <span className="lead-card-icon" aria-hidden="true">
          <Icon name="user-check" />
        </span>
        <div>
          <p className="app-kicker">
            {demo ? "Demo information" : "Workspace record"}
          </p>
          <h2>Overview</h2>
        </div>
      </div>
      <dl className="lead-overview-grid">
        <div>
          <dt>Email</dt>
          <dd>{lead.email ?? "Not provided"}</dd>
        </div>
        <div>
          <dt>Phone</dt>
          <dd>{lead.phone ?? "Not provided"}</dd>
        </div>
        <div>
          <dt>Company</dt>
          <dd>{lead.company ?? "Not provided"}</dd>
        </div>
        <div>
          <dt>Owner</dt>
          <dd>{lead.owner ?? "Unassigned"}</dd>
        </div>
      </dl>
    </Card>
  );
}
