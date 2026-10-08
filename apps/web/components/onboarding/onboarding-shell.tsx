import type { ReactNode } from "react";
import { BrandMark, Card } from "../ui/primitives";
import { OnboardingProgress } from "./onboarding-progress";
import type { OnboardingView } from "../../lib/onboarding/model";

export function OnboardingShell({
  current,
  children,
}: {
  current: OnboardingView;
  children: ReactNode;
}) {
  return (
    <>
      <a className="skip-link" href="#onboarding-content">
        Skip to onboarding
      </a>
      <main className="onboarding-page">
        <header className="onboarding-header">
          <a href="/" aria-label="AI Operations Platform home">
            <BrandMark />
          </a>
          <span>Workspace setup</span>
        </header>
        <Card className="onboarding-workspace">
          <aside className="onboarding-rail">
            <div>
              <span className="auth-eyebrow">Operating profile</span>
              <h1>Shape how work moves.</h1>
              <p>
                These details will later guide workspace structure, lead
                handling, and response expectations.
              </p>
            </div>
            <OnboardingProgress current={current} />
            <p className="onboarding-privacy-note">
              Business and workspace profile details are saved when setup is
              completed. Channel and goal choices are not yet connected to
              automation.
            </p>
          </aside>
          <section
            className="onboarding-content"
            id="onboarding-content"
            aria-live="polite"
          >
            {children}
          </section>
        </Card>
      </main>
    </>
  );
}
