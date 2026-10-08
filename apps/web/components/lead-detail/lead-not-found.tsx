import { Icon } from "../icons";
import { ButtonLink, Card } from "../ui/primitives";

export function LeadNotFound({ demo = true }: { demo?: boolean }) {
  return (
    <Card className="lead-not-found">
      <span aria-hidden="true">
        <Icon name="target" />
      </span>
      <p className="app-kicker">{demo ? "Frontend demo" : "Workspace leads"}</p>
      <h1>Lead not found</h1>
      <p>
        {demo
          ? "This lead isn't available in the current frontend demo."
          : "This lead is not available in the selected workspace."}
      </p>
      <ButtonLink href="/leads">
        Back to Leads
        <Icon name="arrow-right" size="small" />
      </ButtonLink>
    </Card>
  );
}
