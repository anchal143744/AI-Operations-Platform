import { Button, ButtonLink } from "../ui/primitives";

export function ActivityHeader({ onExport }: { onExport: () => void }) {
  return (
    <header className="ops-page-header activity-header">
      <div>
        <p className="app-kicker">Operational record</p>
        <h1>Activity &amp; Audit</h1>
        <p>
          Trace important AI, human, workflow, customer, system, and security
          events from one operational record.
        </p>
      </div>
      <div className="ops-header-actions">
        <Button variant="outline" size="small" onClick={onExport}>
          Export activity
        </Button>
        <ButtonLink href="#activity-log" size="small">
          View activity
        </ButtonLink>
      </div>
    </header>
  );
}
