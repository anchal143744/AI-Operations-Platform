import { Icon } from "../icons";

const Node = ({
  eyebrow,
  title,
  tone = "default",
}: {
  eyebrow: string;
  title: string;
  tone?: "default" | "policy" | "human" | "action";
}) => (
  <div className={`workflow-node workflow-node-${tone}`}>
    <span>{eyebrow}</span>
    <strong>{title}</strong>
  </div>
);

export function WorkflowBuilderPreview() {
  return (
    <section
      className="workflow-builder"
      aria-labelledby="builder-preview-title"
    >
      <div className="workflow-builder-copy">
        <p className="app-kicker">Architecture preview · Not executable</p>
        <h2 id="builder-preview-title">
          Build control into every automated decision.
        </h2>
        <p>
          Business events can move through AI assistance, policy evaluation, and
          human review before an action is allowed to run.
        </p>
      </div>
      <div
        className="workflow-canvas"
        aria-label="Non-functional workflow architecture preview"
      >
        <Node eyebrow="Trigger" title="New lead" />
        <Icon name="arrow-down" size="small" />
        <Node eyebrow="AI assistance" title="Qualification" />
        <Icon name="arrow-down" size="small" />
        <Node eyebrow="Control gate" title="Policy check" tone="policy" />
        <div className="workflow-branch">
          <span aria-hidden="true" />
          <strong>Requires human review?</strong>
          <span aria-hidden="true" />
        </div>
        <div className="workflow-paths">
          <div>
            <small>Yes</small>
            <Node eyebrow="Decision" title="Human review" tone="human" />
          </div>
          <div>
            <small>No</small>
            <Node eyebrow="Policy passed" title="Continue" />
          </div>
        </div>
        <div className="workflow-merge">
          <span aria-hidden="true" />
          <Icon name="arrow-down" size="small" />
          <span aria-hidden="true" />
        </div>
        <Node eyebrow="Approved operation" title="Action" tone="action" />
        <Icon name="arrow-down" size="small" />
        <div className="workflow-end-row">
          <Node eyebrow="Next step" title="Follow-up" />
          <Node eyebrow="Evidence" title="Audit" />
        </div>
      </div>
    </section>
  );
}
