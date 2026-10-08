import { settingsSections } from "../../lib/settings/model";
import { Icon } from "../icons";

export function SettingsNavigation() {
  return (
    <nav className="settings-navigation" aria-label="Settings sections">
      <p>Configuration</p>
      <ul>
        {settingsSections.map((section) => (
          <li key={section.id}>
            <a href={`#${section.id}`}>
              <Icon name={section.icon} size="small" />
              <span>{section.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
