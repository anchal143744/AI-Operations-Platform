import type { RefObject } from "react";
import type { ShellUser } from "../../lib/app-shell/model";
import { Icon } from "../icons";

export function UserMenu({
  user,
  triggerRef,
  open,
  onToggle,
  onAction,
}: {
  user: ShellUser;
  triggerRef: RefObject<HTMLButtonElement | null>;
  open: boolean;
  onToggle: () => void;
  onAction: (label: string) => void;
}) {
  return (
    <div className="app-menu-root user-menu">
      <button
        ref={triggerRef}
        className="user-menu-trigger"
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls="user-account-menu"
        aria-label={`Open user menu for ${user.name}${user.isDemo ? ", demo identity" : ""}`}
        onClick={onToggle}
      >
        <span className="user-avatar" aria-hidden="true">
          {user.initials}
        </span>
        <span className="user-menu-copy">
          <strong>{user.name}</strong>
          <small>
            {user.role}
            {user.isDemo ? " · Demo" : ""}
          </small>
        </span>
        <Icon name="chevron-down" size="small" />
      </button>
      {open ? (
        <div
          className="app-popover user-popover"
          id="user-account-menu"
          role="menu"
        >
          <div className="user-popover-heading">
            <span className="user-avatar" aria-hidden="true">
              {user.initials}
            </span>
            <span>
              <strong>{user.name}</strong>
              <small>
                {user.isDemo
                  ? "Frontend demo identity"
                  : "Authenticated account"}
              </small>
            </span>
          </div>
          {["Profile", "Preferences", "Sign out"].map((label) => (
            <button
              key={label}
              type="button"
              role="menuitem"
              onClick={() => onAction(label)}
            >
              <Icon
                name={
                  label === "Profile"
                    ? "users"
                    : label === "Preferences"
                      ? "sliders"
                      : "log-out"
                }
                size="small"
              />
              {label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
