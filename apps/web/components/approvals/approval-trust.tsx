import { Icon, type IconName } from "../icons";

const principles = [
  { label: "Human oversight", icon: "user-check" },
  { label: "Policy boundaries", icon: "shield-check" },
  { label: "Permission-aware actions", icon: "lock" },
  { label: "Explicit decisions", icon: "check" },
  { label: "Auditability", icon: "history" },
] as const satisfies readonly { label: string; icon: IconName }[];

export function ApprovalTrust() {
  return (
    <section className="approval-trust" aria-labelledby="human-control-title">
      <div>
        <p className="app-kicker">Human control by design</p>
        <h2 id="human-control-title">
          Control is part of the operating model.
        </h2>
        <p>
          AI can understand context and recommend a next step. Policies define
          the boundary, people make consequential decisions, and the system
          records what happened.
        </p>
      </div>
      <div aria-label="Control principles">
        {principles.map((principle) => (
          <span key={principle.label}>
            <Icon name={principle.icon} size="small" />
            {principle.label}
          </span>
        ))}
      </div>
    </section>
  );
}
