import { Icon } from "../icons";

export function HumanReviewState() {
  return (
    <section
      className="conversation-context-card"
      aria-labelledby="conversation-review-title"
    >
      <div className="conversation-context-heading">
        <span aria-hidden="true">
          <Icon name="user-check" size="small" />
        </span>
        <h4 id="conversation-review-title">Human review</h4>
        <small>Not configured</small>
      </div>
      <p>
        Policy-validated response drafts will appear here when human approval is
        required.
      </p>
    </section>
  );
}
