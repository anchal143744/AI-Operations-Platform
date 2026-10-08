import {
  approvalPolicyModes,
  type ApprovalPolicy,
  type ApprovalPolicyMode,
} from "../../lib/settings/model";
import { SettingsSection } from "./settings-section";

const actionLabels: Readonly<Record<ApprovalPolicy["action"], string>> = {
  SEND_CUSTOMER_MESSAGE: "Send customer message",
  UPDATE_LEAD: "Update lead",
  CREATE_FOLLOW_UP: "Create follow-up",
  ASSIGN_OWNER: "Assign owner",
  CHANGE_LEAD_STATUS: "Change lead status",
  TRIGGER_WORKFLOW: "Trigger workflow",
  EXECUTE_WORKFLOW: "Execute workflow",
};

const modeLabels: Readonly<Record<ApprovalPolicyMode, string>> = {
  AUTOMATIC: "Automatic",
  REQUIRES_APPROVAL: "Requires approval",
  BLOCKED: "Blocked",
};

export function ApprovalPolicySettings({
  policies,
  onChange,
  disabled = false,
}: {
  policies: readonly ApprovalPolicy[];
  onChange: (policies: readonly ApprovalPolicy[]) => void;
  disabled?: boolean;
}) {
  const updateMode = (
    action: ApprovalPolicy["action"],
    mode: ApprovalPolicyMode | null,
  ) => {
    onChange(
      policies.map((policy) =>
        policy.action === action ? { ...policy, mode } : policy,
      ),
    );
  };

  return (
    <SettingsSection
      id="approval-policies"
      eyebrow="Decision policy"
      title="Approval policies"
      description="Prepare which proposed operations could be automatic, require a person, or remain blocked."
    >
      <div className="settings-policy-list">
        {policies.map((policy) => (
          <label key={policy.action}>
            <span>
              <strong>{actionLabels[policy.action]}</strong>
              <small>No policy evaluation is active</small>
            </span>
            <select
              className="field-control"
              disabled={disabled}
              value={policy.mode ?? ""}
              onChange={(event) =>
                updateMode(
                  policy.action,
                  (event.target.value || null) as ApprovalPolicyMode | null,
                )
              }
            >
              <option value="">Not configured</option>
              {approvalPolicyModes.map((mode) => (
                <option key={mode} value={mode}>
                  {modeLabels[mode]}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <p className="settings-boundary-note">
        Preview only: no policy engine is connected. These modes are not saved
        or enforced.
      </p>
    </SettingsSection>
  );
}
