import { Icon } from "../icons";
import { ButtonLink } from "../ui/primitives";

export function ApprovalEmptyState({
  title,
  description,
  showConnections,
}: {
  title: string;
  description: string;
  showConnections: boolean;
}) {
  return (
    <div className="ops-empty approval-empty-state">
      <span className="ops-empty-mark">
        <Icon name="user-check" />
      </span>
      <p className="app-kicker">Review queue awaiting connection</p>
      <h3>{title}</h3>
      <p>{description}</p>
      {showConnections ? (
        <div className="approval-empty-actions">
          <ButtonLink href="/ai-operations" size="small">
            View AI Operations
          </ButtonLink>
          <ButtonLink href="/workflows" variant="outline" size="small">
            View Workflows
          </ButtonLink>
        </div>
      ) : null}
    </div>
  );
}
