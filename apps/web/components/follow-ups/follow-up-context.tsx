import {
  followUpAutomationFlow,
  followUpOperationalFlow,
} from "../../lib/follow-ups/model";
import { Icon, type IconName } from "../icons";
import { Card } from "../ui/primitives";

export function FollowUpContext() {
  return (
    <Card className="follow-up-context-card">
      <div className="follow-up-context-heading">
        <span aria-hidden="true">
          <Icon name="workflow" />
        </span>
        <div>
          <p className="app-kicker">Operational context</p>
          <h3>What needs attention next?</h3>
        </div>
      </div>
      <p>
        Follow-ups connect customer opportunities to their next accountable
        action. Messaging and automation remain separate services.
      </p>

      <ol
        className="follow-up-operational-flow"
        aria-label="Follow-up relationship"
      >
        {followUpOperationalFlow.map((step) => (
          <li key={step.label}>
            <span aria-hidden="true">
              <Icon name={step.icon as IconName} size="small" />
            </span>
            <strong>{step.label}</strong>
          </li>
        ))}
      </ol>

      <dl className="follow-up-context-state">
        <div>
          <dt>Lead</dt>
          <dd>Not linked</dd>
        </div>
        <div>
          <dt>Conversation</dt>
          <dd>Not linked</dd>
        </div>
        <div>
          <dt>Owner</dt>
          <dd>Unassigned</dd>
        </div>
        <div>
          <dt>Workflow</dt>
          <dd>Not connected</dd>
        </div>
      </dl>

      <div className="follow-up-automation-preview">
        <span>Future controlled automation</span>
        <p>{followUpAutomationFlow.join(" → ")}</p>
      </div>
    </Card>
  );
}
