export type ValidationErrors<T> = Partial<Record<keyof T, string>>;

export type LoginInput = Readonly<{
  email: string;
  password: string;
}>;

export type SignupInput = Readonly<{
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  consent: boolean;
}>;

export type ResetPasswordInput = Readonly<{
  password: string;
  confirmPassword: string;
}>;

export type PasswordStrengthLevel = "weak" | "fair" | "strong";

export type PasswordStrengthResult = Readonly<{
  level: PasswordStrengthLevel;
  label: "Weak" | "Fair" | "Strong";
  score: 1 | 2 | 3;
}>;

export type LoginValidationErrors = ValidationErrors<LoginInput>;
export type SignupValidationErrors = ValidationErrors<SignupInput>;
export type ResetPasswordValidationErrors =
  ValidationErrors<ResetPasswordInput>;

const workEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateWorkEmail(email: string): string | undefined {
  if (!email.trim()) return "Work email is required.";
  if (!workEmailPattern.test(email.trim())) return "Enter a valid work email.";
  return undefined;
}

function validateName(value: string, label: "first" | "last") {
  const readableLabel = label === "first" ? "first" : "last";
  if (!value.trim()) return `Enter your ${readableLabel} name.`;
  if (value.trim().length > 64)
    return `Keep your ${readableLabel} name under 65 characters.`;
  return undefined;
}

export function getPasswordStrength(password: string): PasswordStrengthResult {
  let score = 0;

  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score >= 5) return { level: "strong", label: "Strong", score: 3 };
  if (score >= 3) return { level: "fair", label: "Fair", score: 2 };
  return { level: "weak", label: "Weak", score: 1 };
}

export function isPasswordStrongEnough(password: string) {
  return (
    password.length >= 10 &&
    password.length <= 128 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password)
  );
}

function validateNewPassword(password: string): string | undefined {
  if (!password) return "Password is required.";
  if (password.length > 128) return "Use no more than 128 characters.";
  if (!isPasswordStrongEnough(password)) return "Use a stronger password.";
  return undefined;
}

export function validateLoginInput(input: LoginInput): LoginValidationErrors {
  const errors: LoginValidationErrors = {};
  const emailError = validateWorkEmail(input.email);

  if (emailError) errors.email = emailError;
  if (!input.password) {
    errors.password = "Password is required.";
  } else if (input.password.length < 8) {
    errors.password = "Use at least 8 characters.";
  } else if (input.password.length > 128) {
    errors.password = "Use no more than 128 characters.";
  }

  return errors;
}

export function validateSignupInput(
  input: SignupInput,
): SignupValidationErrors {
  const errors: SignupValidationErrors = {};
  const firstNameError = validateName(input.firstName, "first");
  const lastNameError = validateName(input.lastName, "last");
  const emailError = validateWorkEmail(input.email);
  const passwordError = validateNewPassword(input.password);

  if (firstNameError) errors.firstName = firstNameError;
  if (lastNameError) errors.lastName = lastNameError;
  if (emailError) errors.email = emailError;
  if (passwordError) errors.password = passwordError;

  if (!input.confirmPassword) {
    errors.confirmPassword = "Confirm your password.";
  } else if (input.password !== input.confirmPassword) {
    errors.confirmPassword = "Passwords don't match.";
  }

  if (!input.consent) {
    errors.consent = "Please accept the Terms of Service and Privacy Policy.";
  }

  return errors;
}

export function validateVerificationCode(code: string): string | undefined {
  return /^\d{6}$/.test(code) ? undefined : "Enter the complete 6-digit code.";
}

export function validatePasswordResetEmail(email: string): string | undefined {
  return validateWorkEmail(email);
}

export function validateResetPasswordInput(
  input: ResetPasswordInput,
): ResetPasswordValidationErrors {
  const errors: ResetPasswordValidationErrors = {};
  const passwordError = validateNewPassword(input.password);

  if (passwordError) errors.password = passwordError;
  if (!input.confirmPassword) {
    errors.confirmPassword = "Confirm your new password.";
  } else if (input.password !== input.confirmPassword) {
    errors.confirmPassword = "Passwords don't match.";
  }

  return errors;
}
