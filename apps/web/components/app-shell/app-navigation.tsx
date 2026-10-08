import Link from "next/link";
import {
  applicationNavigation,
  isApplicationRouteActive,
  type ApplicationRoute,
} from "../../lib/app-shell/model";
import { Icon } from "../icons";

export function AppNavigation({
  currentRoute,
  onFutureItem,
}: {
  currentRoute: ApplicationRoute;
  onFutureItem: (label: string) => void;
}) {
  return (
    <nav className="app-navigation" aria-label="Application navigation">
      {applicationNavigation.map((group) => (
        <section className="app-nav-group" key={group.label}>
          <h2>{group.label}</h2>
          <ul>
            {group.items.map((item) => {
              const active = isApplicationRouteActive(item, currentRoute);
              return (
                <li key={item.href}>
                  {item.available ? (
                    <Link
                      className={`app-nav-item${active ? " is-active" : ""}`}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                    >
                      <Icon name={item.icon} />
                      <span>{item.label}</span>
                    </Link>
                  ) : (
                    <button
                      className="app-nav-item is-future"
                      type="button"
                      onClick={() => onFutureItem(item.label)}
                    >
                      <Icon name={item.icon} />
                      <span>{item.label}</span>
                      <small>Planned</small>
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </nav>
  );
}
