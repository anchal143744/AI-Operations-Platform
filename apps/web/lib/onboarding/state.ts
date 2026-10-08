import {
  onboardingSteps,
  type EnquiryChannel,
  type OnboardingData,
  type OnboardingStepId,
} from "./model";

export type OnboardingErrors = Partial<Record<keyof OnboardingData, string>>;

export function validateOnboardingStep(
  step: OnboardingStepId,
  data: OnboardingData,
): OnboardingErrors {
  const errors: OnboardingErrors = {};

  if (step === "business") {
    if (!data.businessName.trim()) {
      errors.businessName = "Enter your business name.";
    }
    if (!data.industry) errors.industry = "Select your industry.";
    if (!data.companySize) errors.companySize = "Select your company size.";
  }

  if (step === "role" && !data.role) {
    errors.role = "Select your primary role.";
  }

  if (step === "goal" && !data.primaryGoal) {
    errors.primaryGoal = "Select one goal to improve first.";
  }

  if (step === "workflow") {
    if (data.channels.length === 0) {
      errors.channels = "Select at least one enquiry channel.";
    }
    if (!data.enquiryOwner) {
      errors.enquiryOwner = "Select who handles new enquiries.";
    }
    if (!data.responseExpectation) {
      errors.responseExpectation = "Select a response expectation.";
    }
  }

  return errors;
}

export function canContinueOnboarding(
  step: OnboardingStepId,
  data: OnboardingData,
) {
  return Object.keys(validateOnboardingStep(step, data)).length === 0;
}

export function getNextOnboardingStep(
  current: OnboardingStepId,
): OnboardingStepId {
  const index = onboardingSteps.findIndex((step) => step.id === current);
  return onboardingSteps[Math.min(index + 1, onboardingSteps.length - 1)]!.id;
}

export function getPreviousOnboardingStep(
  current: OnboardingStepId,
): OnboardingStepId {
  const index = onboardingSteps.findIndex((step) => step.id === current);
  return onboardingSteps[Math.max(index - 1, 0)]!.id;
}

export function toggleOnboardingChannel(
  selected: readonly EnquiryChannel[],
  channel: EnquiryChannel,
): EnquiryChannel[] {
  return selected.includes(channel)
    ? selected.filter((value) => value !== channel)
    : [...selected, channel];
}
