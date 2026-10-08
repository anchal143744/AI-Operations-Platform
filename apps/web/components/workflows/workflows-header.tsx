import { Button } from "../ui/primitives";

export function WorkflowsHeader({
  onCreate,
  onTemplates,
}: {
  onCreate: () => void;
  onTemplates: () => void;
}) {
  return (
    <header className="ops-page-header">
      <div>
        <p className="app-kicker">Operational automation</p>
        <h1>Workflows</h1>
        <p>
          Design controlled operational workflows that connect business events,
          AI decisions, approvals, and actions.
        </p>
      </div>
      <div className="ops-header-actions">
        <Button variant="outline" size="small" onClick={onTemplates}>
          Templates
        </Button>
        <Button size="small" onClick={onCreate}>
          Create workflow
        </Button>
      </div>
    </header>
  );
}
