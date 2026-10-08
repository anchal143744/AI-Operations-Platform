import { Icon } from "../icons";
import { Button } from "../ui/primitives";

const completionStages = [
  { label: "Enquiry", icon: "inbox" as const },
  { label: "AI", icon: "spark" as const },
  { label: "Qualification", icon: "score" as const },
  { label: "Human control", icon: "user-check" as const },
  { label: "Follow-up", icon: "repeat" as const },
];

export function OnboardingCompletion({
  onContinue,
}: {
  onContinue: () => void;
}) {
  return (
    <div className="onboarding-step onboarding-completion">
      <div className="completion-mark" aria-hidden="true">
        <Icon name="check" />
      </div>
      <div className="onboarding-step-heading">
        <span className="auth-eyebrow">Workspace setup complete</span>
        <h2 id="onboarding-step-heading" tabIndex={-1}>
          Your workspace is ready.
        </h2>
        <p>
          Your organization and first workspace are ready for tenant-scoped
          operations.
        </p>
      </div>
      <ol className="completion-flow" aria-label="Future enquiry workflow">
        {completionStages.map((stage, index) => (
          <li key={stage.label}>
            <span>
              <Icon name={stage.icon} />
            </span>
            <strong>{stage.label}</strong>
            {index < completionStages.length - 1 ? (
              <Icon name="arrow-right" size="small" />
            ) : null}
          </li>
        ))}
      </ol>
      <Button className="onboarding-primary" onClick={onContinue}>
        Continue to workspace <Icon name="arrow-right" size="small" />
      </Button>
      <p className="completion-disclaimer">
        External integrations and AI execution remain unavailable.
      </p>
    </div>
  );
}
