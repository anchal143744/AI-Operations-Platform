import {
  onboardingSteps,
  type OnboardingView,
} from "../../lib/onboarding/model";
import { Icon } from "../icons";

export function OnboardingProgress({ current }: { current: OnboardingView }) {
  const currentIndex =
    current === "complete"
      ? onboardingSteps.length
      : onboardingSteps.findIndex((step) => step.id === current);

  return (
    <nav className="onboarding-progress" aria-label="Onboarding progress">
      <div className="onboarding-progress-summary">
        <span>
          {current === "complete"
            ? "Setup complete"
            : `Step ${currentIndex + 1} of ${onboardingSteps.length}`}
        </span>
        <strong>
          {current === "complete"
            ? "Ready for the next phase"
            : onboardingSteps[currentIndex]?.label}
        </strong>
      </div>
      <ol>
        {onboardingSteps.map((step, index) => {
          const isCurrent = step.id === current;
          const isComplete = index < currentIndex;
          return (
            <li
              className={
                isCurrent
                  ? "is-current"
                  : isComplete
                    ? "is-complete"
                    : undefined
              }
              key={step.id}
              aria-current={isCurrent ? "step" : undefined}
            >
              <span className="onboarding-progress-node" aria-hidden="true">
                {isComplete ? <Icon name="check" size="small" /> : step.number}
              </span>
              <span>{step.label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
