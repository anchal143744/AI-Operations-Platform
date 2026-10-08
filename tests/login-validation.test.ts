import { describe, expect, it } from "vitest";
import { validateLoginInput } from "../apps/web/lib/auth/validation";

describe("login form validation", () => {
  it("requires both credentials", () => {
    expect(validateLoginInput({ email: "", password: "" })).toEqual({
      email: "Work email is required.",
      password: "Password is required.",
    });
  });

  it("rejects malformed email and short passwords", () => {
    expect(
      validateLoginInput({ email: "not-an-email", password: "short" }),
    ).toEqual({
      email: "Enter a valid work email.",
      password: "Use at least 8 characters.",
    });
  });

  it("accepts a valid work-email shape and password length", () => {
    expect(
      validateLoginInput({
        email: "operations@example.com",
        password: "eight-or-more",
      }),
    ).toEqual({});
  });
});
