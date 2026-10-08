import { describe, expect, it, vi } from "vitest";
import { AuthConfig } from "../apps/api/src/auth/auth.config";
import { AuthService } from "../apps/api/src/auth/auth.service";
import { AuthTokenService } from "../apps/api/src/auth/token.service";
import { UserStatus } from "@prisma/client";

function config(nodeEnv = "development", appOrigin = "http://localhost:3000") {
  return new AuthConfig({
    NODE_ENV: nodeEnv,
    APP_ORIGIN: appOrigin,
    AUTH_EMAIL_TRANSPORT: "development",
    AUTH_TOKEN_PEPPER: "test-only-pepper-with-at-least-32-characters",
  });
}

function registrationFixture(
  existing: unknown = null,
  passwordMatches = false,
) {
  const transaction = {
    user: {
      findUnique: vi.fn().mockResolvedValue(existing),
      create: vi.fn().mockResolvedValue({
        id: "local-test-user",
        email: "local@example.invalid",
      }),
    },
    emailVerificationToken: {
      updateMany: vi.fn(),
      create: vi.fn(),
    },
  };
  const email = {
    deliveryConfigured: false,
    sendVerificationCode: vi.fn().mockResolvedValue(undefined),
    sendPasswordReset: vi.fn(),
  };
  const authConfig = config();
  const auth = new AuthService(
    { $transaction: vi.fn((operation) => operation(transaction)) } as never,
    {
      hash: vi.fn().mockResolvedValue("hashed-password"),
      verify: vi.fn().mockResolvedValue(passwordMatches),
    } as never,
    new AuthTokenService(authConfig),
    {} as never,
    authConfig,
    email,
  );
  return { auth, transaction, email };
}

const input = {
  firstName: "Local",
  lastName: "Test",
  email: "local@example.invalid",
  password: "Controlled10!",
};

describe("loopback-only development verification preview", () => {
  it("is unavailable outside local development", () => {
    expect(config().localCodePreviewEnabled).toBe(true);
    expect(config("test").localCodePreviewEnabled).toBe(false);
    expect(
      config("development", "http://192.0.2.1:3000").localCodePreviewEnabled,
    ).toBe(false);
    expect(
      config("production", "https://app.example.invalid")
        .localCodePreviewEnabled,
    ).toBe(false);
    expect(
      () =>
        new AuthConfig({
          NODE_ENV: "production",
          APP_ORIGIN: "https://app.example.invalid",
          AUTH_TOKEN_PEPPER: "replace-with-at-least-32-random-characters",
        }),
    ).toThrow("example value");
  });

  it("returns a code only for an actual local registration and stores a hash", async () => {
    const { auth, transaction, email } = registrationFixture();
    const result = await auth.register(input);
    expect(result.response.localDevelopmentCode).toMatch(/^\d{6}$/);
    expect(email.sendVerificationCode).toHaveBeenCalledWith(
      expect.objectContaining({ code: result.response.localDevelopmentCode }),
    );
    const persisted =
      transaction.emailVerificationToken.create.mock.calls[0]?.[0];
    expect(persisted.data.tokenHash).not.toBe(
      result.response.localDevelopmentCode,
    );
    expect(JSON.stringify(persisted)).not.toContain(
      result.response.localDevelopmentCode,
    );
  });

  it("does not reveal or rotate a pending account's code for a wrong password", async () => {
    const { auth, transaction, email } = registrationFixture({
      id: "existing-user",
      email: input.email,
      passwordHash: "existing-hash",
      status: UserStatus.PENDING_VERIFICATION,
      emailVerifiedAt: null,
    });
    const result = await auth.register(input);
    expect(result.response.localDevelopmentCode).toBeUndefined();
    expect(transaction.emailVerificationToken.create).not.toHaveBeenCalled();
    expect(email.sendVerificationCode).not.toHaveBeenCalled();
  });
});
