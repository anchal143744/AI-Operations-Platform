import { Button, ButtonLink } from "../ui/primitives";

export function AIOperationsHeader({
  onConfigure,
}: {
  onConfigure: () => void;
}) {
  return (
    <header className="ops-page-header">
      <div>
        <p className="app-kicker">Controlled intelligence</p>
        <h1>AI Operations</h1>
        <p>
          Monitor AI-assisted work, review proposed actions, and keep automation
          under control.
        </p>
      </div>
      <div className="ops-header-actions">
        <ButtonLink href="#ai-activity" variant="outline" size="small">
          View activity
        </ButtonLink>
        <Button size="small" onClick={onConfigure}>
          Configure AI
        </Button>
      </div>
    </header>
  );
}
