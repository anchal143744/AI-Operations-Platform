import { Icon } from "../icons";

export function ActivityEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="ops-empty activity-empty-state">
      <span className="ops-empty-mark" aria-hidden="true">
        <Icon name="history" />
      </span>
      <p className="app-kicker">Recorded workspace activity</p>
      <h3>{title}</h3>
      <p>{description}</p>
      <small>Only actual supported operations appear in this history.</small>
    </div>
  );
}
