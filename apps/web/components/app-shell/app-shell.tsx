"use client";

import Link from "next/link";
import { useEffect, useReducer, useRef, useState, type ReactNode } from "react";
import {
  mobileNavigationReducer,
  type ApplicationRoute,
} from "../../lib/app-shell/model";
import { authenticationService } from "../../lib/auth/authentication-service";
import { useWorkspaceContext } from "../../lib/tenancy/tenancy-service";
import { Icon } from "../icons";
import { AppHeader, type HeaderMenu } from "./app-header";
import { AppMobileNav } from "./app-mobile-nav";
import { AppSidebar } from "./app-sidebar";
import { Breadcrumbs, type BreadcrumbItem } from "./breadcrumbs";

export function AppShell({
  currentRoute,
  pageSection,
  pageTitle,
  breadcrumbs,
  children,
}: {
  currentRoute: ApplicationRoute;
  pageSection: string;
  pageTitle: string;
  breadcrumbs?: readonly BreadcrumbItem[];
  children: ReactNode;
}) {
  const [mobileNavigationOpen, dispatchMobileNavigation] = useReducer(
    mobileNavigationReducer,
    false,
  );
  const [openMenu, setOpenMenu] = useState<HeaderMenu>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const workspaceMenuButtonRef = useRef<HTMLButtonElement>(null);
  const userMenuButtonRef = useRef<HTMLButtonElement>(null);
  const previousHeaderMenuRef = useRef<Exclude<HeaderMenu, null> | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const drawerCloseButtonRef = useRef<HTMLButtonElement>(null);
  const workspaceContext = useWorkspaceContext();
  const selected = workspaceContext.selected;
  const sessionUser = workspaceContext.session?.user;

  const closeNavigation = (restoreFocus = true) => {
    dispatchMobileNavigation("close");
    if (restoreFocus) {
      requestAnimationFrame(() => menuButtonRef.current?.focus());
    }
  };

  useEffect(() => {
    if (!mobileNavigationOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => drawerCloseButtonRef.current?.focus());

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      dispatchMobileNavigation("escape");
      requestAnimationFrame(() => menuButtonRef.current?.focus());
    };
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [mobileNavigationOpen]);

  useEffect(() => {
    if (!openMenu) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenMenu(null);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [openMenu]);

  useEffect(() => {
    const previousMenu = previousHeaderMenuRef.current;
    if (previousMenu && !openMenu) {
      const trigger =
        previousMenu === "workspace"
          ? workspaceMenuButtonRef.current
          : userMenuButtonRef.current;
      requestAnimationFrame(() => trigger?.focus());
    }
    previousHeaderMenuRef.current = openMenu;
  }, [openMenu]);

  const showUnavailable = (message: string) => {
    setNotice(message);
    setOpenMenu(null);
  };

  const handleLogout = async () => {
    setOpenMenu(null);
    try {
      await authenticationService.logout();
      window.location.assign("/login");
    } catch {
      setNotice("Sign out is currently unavailable. Try again shortly.");
    }
  };

  // The API remains the authorization boundary. This gate prevents the
  // authenticated shell from showing a synthetic identity while session and
  // workspace access are absent or still being verified.
  if (workspaceContext.status !== "ready" || !selected || !sessionUser) {
    return (
      <main className="app-session-gate" id="app-main-content">
        <div className="app-session-gate-content">
          <p className="app-kicker">Workspace access</p>
          {workspaceContext.status === "loading" ? (
            <p role="status">Checking your session and workspace…</p>
          ) : workspaceContext.status === "signed-out" ? (
            <>
              <h1>Sign in to continue</h1>
              <p>
                Your session is not active. Sign in to access this workspace.
              </p>
              <Link href="/login">Sign in</Link>
            </>
          ) : workspaceContext.status === "no-workspace" ? (
            <>
              <h1>Set up your workspace</h1>
              <p>No active workspace is available for this account.</p>
              <Link href="/onboarding">Set up your workspace</Link>
            </>
          ) : (
            <>
              <h1>Workspace access unavailable</h1>
              <p>We could not verify your session or workspace access.</p>
              <button type="button" onClick={workspaceContext.retry}>
                Try again
              </button>
            </>
          )}
        </div>
      </main>
    );
  }

  const shellContext = {
    workspace: {
      name: selected.workspaceName,
      descriptor: `${selected.organizationName} · ${selected.role}`,
      isDemo: false,
    },
    user: {
      name: sessionUser.name,
      role: selected.role,
      initials: sessionUser.name
        .split(/\s+/)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
      isDemo: false,
    },
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#app-main-content">
        Skip to {pageTitle.toLowerCase()}
      </a>
      <AppSidebar
        variant="desktop"
        currentRoute={currentRoute}
        onFutureItem={(label) =>
          showUnavailable(`${label} is planned for a later frontend phase.`)
        }
      />
      <AppMobileNav
        open={mobileNavigationOpen}
        drawerRef={drawerRef}
        closeButtonRef={drawerCloseButtonRef}
        currentRoute={currentRoute}
        onClose={() => closeNavigation()}
        onFutureItem={(label) => {
          showUnavailable(`${label} is planned for a later frontend phase.`);
          closeNavigation();
        }}
      />
      <div className="app-main-frame">
        <AppHeader
          context={shellContext}
          menuButtonRef={menuButtonRef}
          userMenuButtonRef={userMenuButtonRef}
          workspaceMenuButtonRef={workspaceMenuButtonRef}
          navigationOpen={mobileNavigationOpen}
          openMenu={openMenu}
          pageSection={pageSection}
          pageTitle={pageTitle}
          onOpenNavigation={() => dispatchMobileNavigation("open")}
          onToggleMenu={(menu) =>
            setOpenMenu((current) => (current === menu ? null : menu))
          }
          onUnavailable={showUnavailable}
          workspaceOptions={workspaceContext.options}
          selectedWorkspaceId={selected?.workspaceId ?? null}
          onSelectWorkspace={(workspaceId) => {
            setOpenMenu(null);
            void workspaceContext.select(workspaceId).then(
              () => setNotice("Workspace changed and verified by the server."),
              () => setNotice("That workspace could not be selected."),
            );
          }}
          onLogout={() => void handleLogout()}
          selectedWorkspace={selected}
        />
        <main className="app-main-content" id="app-main-content">
          <Breadcrumbs
            items={
              breadcrumbs ?? [{ label: pageSection }, { label: pageTitle }]
            }
          />
          {notice ? (
            <div className="app-shell-notice" role="status">
              <Icon name="shield-check" size="small" />
              <span>{notice}</span>
              <button
                type="button"
                aria-label="Dismiss message"
                onClick={() => setNotice(null)}
              >
                <Icon name="x" size="small" />
              </button>
            </div>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}
