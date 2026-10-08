import type { WorkflowSettings as WorkflowSettingsModel } from "../../lib/settings/model";
import { SettingsToggle } from "./ai-settings";
import { SettingsSection } from "./settings-section";

export function WorkflowSettings({
  value,
  onChange,
  disabled = false,
}: {
  value: WorkflowSettingsModel;
  onChange: (value: WorkflowSettingsModel) => void;
  disabled?: boolean;
}) {
  return (
    <SettingsSection
      id="workflow-settings"
      eyebrow="Automation boundaries"
      title="Workflow settings"
      description="Prepare deterministic execution, review, failure, retry, and volume boundaries."
    >
      <div className="settings-form-grid">
        <SettingsSelect
          label="Execution mode"
          value={value.executionMode}
          options={["UNCONFIGURED", "MANUAL", "CONTROLLED_AUTOMATION"]}
          disabled={disabled}
          onChange={(next) =>
            onChange({
              ...value,
              executionMode: next as WorkflowSettingsModel["executionMode"],
            })
          }
        />
        <SettingsSelect
          label="Failure handling"
          value={value.failureHandling}
          options={["UNCONFIGURED", "PAUSE", "STOP", "ESCALATE"]}
          disabled={disabled}
          onChange={(next) =>
            onChange({
              ...value,
              failureHandling: next as WorkflowSettingsModel["failureHandling"],
            })
          }
        />
        <SettingsSelect
          label="Retry policy"
          value={value.retryPolicy}
          options={["UNCONFIGURED", "NONE", "LIMITED"]}
          disabled={disabled}
          onChange={(next) =>
            onChange({
              ...value,
              retryPolicy: next as WorkflowSettingsModel["retryPolicy"],
            })
          }
        />
        <label className="settings-field">
          <span>
            Execution limit <small>Future safeguard</small>
          </span>
          <input
            className="field-control"
            type="number"
            disabled={disabled}
            min="1"
            value={value.executionLimit ?? ""}
            placeholder="Not configured"
            onChange={(event) =>
              onChange({
                ...value,
                executionLimit: event.target.value
                  ? Number(event.target.value)
                  : null,
              })
            }
          />
        </label>
      </div>
      <SettingsToggle
        label="Approval requirement"
        description="Route consequential workflow actions for future human review."
        checked={value.approvalRequired}
        disabled={disabled}
        onChange={(approvalRequired) =>
          onChange({ ...value, approvalRequired })
        }
      />
      <p className="settings-boundary-note">
        Preview only: no workflow execution, retries, scheduling, or failure
        recovery is connected. These choices are not saved.
      </p>
    </SettingsSection>
  );
}

function SettingsSelect({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="settings-field">
      <span>{label}</span>
      <select
        className="field-control"
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {readable(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

const readable = (value: string) =>
  value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
