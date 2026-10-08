import { describe, expect, it } from "vitest";
import {
  getPasswordStrength,
  validatePasswordResetEmail,
  validateResetPasswordInput,
  validateSignupInput,
  validateVerificationCode,
} from "../apps/web/lib/auth/validation";

describe("signup validation", () => {
  it("requires identity, credentials, and consent", () => {
    expect(
      validateSignupInput({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        confirmPassword: "",
        consent: false,
      }),
    ).toEqual({
      firstName: "Enter your first name.",
      lastName: "Enter your last name.",
      email: "Work email is required.",
      password: "Password is required.",
      confirmPassword: "Confirm your password.",
      consent: "Please accept the Terms of Service and Privacy Policy.",
    });
  });

  it("rejects weak and mismatched passwords", () => {
    expect(
      validateSignupInput({
        firstName: "Asha",
        lastName: "Mehta",
        email: "asha@example.com",
        password: "weak",
        confirmPassword: "different",
        consent: true,
      }),
    ).toEqual({
      password: "Use a stronger password.",
      confirmPassword: "Passwords don't match.",
    });
  });

  it("accepts a complete valid submission", () => {
    expect(
      validateSignupInput({
        firstName: "Asha",
        lastName: "Mehta",
        email: "asha@example.com",
        password: "Controlled10",
        confirmPassword: "Controlled10",
        consent: true,
      }),
    ).toEqual({});
  });
});

describe("password strength", () => {
  it.each([
    ["short", "weak", "Weak"],
    ["Longenough", "fair", "Fair"],
    ["Controlled10!", "strong", "Strong"],
  ] as const)("classifies %s as %s", (password, level, label) => {
    expect(getPasswordStrength(password)).toMatchObject({ level, label });
  });
});

describe("verification code validation", () => {
  it("requires exactly six digits", () => {
    expect(validateVerificationCode("12ab56")).toBe(
      "Enter the complete 6-digit code.",
    );
    expect(validateVerificationCode("12345")).toBe(
      "Enter the complete 6-digit code.",
    );
    expect(validateVerificationCode("123456")).toBeUndefined();
  });
});

describe("password recovery validation", () => {
  it("validates the recovery email without account-specific behavior", () => {
    expect(validatePasswordResetEmail("invalid")).toBe(
      "Enter a valid work email.",
    );
    expect(validatePasswordResetEmail("ops@example.com")).toBeUndefined();
  });

  it("requires a strong, matching new password", () => {
    expect(
      validateResetPasswordInput({
        password: "weak",
        confirmPassword: "different",
      }),
    ).toEqual({
      password: "Use a stronger password.",
      confirmPassword: "Passwords don't match.",
    });

    expect(
      validateResetPasswordInput({
        password: "Controlled10",
        confirmPassword: "Controlled10",
      }),
    ).toEqual({});
  });
});
