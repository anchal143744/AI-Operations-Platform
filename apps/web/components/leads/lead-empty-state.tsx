import { leadWorkflow } from "../../lib/leads/model";
import { Icon } from "../icons";
import { Button, ButtonLink } from "../ui/primitives";

export function LeadEmptyState({
  title,
  description,
  canAddLead,
  onAddLead,
}: {
  title: string;
  description: string;
  canAddLead: boolean;
  onAddLead: () => void;
}) {
  return (
    <div className="lead-empty-state">
      <div className="lead-empty-copy">
        <span className="lead-empty-icon" aria-hidden="true">
          <Icon name="target" />
        </span>
        <p className="app-kicker">Ready for intake</p>
        <h2>{title}</h2>
        <p>{description}</p>
        {canAddLead ? (
          <div className="lead-empty-actions">
            <Button onClick={onAddLead}>
              Add your first lead
              <Icon name="arrow-right" size="small" />
            </Button>
            <ButtonLink href="/leads/demo-lead-001" variant="outline">
              Preview demo lead
            </ButtonLink>
          </div>
        ) : null}
      </div>
      <ol className="lead-empty-workflow" aria-label="Lead workflow">
        {leadWorkflow.map((item, index) => (
          <li key={item.label}>
            <span>{item.step}</span>
            <strong>{item.label}</strong>
            {index < leadWorkflow.length - 1 ? (
              <Icon name="arrow-right" size="small" />
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
