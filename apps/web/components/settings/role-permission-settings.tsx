import { permissionCategories, workspaceRoles } from "../../lib/settings/model";
import { Icon } from "../icons";
import { SettingsSection } from "./settings-section";

const readable = (value: string) =>
  value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

export function RolePermissionSettings() {
  return (
    <SettingsSection
      id="roles-permissions"
      eyebrow="Access architecture"
      title="Roles & permissions"
      description="Membership roles are resolved by the server. This settings preview does not assign roles or enforce permissions."
    >
      <div className="settings-role-grid">
        {workspaceRoles.map((role) => (
          <article key={role}>
            <header>
              <Icon
                name={role === "OWNER" ? "shield-check" : "user-check"}
                size="small"
              />
              <strong>{readable(role)}</strong>
            </header>
            <p>Organization membership role</p>
          </article>
        ))}
      </div>
      <div
        className="settings-permission-list"
        aria-label="Permission categories"
      >
        {permissionCategories.map((permission) => (
          <span key={permission}>{readable(permission)}</span>
        ))}
      </div>
      <p className="settings-boundary-note">
        The server-side RBAC foundation is implemented. Business API permission
        checks and role-management controls are not connected here yet.
      </p>
    </SettingsSection>
  );
}
