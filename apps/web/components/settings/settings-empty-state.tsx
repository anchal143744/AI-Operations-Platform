import { Icon, type IconName } from "../icons";

export function SettingsEmptyState({
  icon,
  title,
  description,
}: {
  icon: IconName;
  title: string;
  description: string;
}) {
  return (
    <div className="settings-empty-state">
      <span aria-hidden="true">
        <Icon name={icon} />
      </span>
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
    </div>
  );
}
