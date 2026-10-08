import { ButtonLink } from "../ui/primitives";

export function ApprovalHeader() {
  return (
    <header className="ops-page-header approval-header">
      <div>
        <p className="app-kicker">Decision control</p>
        <h1>Human Review</h1>
        <p>
          Review AI-assisted actions before they affect customers, workflows, or
          business operations.
        </p>
      </div>
      <div className="ops-header-actions">
        <ButtonLink
          variant="outline"
          href="#approval-policy-preview"
          size="small"
        >
          Approval policy
        </ButtonLink>
        <ButtonLink href="#approval-queue" size="small">
          Review queue
        </ButtonLink>
      </div>
    </header>
  );
}
