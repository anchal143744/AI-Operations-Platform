import Link from "next/link";

export type BreadcrumbItem = Readonly<{
  label: string;
  href?: `/${string}`;
}>;

export function Breadcrumbs({ items }: { items: readonly BreadcrumbItem[] }) {
  return (
    <nav className="app-breadcrumbs" aria-label="Breadcrumb">
      <ol>
        {items.map((item, index) => {
          const current = index === items.length - 1;
          return (
            <li
              key={`${item.label}-${index}`}
              aria-current={current ? "page" : undefined}
            >
              {item.href && !current ? (
                <Link href={item.href}>{item.label}</Link>
              ) : (
                item.label
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
