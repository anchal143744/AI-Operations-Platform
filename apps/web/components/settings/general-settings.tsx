import type { ReactNode } from "react";
import {
  companySizes,
  industries,
  responseExpectations,
} from "../../lib/onboarding/model";
import type { WorkspaceSettings } from "../../lib/settings/model";
import { SettingsSection } from "./settings-section";

const commonTimezones = [
  "UTC",
  "Asia/Kolkata",
  "Europe/London",
  "America/New_York",
] as const;

export function GeneralSettings({
  value,
  onChange,
}: {
  value: WorkspaceSettings;
  onChange: (value: WorkspaceSettings) => void;
}) {
  return (
    <SettingsSection
      id="general"
      eyebrow="General"
      title="Workspace profile"
      description="Maintain the business context stored for this workspace. This profile does not enable integrations or automation."
    >
      <div className="settings-form-grid">
        <SettingsField label="Workspace name">
          <input
            className="field-control"
            value={value.workspaceName}
            onChange={(event) =>
              onChange({ ...value, workspaceName: event.target.value })
            }
            autoComplete="organization"
          />
        </SettingsField>
        <SettingsField label="Website" optional>
          <input
            className="field-control"
            type="url"
            value={value.website}
            inputMode="url"
            onChange={(event) =>
              onChange({ ...value, website: event.target.value })
            }
            autoComplete="url"
          />
        </SettingsField>
        <SettingsField label="Industry">
          <select
            className="field-control"
            value={value.industry}
            onChange={(event) =>
              onChange({
                ...value,
                industry: event.target.value as WorkspaceSettings["industry"],
              })
            }
          >
            <option value="">Select industry</option>
            {industries.map((industry) => (
              <option key={industry.value} value={industry.value}>
                {industry.label}
              </option>
            ))}
          </select>
        </SettingsField>
        <SettingsField label="Company size">
          <select
            className="field-control"
            value={value.companySize}
            onChange={(event) =>
              onChange({
                ...value,
                companySize: event.target
                  .value as WorkspaceSettings["companySize"],
              })
            }
          >
            <option value="">Select company size</option>
            {companySizes.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </SettingsField>
        <SettingsField label="Timezone">
          <select
            className="field-control"
            value={value.timezone}
            onChange={(event) =>
              onChange({ ...value, timezone: event.target.value })
            }
          >
            <option value="">Select timezone</option>
            {value.timezone &&
            !commonTimezones.some((timezone) => timezone === value.timezone) ? (
              <option value={value.timezone}>{value.timezone}</option>
            ) : null}
            {commonTimezones.map((timezone) => (
              <option key={timezone} value={timezone}>
                {timezone}
              </option>
            ))}
          </select>
        </SettingsField>
        <SettingsField label="Response expectation">
          <select
            className="field-control"
            value={value.responseExpectation}
            onChange={(event) =>
              onChange({
                ...value,
                responseExpectation: event.target
                  .value as WorkspaceSettings["responseExpectation"],
              })
            }
          >
            <option value="">Select response expectation</option>
            {responseExpectations.map((expectation) => (
              <option key={expectation.value} value={expectation.value}>
                {expectation.label}
              </option>
            ))}
          </select>
        </SettingsField>
      </div>
    </SettingsSection>
  );
}

function SettingsField({
  label,
  optional,
  children,
}: {
  label: string;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="settings-field">
      <span>
        {label}
        {optional ? <small>Optional</small> : null}
      </span>
      {children}
    </label>
  );
}
