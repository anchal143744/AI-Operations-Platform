import type { RefObject } from "react";
import type { ShellWorkspace } from "../../lib/app-shell/model";
import type { WorkspaceSelection } from "../../lib/tenancy/tenancy-service";
import { Icon } from "../icons";

export function WorkspaceSwitcher({
  workspace,
  triggerRef,
  open,
  onToggle,
  options,
  selectedId,
  onSelect,
}: {
  workspace: ShellWorkspace;
  triggerRef: RefObject<HTMLButtonElement | null>;
  open: boolean;
  onToggle: () => void;
  options: readonly WorkspaceSelection[];
  selectedId: string | null;
  onSelect: (workspaceId: string) => void;
}) {
  return (
    <div className="app-menu-root workspace-switcher">
      <button
        ref={triggerRef}
        className="workspace-trigger"
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls="workspace-menu"
        aria-label={`${workspace.name}, ${workspace.descriptor}. Open workspace menu`}
        onClick={onToggle}
      >
        <span className="workspace-avatar" aria-hidden="true">
          AO
        </span>
        <span>
          <strong>{workspace.name}</strong>
          <small>{workspace.descriptor}</small>
        </span>
        <Icon name="chevron-down" size="small" />
      </button>
      {open ? (
        <div
          className="app-popover workspace-popover"
          id="workspace-menu"
          role="menu"
        >
          <span className="app-popover-label">
            {workspace.isDemo ? "Workspace preview" : "Authorized workspaces"}
          </span>
          {options.length ? (
            options.map((option) => (
              <button
                key={option.workspaceId}
                type="button"
                role="menuitemradio"
                aria-checked={option.workspaceId === selectedId}
                onClick={() => onSelect(option.workspaceId)}
              >
                <span className="workspace-avatar" aria-hidden="true">
                  AO
                </span>
                <span>
                  <strong>{option.workspaceName}</strong>
                  <small>
                    {option.organizationName} · {option.role}
                  </small>
                </span>
                {option.workspaceId === selectedId ? (
                  <Icon name="check" size="small" />
                ) : null}
              </button>
            ))
          ) : (
            <p>
              {workspace.isDemo
                ? "Sign in and create a workspace to replace this preview."
                : "No active workspace is available."}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
