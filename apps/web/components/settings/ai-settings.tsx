import {
  aiActionPermissions,
  humanApprovalRequirements,
  type AISettings as AISettingsModel,
} from "../../lib/settings/model";
import { SettingsSection } from "./settings-section";

export function AISettings({
  value,
  onChange,
  disabled = false,
}: {
  value: AISettingsModel;
  onChange: (value: AISettingsModel) => void;
  disabled?: boolean;
}) {
  return (
    <SettingsSection
      id="ai-settings"
      eyebrow="AI control"
      title="AI settings"
      description="Shape how AI may assist while keeping recommendations separate from authority and execution."
    >
      <div className="settings-toggle-stack">
        <SettingsToggle
          label="AI assistance"
          description="Allow future AI services to prepare analysis and drafts."
          checked={value.assistanceEnabled}
          disabled={disabled}
          onChange={(checked) =>
            onChange({ ...value, assistanceEnabled: checked })
          }
        />
        <SettingsToggle
          label="AI recommendations"
          description="Allow future recommendation output; recommendations remain proposals."
          checked={value.recommendationsEnabled}
          disabled={disabled}
          onChange={(checked) =>
            onChange({ ...value, recommendationsEnabled: checked })
          }
        />
      </div>
      <div className="settings-form-grid settings-form-grid-compact">
        <label className="settings-field">
          <span>AI action permissions</span>
          <select
            className="field-control"
            value={value.actionPermission}
            disabled={disabled}
            onChange={(event) =>
              onChange({
                ...value,
                actionPermission: event.target
                  .value as AISettingsModel["actionPermission"],
              })
            }
          >
            {aiActionPermissions.map((permission) => (
              <option value={permission} key={permission}>
                {readable(permission)}
              </option>
            ))}
          </select>
        </label>
        <label className="settings-field">
          <span>Human approval requirement</span>
          <select
            className="field-control"
            value={value.humanApprovalRequirement}
            disabled={disabled}
            onChange={(event) =>
              onChange({
                ...value,
                humanApprovalRequirement: event.target
                  .value as AISettingsModel["humanApprovalRequirement"],
              })
            }
          >
            {humanApprovalRequirements.map((requirement) => (
              <option value={requirement} key={requirement}>
                {readable(requirement)}
              </option>
            ))}
          </select>
        </label>
        <label className="settings-field">
          <span>
            Confidence threshold <small>Future signal</small>
          </span>
          <input
            className="field-control"
            type="number"
            disabled={disabled}
            min="0"
            max="100"
            value={value.confidenceThreshold ?? ""}
            placeholder="Not configured"
            onChange={(event) =>
              onChange({
                ...value,
                confidenceThreshold: event.target.value
                  ? Number(event.target.value)
                  : null,
              })
            }
          />
        </label>
      </div>
      <p className="settings-boundary-note">
        Preview only: no AI provider or policy engine is connected. These
        choices are not saved or enforced.
      </p>
    </SettingsSection>
  );
}

export function SettingsToggle({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="settings-toggle">
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <input
        type="checkbox"
        disabled={disabled}
        role="switch"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

const readable = (value: string) =>
  value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
