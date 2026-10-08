import Link from "next/link";
import type { ActivityEvent } from "../../lib/activity/model";
import { Card } from "../ui/primitives";

export function ActivityEventDetails({
  event,
}: {
  event: ActivityEvent | null;
}) {
  return (
    <Card className="activity-detail-card">
      <p className="app-kicker">Event details</p>
      <h2>{event ? event.action : "No event selected"}</h2>
      <p>
        {event
          ? event.summary
          : "Select a recorded event to inspect its actor, source, and timestamp."}
      </p>
      <dl className="activity-detail-fields">
        <div>
          <dt>Actor</dt>
          <dd>{event?.actor.type ?? "Not available"}</dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd>{event?.source.type.replaceAll("_", " ") ?? "Not available"}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{event?.status ?? "Not available"}</dd>
        </div>
        <div>
          <dt>Occurred</dt>
          <dd>
            {event
              ? new Date(event.createdAt).toLocaleString()
              : "Not available"}
          </dd>
        </div>
      </dl>
    </Card>
  );
}

export function ActivityContextPanel() {
  return (
    <Card className="activity-context-card">
      <p className="app-kicker">Cross-domain context</p>
      <h2>Operational connections</h2>
      <p>
        Activity can reference leads, conversations, follow-ups, AI operations,
        workflows, and approval requests without duplicating those records.
      </p>
      <nav aria-label="Related operational workspaces">
        <Link href="/leads">Leads</Link>
        <Link href="/inbox">Inbox</Link>
        <Link href="/follow-ups">Follow-ups</Link>
        <Link href="/ai-operations">AI Operations</Link>
        <Link href="/workflows">Workflows</Link>
        <Link href="/approvals">Human Review</Link>
      </nav>
    </Card>
  );
}

export function AuditInformation() {
  return (
    <Card className="activity-audit-information">
      <p className="app-kicker">Audit information</p>
      <h2>Traceability by design</h2>
      <p>
        Supported actions retain their actor, source, and timestamp in
        append-only workspace activity. Future integrations will extend this
        record.
      </p>
      <div className="activity-audit-principles">
        <span>AI recommendation ≠ action</span>
        <span>Human approval ≠ execution</span>
        <span>Workflow definition ≠ execution</span>
        <span>Activity is the historical record</span>
      </div>
      <small>
        Supported operations are recorded in append-only workspace activity.
        Future integrations are not represented here.
      </small>
    </Card>
  );
}
