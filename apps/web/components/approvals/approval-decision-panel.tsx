import { rejectionReasonCategories } from "../../lib/approvals/model";
import { Button, Card } from "../ui/primitives";

export function ApprovalDecisionPanel({
  onUnavailable,
}: {
  onUnavailable: () => void;
}) {
  return (
    <Card className="approval-decision-panel">
      <div className="approval-decision-heading">
        <div>
          <p className="app-kicker">Human decision</p>
          <h2>Decision authority stays with your team</h2>
        </div>
        <span>Service not connected</span>
      </div>

      <label className="approval-review-note">
        <span>Review note</span>
        <textarea
          disabled
          rows={3}
          placeholder="Add context for the approval decision..."
        />
        <small>
          Decision notes for live workflow requests are stored through the
          review queue above. This preview does not submit notes.
        </small>
      </label>

      <div
        className="approval-rejection-reasons"
        aria-label="Future rejection reasons"
      >
        <span>Reason for rejection</span>
        <div>
          {rejectionReasonCategories.map((reason) => (
            <span key={reason}>{reason}</span>
          ))}
        </div>
      </div>

      <div className="approval-decision-actions">
        <Button size="small" onClick={onUnavailable}>
          Approve
        </Button>
        <Button variant="outline" size="small" onClick={onUnavailable}>
          Reject
        </Button>
        <Button variant="secondary" size="small" onClick={onUnavailable}>
          Edit &amp; approve
        </Button>
      </div>
      <p className="approval-edit-note">
        Reviewers will be able to modify a proposed action before approving it.
      </p>
    </Card>
  );
}
