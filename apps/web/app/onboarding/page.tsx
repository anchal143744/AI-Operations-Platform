import type { Metadata } from "next";
import { OnboardingFlow } from "../../components/onboarding/onboarding-flow";

export const metadata: Metadata = {
  title: "Set up your operation | AI Operations Platform",
  description:
    "Prepare an initial operating profile for your future AI Operations Platform workspace.",
};

export default function OnboardingPage() {
  return <OnboardingFlow />;
}
