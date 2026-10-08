import type { KeyboardEvent, RefObject } from "react";
import type { ApplicationRoute } from "../../lib/app-shell/model";
import { AppSidebar } from "./app-sidebar";

export function AppMobileNav({
  open,
  drawerRef,
  closeButtonRef,
  currentRoute,
  onClose,
  onFutureItem,
}: {
  open: boolean;
  drawerRef: RefObject<HTMLDivElement | null>;
  closeButtonRef: RefObject<HTMLButtonElement | null>;
  currentRoute: ApplicationRoute;
  onClose: () => void;
  onFutureItem: (label: string) => void;
}) {
  if (!open) return null;

  const keepFocusInside = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;
    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) return;

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="app-drawer-layer">
      <button
        className="app-drawer-backdrop"
        type="button"
        tabIndex={-1}
        aria-label="Close navigation"
        onClick={onClose}
      />
      <div
        className="app-drawer-panel"
        id="application-navigation-drawer"
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Application navigation"
        onKeyDown={keepFocusInside}
      >
        <AppSidebar
          variant="drawer"
          currentRoute={currentRoute}
          closeButtonRef={closeButtonRef}
          onClose={onClose}
          onFutureItem={onFutureItem}
        />
      </div>
    </div>
  );
}
