"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  channels,
  companySizes,
  enquiryOwners,
  industries,
  initialOnboardingData,
  primaryGoals,
  responseExpectations,
  roles,
  type CompanySize,
  type EnquiryOwner,
  type Industry,
  type OnboardingData,
  type OnboardingStepId,
  type PrimaryGoal,
  type ResponseExpectation,
  type UserRole,
} from "../../lib/onboarding/model";
import {
  getNextOnboardingStep,
  getPreviousOnboardingStep,
  toggleOnboardingChannel,
  validateOnboardingStep,
  type OnboardingErrors,
} from "../../lib/onboarding/state";
import {
  slugifyWorkspace,
  tenancyService,
} from "../../lib/tenancy/tenancy-service";
import { AuthField } from "../auth/auth-elements";
import { Icon } from "../icons";
import { Button } from "../ui/primitives";
import { OnboardingCompletion } from "./onboarding-completion";
import { OnboardingReview } from "./onboarding-review";
import { OnboardingShell } from "./onboarding-shell";
import { SelectionCard, SelectionFieldset } from "./selection-card";
import { StepNavigation } from "./step-navigation";

const errorFocusTargets: Partial<Record<keyof OnboardingData, string>> = {
  businessName: "businessName",
  industry: "industry",
  companySize: "companySize",
  role: "role-founder-owner",
  primaryGoal: "goal-respond-faster",
  channels: "channel-website",
  enquiryOwner: "owner-sales",
  responseExpectation: "responseExpectation",
};

function StepHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="onboarding-step-heading">
      <span className="auth-eyebrow">{eyebrow}</span>
      <h2 id="onboarding-step-heading" tabIndex={-1}>
        {title}
      </h2>
      <p>{description}</p>
    </div>
  );
}

function SelectField<T extends string>({
  id,
  label,
  value,
  placeholder,
  options,
  error,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: T | "";
  placeholder: string;
  options: readonly { value: T; label: string }[];
  error?: string | undefined;
  disabled?: boolean | undefined;
  onChange: (value: T) => void;
}) {
  const errorId = `${id}-error`;

  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <select
        className={`field-control select-control${error ? " field-control-error" : ""}`}
        id={id}
        value={value}
        disabled={disabled}
        required
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(event.currentTarget.value as T)}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? (
        <span className="field-error" id={errorId}>
          <Icon name="alert" size="small" /> {error}
        </span>
      ) : null}
    </div>
  );
}

