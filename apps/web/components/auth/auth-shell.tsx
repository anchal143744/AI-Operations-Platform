import type { ReactNode } from "react";
import { Icon } from "../icons";
import { Badge, BrandMark, Card, StatusIndicator } from "../ui/primitives";

const workflowStages = [
  {
    label: "Enquiry captured",
    detail: "One controlled entry point",
    state: "complete",
  },
  {
    label: "AI understands",
    detail: "Context becomes structured",
    state: "complete",
  },
  {
    label: "Human decides",
    detail: "Consequential actions reviewed",
    state: "active",
  },
  {
    label: "System records",
    detail: "Execution stays auditable",
    state: "pending",
  },
] as const;

export type AuthShellProps = Readonly<{
  children: ReactNode;
  titleId: string;
  skipLabel: string;
  eyebrow: string;
  title: string;
  accentTitle: string;
  description: string;
  cardSize?: "default" | "wide";
}>;

export function AuthShell({
  children,
  titleId,
  skipLabel,
  eyebrow,
  title,
  accentTitle,
  description,
  cardSize = "default",
}: AuthShellProps) {
  const panelId = `${titleId}-panel`;

  return (
    <>
      <a className="skip-link" href={`#${panelId}`}>
        {skipLabel}
      </a>
      <main className="auth-page">
        <section
          className="auth-brand-panel section-dark"
          aria-labelledby="auth-positioning"
        >
          <a
            className="auth-brand-home"
            href="/"
            aria-label="AI Operations Platform home"
          >
            <BrandMark />
          </a>

          <div className="auth-brand-content">
            <Badge tone="brand">
              <StatusIndicator state="active" /> {eyebrow}
            </Badge>
            <h1 id="auth-positioning">
              {title}
              <span>{accentTitle}</span>
            </h1>
            <p>{description}</p>
          </div>

          <div
            className="auth-workflow"
            aria-label="Illustrative product workflow"
          >
            <div className="auth-workflow-heading">
              <span>Operational workflow</span>
              <Badge tone="neutral">Illustrative</Badge>
            </div>
            <ol className="auth-workflow-list">
              {workflowStages.map((stage, index) => (
                <li
                  className={`auth-workflow-stage stage-${stage.state}`}
                  key={stage.label}
                >
                  <span className="auth-stage-index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="auth-stage-copy">
                    <strong>{stage.label}</strong>
                    <small>{stage.detail}</small>
                  </span>
                  <StatusIndicator state={stage.state} />
                </li>
              ))}
            </ol>
            <div className="auth-workflow-footer">
              <Icon name="shield-check" size="small" />
              <span>Policy-aware by design</span>
            </div>
          </div>
        </section>

        <section className="auth-access-panel" aria-labelledby={titleId}>
          <div
            className={`auth-panel-inner${cardSize === "wide" ? " auth-panel-inner-wide" : ""}`}
          >
            <a className="auth-return-link" href="/">
              <Icon name="arrow-right" size="small" />
              Return to product
            </a>
            <Card className="auth-card" id={panelId}>
              {children}
            </Card>
            <footer className="auth-footer">
              <span>© 2026 AI Operations Platform</span>
              <span>Secure session authentication</span>
            </footer>
          </div>
        </section>
      </main>
    </>
  );
}
