import type {
  ButtonHTMLAttributes,
  CSSProperties,
  HTMLAttributes,
  ReactNode,
} from "react";
import Link from "next/link";

type IconTone = "neutral" | "brand" | "dark";
type BadgeTone = "neutral" | "brand" | "success" | "warning";

const classes = (...values: Array<string | undefined>) =>
  values.filter(Boolean).join(" ");

export function Container({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={classes("container", className)} {...props} />;
}

export function Section({
  className,
  tone = "default",
  ...props
}: HTMLAttributes<HTMLElement> & {
  tone?: "default" | "soft" | "dark";
}) {
  return (
    <section
      className={classes("section", `section-${tone}`, className)}
      {...props}
    />
  );
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={classes("card", className)} {...props} />;
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span className={classes("badge", `badge-${tone}`, className)}>
      {children}
    </span>
  );
}

export function IconWrapper({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: IconTone;
}) {
  return (
    <span className={classes("icon-wrapper", `icon-wrapper-${tone}`)}>
      {children}
    </span>
  );
}

export function StatusIndicator({
  state,
}: {
  state: "active" | "complete" | "pending";
}) {
  return (
    <span
      className={classes("status-indicator", `status-${state}`)}
      aria-hidden="true"
    />
  );
}

export function NavItem({
  href,
  children,
}: {
  href: `#${string}`;
  children: ReactNode;
}) {
  return (
    <a className="nav-item" href={href}>
      {children}
    </a>
  );
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
  size = "large",
  className,
}: {
  href: `#${string}` | `/${string}`;
  children: ReactNode;
  variant?: "primary" | "secondary" | "outline";
  size?: "small" | "large";
  className?: string;
}) {
  return (
    <Link
      className={classes(
        "button",
        `button-${variant}`,
        `button-${size}`,
        className,
      )}
      href={href}
    >
      {children}
    </Link>
  );
}

export function Button({
  children,
  variant = "primary",
  size = "large",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "outline";
  size?: "small" | "large";
}) {
  return (
    <button
      className={classes(
        "button",
        `button-${variant}`,
        `button-${size}`,
        className,
      )}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={classes("brand-mark", compact ? "brand-compact" : undefined)}
    >
      <span className="brand-symbol" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      {!compact ? (
        <span className="brand-name">
          AI Operations <strong>Platform</strong>
        </span>
      ) : null}
    </span>
  );
}

export function Reveal({
  children,
  className,
  delay = "none",
  style,
}: {
  children: ReactNode;
  className?: string;
  delay?: "none" | "short" | "medium";
  style?: CSSProperties;
}) {
  return (
    <div
      className={classes("reveal", `reveal-${delay}`, className)}
      style={style}
    >
      {children}
    </div>
  );
}
