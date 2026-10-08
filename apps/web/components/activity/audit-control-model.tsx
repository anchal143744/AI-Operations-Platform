import { auditControlStages } from "../../lib/activity/model";
import { Icon } from "../icons";

export function AuditControlModel() {
  return (
    <section
      className="activity-control-model"
      aria-labelledby="audit-control-title"
    >
      <div>
        <p className="app-kicker">Control model</p>
        <h2 id="audit-control-title">Decisions and execution stay distinct.</h2>
        <p>
          The audit record preserves what was proposed, who decided, what the
          system executed, and the resulting outcome.
        </p>
      </div>
      <ol>
        {auditControlStages.map((stage, index) => (
          <li key={stage.label}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div>
              <strong>{stage.label}</strong>
              <small>{stage.description}</small>
            </div>
            {index < auditControlStages.length - 1 ? (
              <Icon name="arrow-down" size="small" />
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