export function OnboardingFlow() {
  const [current, setCurrent] = useState<OnboardingStepId | "complete">(
    "welcome",
  );
  const [data, setData] = useState<OnboardingData>(initialOnboardingData);
  const [errors, setErrors] = useState<OnboardingErrors>({});
  const [returnToReview, setReturnToReview] = useState(false);
  const [skipNotice, setSkipNotice] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  useEffect(() => {
    document.getElementById("onboarding-step-heading")?.focus();
  }, [current]);

  const updateData = <Key extends keyof OnboardingData>(
    key: Key,
    value: OnboardingData[Key],
  ) => {
    setData((existing) => ({ ...existing, [key]: value }));
    setErrors((existing) => {
      const next = { ...existing };
      delete next[key];
      return next;
    });
  };

  const goToStep = (step: OnboardingStepId) => {
    setErrors({});
    setCurrent(step);
  };

  const handleStepSubmit = (
    event: FormEvent<HTMLFormElement>,
    step: OnboardingStepId,
  ) => {
    event.preventDefault();
    const nextErrors = validateOnboardingStep(step, data);
    setErrors(nextErrors);

    const firstError = Object.keys(nextErrors)[0] as
      keyof OnboardingData | undefined;
    if (firstError) {
      const targetId = errorFocusTargets[firstError];
      if (targetId) {
        requestAnimationFrame(() => document.getElementById(targetId)?.focus());
      }
      return;
    }

    if (returnToReview) {
      setReturnToReview(false);
      goToStep("review");
      return;
    }

    goToStep(getNextOnboardingStep(step));
  };

  const handleBack = (step: OnboardingStepId) => {
    if (returnToReview) {
      setReturnToReview(false);
      goToStep("review");
      return;
    }
    goToStep(getPreviousOnboardingStep(step));
  };

  const handleEdit = (step: OnboardingStepId) => {
    setReturnToReview(true);
    goToStep(step);
  };

  const handleFinish = async () => {
    if (isFinishing) return;
    setIsFinishing(true);
    setBootstrapError(null);
    const organizationSlug = slugifyWorkspace(data.businessName);
    try {
      await tenancyService.bootstrap({
        name: data.businessName,
        slug: organizationSlug,
        workspaceName: `${data.businessName} Operations`,
        workspaceSlug: `${organizationSlug}-operations`.slice(0, 100),
        profile: {
          website: data.website,
          industry: data.industry,
          companySize: data.companySize,
          timezone: "",
          responseExpectation: data.responseExpectation,
        },
      });
      setIsFinishing(false);
      setCurrent("complete");
    } catch (error) {
      setIsFinishing(false);
      setBootstrapError(
        error instanceof Error
          ? error.message
          : "Workspace setup is unavailable.",
      );
    }
  };

  return (
    <OnboardingShell current={current}>
      {current === "welcome" ? (
        <div className="onboarding-step onboarding-welcome">
          <StepHeading
            eyebrow="Welcome"
            title="Let's set up your operation."
            description="A few details will help AI Operations Platform tailor the workspace to your business."
          />
          <div
            className="onboarding-principles"
            aria-label="How setup will be used"
          >
            <div>
              <span>01</span>
              <strong>Understand your business</strong>
              <small>
                Capture only the context needed to shape the operating profile.
              </small>
            </div>
            <div>
              <span>02</span>
              <strong>Set an initial priority</strong>
              <small>
                Choose the first outcome your team wants to improve.
              </small>
            </div>
            <div>
              <span>03</span>
              <strong>Map incoming work</strong>
              <small>
                Describe where enquiries arrive and who handles them.
              </small>
            </div>
          </div>
          <div className="onboarding-welcome-actions">
            <Button
              className="onboarding-primary"
              onClick={() => goToStep("business")}
            >
              Get started <Icon name="arrow-right" size="small" />
            </Button>
            <button
              className="auth-inline-action"
              type="button"
              onClick={() => setSkipNotice(true)}
            >
              Skip for now
            </button>
          </div>
          {skipNotice ? (
            <div className="auth-form-notice notice-information" role="status">
              <Icon name="shield-check" />
              <span>
                Onboarding can be skipped after workspace integration exists. No
                setup was bypassed or saved.
              </span>
            </div>
          ) : null}
        </div>
      ) : null}

      {current === "business" ? (
        <form
          className="onboarding-step"
          noValidate
          onSubmit={(event) => handleStepSubmit(event, "business")}
        >
          <StepHeading
            eyebrow="Business"
            title="Tell us about your business"
            description="This context will later shape workspace defaults and how enquiries are interpreted."
          />
          <div className="onboarding-form-grid">
            <AuthField
              id="businessName"
              name="businessName"
              label="Business name"
              value={data.businessName}
              autoComplete="organization"
              required
              error={errors.businessName}
              onChange={(event) =>
                updateData("businessName", event.currentTarget.value)
              }
            />
            <AuthField
              id="website"
              name="website"
              label="Website"
              value={data.website}
              type="url"
              inputMode="url"
              autoComplete="url"
              helpText="Optional"
              error={undefined}
              onChange={(event) =>
                updateData("website", event.currentTarget.value)
              }
            />
            <SelectField<Industry>
              id="industry"
              label="Industry"
              value={data.industry}
              placeholder="Select an industry"
              options={industries}
              error={errors.industry}
              onChange={(value) => updateData("industry", value)}
            />
            <SelectField<CompanySize>
              id="companySize"
              label="Company size"
              value={data.companySize}
              placeholder="Select company size"
              options={companySizes.map((value) => ({ value, label: value }))}
              error={errors.companySize}
              onChange={(value) => updateData("companySize", value)}
            />
          </div>
          <StepNavigation
            onBack={() => handleBack("business")}
            nextLabel={returnToReview ? "Return to review" : "Continue"}
          />
        </form>
      ) : null}

      {current === "role" ? (
        <form
          className="onboarding-step"
          noValidate
          onSubmit={(event) => handleStepSubmit(event, "role")}
        >
          <StepHeading
            eyebrow="Your role"
            title="What do you do?"
            description="Choose the perspective you use most often when coordinating business work."
          />
          <SelectionFieldset
            legend="Primary role"
            error={errors.role}
            errorId="role-error"
          >
            <div className="selection-grid role-selection-grid">
              {roles.map((role) => (
                <SelectionCard
                  key={role.value}
                  id={`role-${role.value}`}
                  type="radio"
                  name="role"
                  value={role.value}
                  label={role.label}
                  description={role.description}
                  checked={data.role === role.value}
                  invalid={Boolean(errors.role)}
                  describedBy={errors.role ? "role-error" : undefined}
                  onChange={() => updateData("role", role.value as UserRole)}
                />
              ))}
            </div>
          </SelectionFieldset>
          <StepNavigation
            onBack={() => handleBack("role")}
            nextLabel={returnToReview ? "Return to review" : "Continue"}
          />
        </form>
      ) : null}

      {current === "goal" ? (
        <form
          className="onboarding-step"
          noValidate
          onSubmit={(event) => handleStepSubmit(event, "goal")}
        >
          <StepHeading
            eyebrow="First priority"
            title="What would you like to improve first?"
            description="Choose one starting point. This can be changed when real workspace configuration is implemented."
          />
          <SelectionFieldset
            legend="Primary operational goal"
            error={errors.primaryGoal}
            errorId="goal-error"
          >
            <div className="selection-grid goal-selection-grid">
              {primaryGoals.map((goal) => (
                <SelectionCard
                  key={goal.value}
                  id={`goal-${goal.value}`}
                  type="radio"
                  name="primaryGoal"
                  value={goal.value}
                  label={goal.label}
                  description={goal.description}
                  checked={data.primaryGoal === goal.value}
                  invalid={Boolean(errors.primaryGoal)}
                  describedBy={errors.primaryGoal ? "goal-error" : undefined}
                  onChange={() =>
                    updateData("primaryGoal", goal.value as PrimaryGoal)
                  }
                />
              ))}
            </div>
          </SelectionFieldset>
          <StepNavigation
            onBack={() => handleBack("goal")}
            nextLabel={returnToReview ? "Return to review" : "Continue"}
          />
        </form>
      ) : null}

      {current === "workflow" ? (
        <form
          className="onboarding-step onboarding-workflow-step"
          noValidate
          onSubmit={(event) => handleStepSubmit(event, "workflow")}
        >
          <StepHeading
            eyebrow="Operational setup"
            title="How does work reach your team?"
            description="Describe the current process only. No channel or external service will be connected."
          />
          <div className="workflow-question-stack">
            <SelectionFieldset
              legend="Enquiry channels"
              description="Select every channel your team currently handles."
              error={errors.channels}
              errorId="channels-error"
            >
              <div className="selection-grid channel-selection-grid">
                {channels.map((channel) => (
                  <SelectionCard
                    key={channel.value}
                    id={`channel-${channel.value}`}
                    type="checkbox"
                    name="channels"
                    value={channel.value}
                    label={channel.label}
                    checked={data.channels.includes(channel.value)}
                    invalid={Boolean(errors.channels)}
                    describedBy={errors.channels ? "channels-error" : undefined}
                    onChange={() =>
                      updateData(
                        "channels",
                        toggleOnboardingChannel(data.channels, channel.value),
                      )
                    }
                  />
                ))}
              </div>
            </SelectionFieldset>
            <SelectionFieldset
              legend="Who usually handles new enquiries?"
              error={errors.enquiryOwner}
              errorId="owner-error"
            >
              <div className="selection-grid owner-selection-grid">
                {enquiryOwners.map((owner) => (
                  <SelectionCard
                    key={owner.value}
                    id={`owner-${owner.value}`}
                    type="radio"
                    name="enquiryOwner"
                    value={owner.value}
                    label={owner.label}
                    checked={data.enquiryOwner === owner.value}
                    invalid={Boolean(errors.enquiryOwner)}
                    describedBy={
                      errors.enquiryOwner ? "owner-error" : undefined
                    }
                    onChange={() =>
                      updateData("enquiryOwner", owner.value as EnquiryOwner)
                    }
                  />
                ))}
              </div>
            </SelectionFieldset>
            <SelectField<ResponseExpectation>
              id="responseExpectation"
              label="How quickly do you aim to respond?"
              value={data.responseExpectation}
              placeholder="Select a response expectation"
              options={responseExpectations}
              error={errors.responseExpectation}
              onChange={(value) => updateData("responseExpectation", value)}
            />
          </div>
          <StepNavigation
            onBack={() => handleBack("workflow")}
            nextLabel={returnToReview ? "Return to review" : "Continue"}
          />
        </form>
      ) : null}

      {current === "review" ? (
        <OnboardingReview
          data={data}
          isFinishing={isFinishing}
          onEdit={handleEdit}
          onBack={() => goToStep("workflow")}
          onFinish={handleFinish}
        />
      ) : null}

      {current === "review" && bootstrapError ? (
        <div className="auth-form-notice notice-error" role="alert">
          <Icon name="alert" /> <span>{bootstrapError}</span>
        </div>
      ) : null}

      {current === "complete" ? (
        <OnboardingCompletion
          onContinue={() => window.location.assign("/dashboard")}
        />
      ) : null}
    </OnboardingShell>
  );
}
