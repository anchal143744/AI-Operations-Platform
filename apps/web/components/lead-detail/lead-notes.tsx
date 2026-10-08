import type { LeadNote } from "../../lib/leads/model";
import { Icon } from "../icons";
import { Button, Card } from "../ui/primitives";

export function LeadNotes({
  notes,
  onAdd,
}: {
  notes: readonly LeadNote[];
  onAdd: () => void;
}) {
  return (
    <Card className="lead-detail-card lead-compact-empty lead-area-notes">
      <div className="lead-card-heading">
        <span className="lead-card-icon" aria-hidden="true">
          <Icon name="draft" />
        </span>
        <div>
          <p className="app-kicker">Team context</p>
          <h2>Notes</h2>
        </div>
      </div>
      {notes.length === 0 ? <p>No notes yet</p> : null}
      <Button variant="outline" size="small" onClick={onAdd}>
        Add note
      </Button>
    </Card>
  );
}
