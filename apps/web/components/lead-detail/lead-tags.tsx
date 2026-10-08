import type { LeadTag } from "../../lib/leads/model";
import { Icon } from "../icons";
import { Button, Card } from "../ui/primitives";

export function LeadTags({
  tags,
  onAdd,
}: {
  tags: readonly LeadTag[];
  onAdd: () => void;
}) {
  return (
    <Card className="lead-detail-card lead-compact-empty lead-area-tags">
      <div className="lead-card-heading">
        <span className="lead-card-icon" aria-hidden="true">
          <Icon name="sliders" />
        </span>
        <div>
          <p className="app-kicker">Organization</p>
          <h2>Tags</h2>
        </div>
      </div>
      {tags.length === 0 ? <p>No tags</p> : null}
      <Button variant="outline" size="small" onClick={onAdd}>
        Add tag
      </Button>
    </Card>
  );
}
