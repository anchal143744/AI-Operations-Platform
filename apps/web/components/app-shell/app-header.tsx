import type { RefObject } from "react";
import type { ShellContext } from "../../lib/app-shell/model";
import { Icon } from "../icons";
import { NotificationButton } from "./notification-button";
import { UserMenu } from "./user-menu";
import { WorkspaceSwitcher } from "./workspace-switcher";

export type HeaderMenu = "workspace" | "user" | null;

export function AppHeader({
  context,
  menuButtonRef,
  userMenuButtonRef,
  workspaceMenuButtonRef,
  navigationOpen,
  openMenu,
  pageSection,
  pageTitle,
  onOpenNavigation,
  onToggleMenu,
  onUnavailable,
  workspaceOptions,
  selectedWorkspaceId,
  onSelectWorkspace,
  onLogout,
  selectedWorkspace,
}: {
  context: ShellContext;
  menuButtonRef: RefObject<HTMLButtonElement | null>;
  userMenuButtonRef: RefObject<HTMLButtonElement | null>;
  workspaceMenuButtonRef: RefObject<HTMLButtonElement | null>;
  navigationOpen: boolean;
  openMenu: HeaderMenu;
  pageSection: string;
  pageTitle: string;
  onOpenNavigation: () => void;
  onToggleMenu: (menu: Exclude<HeaderMenu, null>) => void;
  onUnavailable: (message: string) => void;
  workspaceOptions: readonly import("../../lib/tenancy/tenancy-service").WorkspaceSelection[];
  selectedWorkspaceId: string | null;
  onSelectWorkspace: (workspaceId: string) => void;
  onLogout: () => void;
  selectedWorkspace:
    import("../../lib/tenancy/tenancy-service").WorkspaceSelection | null;
}) {
  return (
    <header className="app-header">
      <div className="app-header-left">
        <button
          className="app-icon-button app-mobile-menu-button"
          type="button"
          ref={menuButtonRef}
          aria-label="Open navigation"
          aria-expanded={navigationOpen}
          aria-controls="application-navigation-drawer"
          onClick={onOpenNavigation}
        >
          <Icon name="menu" />
        </button>
        <WorkspaceSwitcher
          triggerRef={workspaceMenuButtonRef}
          workspace={context.workspace}
          open={openMenu === "workspace"}
          onToggle={() => onToggleMenu("workspace")}
          options={workspaceOptions}
          selectedId={selectedWorkspaceId}
          onSelect={onSelectWorkspace}
        />
      </div>
      <div className="app-header-context" aria-label="Current page">
        <span>{pageSection}</span>
        <strong>{pageTitle}</strong>
      </div>
      <div className="app-header-actions">
        <NotificationButton workspace={selectedWorkspace} />
        <UserMenu
          triggerRef={userMenuButtonRef}
          user={context.user}
          open={openMenu === "user"}
          onToggle={() => onToggleMenu("user")}
          onAction={(label) => {
            if (label === "Sign out") {
              onLogout();
              return;
            }
            onUnavailable(`${label} is not connected in this frontend shell.`);
          }}
        />
      </div>
    </header>
  );
}
