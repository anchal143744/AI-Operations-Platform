import { AI_CONTROL_GROUPS } from "../../lib/ai-operations/model";
import { Icon } from "../icons";

export function AIControlModel() {
  return (
    <section
      className="control-model control-model-dark"
      aria-labelledby="ai-control-title"
    >
      <div className="control-model-intro">
        <p className="app-kicker">Operating model</p>
        <h2 id="ai-control-title">
          AI helps operate the business. The business remains in control.
        </h2>
        <p>
          Each layer has a distinct responsibility, so proposed work never
          becomes invisible execution.
        </p>
      </div>
      <div className="control-model-flow">
        {AI_CONTROL_GROUPS.map((group, index) => (
          <div className="control-model-stage" key={group.label}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div>
              <strong>{group.label}</strong>
              {group.actions.map((action) => (
                <small key={action}>{action}</small>
              ))}
            </div>
            {index < AI_CONTROL_GROUPS.length - 1 ? (
              <Icon name="arrow-right" size="small" />
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
