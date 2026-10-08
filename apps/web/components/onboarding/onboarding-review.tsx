import type { ReactNode } from "react";
import {
  channels,
  companySizes,
  enquiryOwners,
  getOptionLabel,
  industries,
  primaryGoals,
  responseExpectations,
  roles,
  type OnboardingData,
  type OnboardingStepId,
} from "../../lib/onboarding/model";
import { StepNavigation } from "./step-navigation";

function ReviewSection({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: ReactNode;
}) {
  return (
    <section className="review-section">
      <div className="review-section-heading">
        <h3>{title}</h3>
        <button className="auth-inline-action" type="button" onClick={onEdit}>
          Edit <span className="sr-only">{title.toLowerCase()}</span>
        </button>
      </div>
      <dl>{children}</dl>
    </section>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function OnboardingReview({
  data,
  isFinishing,
  onEdit,
  onBack,
  onFinish,
}: {
  data: OnboardingData;
  isFinishing: boolean;
  onEdit: (step: OnboardingStepId) => void;
  onBack: () => void;
  onFinish: () => void;
}) {
  const channelLabels = data.channels.map((channel) =>
    getOptionLabel(channels, channel),
  );

  return (
    <div className="onboarding-step onboarding-review-step">
      <div className="onboarding-step-heading">
        <span className="auth-eyebrow">Review</span>
        <h2 id="onboarding-step-heading" tabIndex={-1}>
          Your workspace is taking shape.
        </h2>
        <p>
          Confirm the operating profile before creating your organization and
          first workspace.
        </p>
      </div>
      <div className="review-grid">
        <ReviewSection title="Business" onEdit={() => onEdit("business")}>
          <ReviewItem label="Business" value={data.businessName} />
          <ReviewItem label="Website" value={data.website || "Not provided"} />
          <ReviewItem
            label="Industry"
            value={getOptionLabel(industries, data.industry)}
          />
          <ReviewItem
            label="Company size"
            value={getOptionLabel(
              companySizes.map((value) => ({ value, label: value })),
              data.companySize,
            )}
          />
        </ReviewSection>
        <ReviewSection title="Your role" onEdit={() => onEdit("role")}>
          <ReviewItem label="Role" value={getOptionLabel(roles, data.role)} />
        </ReviewSection>
        <ReviewSection title="Primary goal" onEdit={() => onEdit("goal")}>
          <ReviewItem
            label="Primary goal"
            value={getOptionLabel(primaryGoals, data.primaryGoal)}
          />
        </ReviewSection>
        <ReviewSection
          title="Enquiry workflow"
          onEdit={() => onEdit("workflow")}
        >
          <ReviewItem label="Channels" value={channelLabels.join(", ")} />
          <ReviewItem
            label="Enquiry owner"
            value={getOptionLabel(enquiryOwners, data.enquiryOwner)}
          />
          <ReviewItem
            label="Response expectation"
            value={getOptionLabel(
              responseExpectations,
              data.responseExpectation,
            )}
          />
        </ReviewSection>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onFinish();
        }}
      >
        <StepNavigation
          onBack={onBack}
          nextLabel="Finish setup"
          isBusy={isFinishing}
        />
      </form>
    </div>
  );
}
