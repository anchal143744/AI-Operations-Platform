import { approvalControlStages } from "../../lib/approvals/model";
import { Icon } from "../icons";

export function ApprovalControlModel() {
  return (
    <section
      className="approval-control-model"
      aria-labelledby="approval-control-title"
    >
      <div>
        <p className="app-kicker">Control architecture · Frontend preview</p>
        <h2 id="approval-control-title">
          AI can propose. People retain decision authority.
        </h2>
        <p>
          A recommendation crosses explicit policy and human boundaries before
          the system can execute or record an outcome.
        </p>
      </div>
      <div className="approval-control-flow">
        {approvalControlStages.map((stage, index) => (
          <div
            className={`approval-control-stage approval-control-${stage.label.toLowerCase()}`}
            key={stage.label}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{stage.label}</strong>
            <div>
              {stage.actions.map((action) => (
                <small key={action}>{action}</small>
              ))}
            </div>
            {index < approvalControlStages.length - 1 ? (
              <Icon name="arrow-down" size="small" />
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
