import { describe, expect, it } from "vitest";
import {
  initialOnboardingData,
  type OnboardingData,
} from "../apps/web/lib/onboarding/model";
import {
  canContinueOnboarding,
  getNextOnboardingStep,
  getPreviousOnboardingStep,
  toggleOnboardingChannel,
  validateOnboardingStep,
} from "../apps/web/lib/onboarding/state";

const completeData: OnboardingData = {
  businessName: "Northstar Systems",
  website: "",
  industry: "software",
  companySize: "11–50",
  role: "operations",
  primaryGoal: "respond-faster",
  channels: ["website", "email"],
  enquiryOwner: "sales",
  responseExpectation: "1-hour",
};

describe("onboarding validation", () => {
  it("blocks each required step until its required fields are present", () => {
    expect(validateOnboardingStep("business", initialOnboardingData)).toEqual({
      businessName: "Enter your business name.",
      industry: "Select your industry.",
      companySize: "Select your company size.",
    });
    expect(validateOnboardingStep("role", initialOnboardingData)).toEqual({
      role: "Select your primary role.",
    });
    expect(validateOnboardingStep("goal", initialOnboardingData)).toEqual({
      primaryGoal: "Select one goal to improve first.",
    });
    expect(validateOnboardingStep("workflow", initialOnboardingData)).toEqual({
      channels: "Select at least one enquiry channel.",
      enquiryOwner: "Select who handles new enquiries.",
      responseExpectation: "Select a response expectation.",
    });
  });

  it("allows progression when the current step is complete", () => {
    for (const step of ["business", "role", "goal", "workflow"] as const) {
      expect(canContinueOnboarding(step, completeData)).toBe(true);
    }
  });
});

describe("onboarding navigation", () => {
  it("moves forward and back without changing entered data", () => {
    expect(getNextOnboardingStep("business")).toBe("role");
    expect(getPreviousOnboardingStep("role")).toBe("business");
    expect(getPreviousOnboardingStep("welcome")).toBe("welcome");
    expect(completeData.businessName).toBe("Northstar Systems");
  });

  it("adds and removes channels without duplicates", () => {
    const withEmail = toggleOnboardingChannel(["website"], "email");
    expect(withEmail).toEqual(["website", "email"]);
    expect(toggleOnboardingChannel(withEmail, "website")).toEqual(["email"]);
  });
});
