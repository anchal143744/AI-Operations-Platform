import type { SecuritySettings as SecuritySettingsModel } from "../../lib/settings/model";
import { Icon } from "../icons";
import { SettingsSection } from "./settings-section";

const securityRows = [
  { key: "sessionSecurity", label: "Session security", icon: "clock" },
  { key: "passwordPolicy", label: "Password policy", icon: "lock" },
  { key: "authentication", label: "Authentication", icon: "user-check" },
  { key: "accessControl", label: "Access control", icon: "shield-check" },
  { key: "auditLogging", label: "Audit logging", icon: "history" },
] as const satisfies readonly {
  key: keyof SecuritySettingsModel;
  label: string;
  icon: import("../icons").IconName;
}[];

const readable = (value: string) =>
  value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

export function SecuritySettings({ value }: { value: SecuritySettingsModel }) {
  return (
    <SettingsSection
      id="security"
      eyebrow="Security boundary"
      title="Security"
      description="Current server-side controls and the remaining security boundary. No certification is claimed."
    >
      <div className="settings-security-list">
        {securityRows.map((row) => (
          <article key={row.key}>
            <Icon name={row.icon} size="small" />
            <div>
              <strong>{row.label}</strong>
              <small>{readable(value[row.key])}</small>
            </div>
            <span>Current boundary</span>
          </article>
        ))}
      </div>
      <p className="settings-boundary-note">
        Authentication, tenant/RBAC checks and selected operational APIs run on
        the server. Activity events are recorded for supported actions;
        comprehensive audit coverage and policy enforcement remain incomplete.
      </p>
    </SettingsSection>
  );
}
