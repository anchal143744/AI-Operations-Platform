import type { TeamMember } from "../../lib/settings/model";
import { Button } from "../ui/primitives";
import { SettingsEmptyState } from "./settings-empty-state";
import { SettingsSection } from "./settings-section";

export function TeamSettings({
  members,
  onInvite,
  error,
  loading = false,
}: {
  members: readonly TeamMember[];
  onInvite: () => void;
  error?: string | null;
  loading?: boolean;
}) {
  return (
    <SettingsSection
      id="team"
      eyebrow="Team"
      title="Workspace members"
      description="Current organization memberships with access to this workspace. Invitations are not connected yet."
    >
      <div className="settings-section-action">
        <span>
          {members.length
            ? `${members.length} ${members.length === 1 ? "member" : "members"}`
            : "No members available"}
        </span>
        <Button size="small" onClick={onInvite}>
          Invite member
        </Button>
      </div>
      {loading ? (
        <p className="settings-boundary-note" role="status">
          Loading organization members…
        </p>
      ) : error ? (
        <p className="settings-boundary-note" role="alert">
          {error}
        </p>
      ) : members.length ? (
        <div className="settings-table" role="table" aria-label="Team members">
          <div role="row" className="settings-table-header">
            {["Name", "Email", "Role", "Status", "Last active"].map((label) => (
              <span role="columnheader" key={label}>
                {label}
              </span>
            ))}
          </div>
          {members.map((member) => (
            <div role="row" className="settings-table-row" key={member.id}>
              <span
                role="cell"
                data-label="Name"
                aria-label={`Name: ${member.name}`}
              >
                {member.name}
              </span>
              <span
                role="cell"
                data-label="Email"
                aria-label={`Email: ${member.email}`}
              >
                {member.email}
              </span>
              <span
                role="cell"
                data-label="Role"
                aria-label={`Role: ${member.role}`}
              >
                {member.role}
              </span>
              <span
                role="cell"
                data-label="Status"
                aria-label={`Status: ${member.status}`}
              >
                {member.status}
              </span>
              <span
                role="cell"
                data-label="Last active"
                aria-label={`Last active: ${member.lastActiveAt ?? "Not recorded"}`}
              >
                {member.lastActiveAt ?? "Not recorded"}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <SettingsEmptyState
          icon="users"
          title="No team members"
          description="No organization memberships are available to display."
        />
      )}
    </SettingsSection>
  );
}
