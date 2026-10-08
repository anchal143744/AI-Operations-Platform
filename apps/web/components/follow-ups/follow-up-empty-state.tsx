import { Icon } from "../icons";
import { Button, ButtonLink } from "../ui/primitives";

export function FollowUpEmptyState({
  title,
  description,
  canCreate,
  onCreate,
}: {
  title: string;
  description: string;
  canCreate: boolean;
  onCreate: () => void;
}) {
  return (
    <div className="follow-up-empty-state">
      <span className="follow-up-empty-icon" aria-hidden="true">
        <Icon name="repeat" />
      </span>
      <p className="app-kicker">Queue ready</p>
      <h3>{title}</h3>
      <p>{description}</p>
      {canCreate ? (
        <div className="follow-up-empty-actions">
          <Button size="small" onClick={onCreate}>
            Create follow-up
          </Button>
          <ButtonLink href="/leads" variant="outline" size="small">
            View leads
          </ButtonLink>
        </div>
      ) : null}
    </div>
  );
}
