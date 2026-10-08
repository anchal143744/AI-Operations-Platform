import type { InputHTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "../icons";
import { ButtonLink, StatusIndicator } from "../ui/primitives";

export function AuthHeader({
  eyebrow,
  title,
  titleId,
  description,
}: {
  eyebrow: string;
  title: string;
  titleId: string;
  description: string;
}) {
  return (
    <div className="auth-card-header">
      <span className="auth-eyebrow">{eyebrow}</span>
      <h2 id={titleId}>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

export function AuthIntegrationNote({
  id,
  title,
  description,
  state = "pending",
}: {
  id: string;
  title: string;
  description: string;
  state?: "active" | "complete" | "pending";
}) {
  return (
    <div className="auth-integration-note" id={id}>
      <StatusIndicator state={state} />
      <div>
        <strong>{title}</strong>
        <span>{description}</span>
      </div>
    </div>
  );
}

export type AuthNoticeValue = Readonly<{
  tone: "information" | "error";
  message: string;
  action?: Readonly<{
    href: `/${string}`;
    label: string;
  }>;
}>;

export function AuthNotice({ notice }: { notice: AuthNoticeValue }) {
  const isError = notice.tone === "error";

  return (
    <div
      className={`auth-form-notice notice-${notice.tone}`}
      role={isError ? "alert" : "status"}
    >
      <Icon name={isError ? "alert" : "shield-check"} />
      <span>
        {notice.message}
        {notice.action ? (
          <a className="notice-action" href={notice.action.href}>
            {notice.action.label} <Icon name="arrow-right" size="small" />
          </a>
        ) : null}
      </span>
    </div>
  );
}

export function AuthField({
  id,
  label,
  error,
  helpText,
  className,
  ...inputProps
}: Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  id: string;
  label: string;
  error: string | undefined;
  helpText?: string;
}) {
  const helpId = helpText ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <input
        {...inputProps}
        className={`field-control${error ? " field-control-error" : ""}${className ? ` ${className}` : ""}`}
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
      />
      {helpText ? (
        <span className="field-support" id={helpId}>
          {helpText}
        </span>
      ) : null}
      {error ? (
        <span className="field-error" id={errorId}>
          <Icon name="alert" size="small" /> {error}
        </span>
      ) : null}
    </div>
  );
}

export function AuthSuccessState({
  tone,
  icon,
  eyebrow,
  title,
  description,
  children,
}: {
  tone: "pending" | "success";
  icon: IconName;
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className={`auth-success-state success-${tone}`}>
      <span className="auth-success-icon" aria-hidden="true">
        <Icon name={icon} />
      </span>
      <span className="auth-eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      <p>{description}</p>
      <div className="auth-success-actions">{children}</div>
    </div>
  );
}

export function BackToSignIn() {
  return (
    <ButtonLink href="/login" className="auth-submit">
      Back to sign in <Icon name="arrow-right" size="small" />
    </ButtonLink>
  );
}
