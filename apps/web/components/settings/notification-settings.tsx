import type { NotificationSettings as NotificationSettingsModel } from "../../lib/settings/model";
import { SettingsToggle } from "./ai-settings";
import { SettingsSection } from "./settings-section";

const notificationOptions = [
  {
    key: "emailNotifications",
    label: "Email notifications",
    description: "Future delivery through a connected email service.",
  },
  {
    key: "inAppNotifications",
    label: "In-app notifications",
    description: "Future operational notices inside the workspace.",
  },
  {
    key: "approvalRequests",
    label: "Approval requests",
    description: "Alerts when an action needs human review.",
  },
  {
    key: "workflowEvents",
    label: "Workflow events",
    description: "Important workflow lifecycle and failure notices.",
  },
  {
    key: "followUpReminders",
    label: "Follow-up reminders",
    description: "Reminders for due and overdue next actions.",
  },
  {
    key: "systemAlerts",
    label: "System alerts",
    description: "Operational health and security-related alerts.",
  },
] as const satisfies readonly {
  key: keyof NotificationSettingsModel;
  label: string;
  description: string;
}[];

export function NotificationSettings({
  value,
  onChange,
  disabled = false,
}: {
  value: NotificationSettingsModel;
  onChange: (value: NotificationSettingsModel) => void;
  disabled?: boolean;
}) {
  return (
    <SettingsSection
      id="notifications"
      eyebrow="Attention routing"
      title="Notifications"
      description="Prepare which operational signals should reach workspace members."
    >
      <div className="settings-toggle-stack">
        {notificationOptions.map((option) => (
          <SettingsToggle
            key={option.key}
            label={option.label}
            description={option.description}
            checked={value[option.key]}
            disabled={disabled}
            onChange={(checked) =>
              onChange({ ...value, [option.key]: checked })
            }
          />
        ))}
      </div>
      <p className="settings-boundary-note">
        Preview only: notification delivery and preferences are not connected or
        saved.
      </p>
    </SettingsSection>
  );
}
