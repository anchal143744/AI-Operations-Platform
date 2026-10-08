import type { RefObject } from "react";
import type { ApplicationRoute } from "../../lib/app-shell/model";
import { Icon } from "../icons";
import { BrandMark } from "../ui/primitives";
import { AppNavigation } from "./app-navigation";

export function AppSidebar({
  currentRoute,
  variant,
  closeButtonRef,
  onClose,
  onFutureItem,
}: {
  currentRoute: ApplicationRoute;
  variant: "desktop" | "drawer";
  closeButtonRef?: RefObject<HTMLButtonElement | null> | undefined;
  onClose?: (() => void) | undefined;
  onFutureItem: (label: string) => void;
}) {
  return (
    <aside className={`app-sidebar app-sidebar-${variant}`}>
      <div className="app-sidebar-brand">
        <a href="/" aria-label="AI Operations Platform home">
          <BrandMark />
        </a>
        {variant === "drawer" ? (
          <button
            className="app-icon-button app-drawer-close"
            type="button"
            ref={closeButtonRef}
            aria-label="Close navigation"
            onClick={onClose}
          >
            <Icon name="x" />
          </button>
        ) : null}
      </div>
      <AppNavigation currentRoute={currentRoute} onFutureItem={onFutureItem} />
      <div className="app-sidebar-status">
        <span>Product status</span>
        <strong>Some modules in development</strong>
      </div>
    </aside>
  );
}
