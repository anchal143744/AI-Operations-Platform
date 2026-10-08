import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { UserStatus } from "@prisma/client";
import { AuthConfig } from "../apps/api/src/auth/auth.config";
import { AuthService } from "../apps/api/src/auth/auth.service";
import { PasswordService } from "../apps/api/src/auth/password.service";
import { SessionService } from "../apps/api/src/auth/session.service";
import { AuthTokenService } from "../apps/api/src/auth/token.service";

function testConfig(): AuthConfig {
  return new AuthConfig({
    NODE_ENV: "test",
    APP_ORIGIN: "http://localhost:3000",
    AUTH_TOKEN_PEPPER: "test-only-pepper-with-at-least-32-characters",
  });
}

describe("password security", () => {
  it("hashes and verifies passwords with Argon2id", async () => {
    const passwords = new PasswordService();
    await passwords.onModuleInit();
    const encoded = await passwords.hash("Controlled10!");

    expect(encoded).toMatch(/^\$argon2id\$/);
    expect(encoded).not.toContain("Controlled10!");
    await expect(passwords.verify("Controlled10!", encoded)).resolves.toBe(
      true,
    );
    await expect(passwords.verify("Incorrect10!", encoded)).resolves.toBe(
      false,
    );
    await expect(passwords.verify("Controlled10!")).resolves.toBe(false);
  });
});

describe("authentication tokens", () => {
  it("issues random opaque values and persists only deterministic keyed hashes", () => {
    const tokens = new AuthTokenService(testConfig());
    const first = tokens.issueOpaqueToken();
    const second = tokens.issueOpaqueToken();

    expect(first.rawToken).not.toBe(second.rawToken);
    expect(first.tokenHash).toHaveLength(64);
    expect(first.tokenHash).not.toContain(first.rawToken);
    expect(tokens.hash(first.rawToken)).toBe(first.tokenHash);
    expect(tokens.matches(first.rawToken, first.tokenHash)).toBe(true);
    expect(tokens.matches(second.rawToken, first.tokenHash)).toBe(false);
  });

  it("treats expiration boundaries as invalid", () => {
    const tokens = new AuthTokenService(testConfig());
    const now = new Date("2026-09-08T12:00:00.000Z");
    expect(tokens.isExpired(new Date(now.getTime() - 1), now)).toBe(true);
    expect(tokens.isExpired(now, now)).toBe(true);
    expect(tokens.isExpired(new Date(now.getTime() + 1), now)).toBe(false);
  });
});

describe("session security", () => {
  it("rejects expired, revoked, and disabled-user sessions", async () => {
    const tokens = new AuthTokenService(testConfig());
    const baseRecord = {
      id: "session-id",
      tokenHash: tokens.hash("raw-session-token"),
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      lastUsedAt: new Date(),
      user: {
        id: "user-id",
        email: "operator@example.com",
        name: "Operator",
        passwordHash: "must-not-be-returned",
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        memberships: [],
      },
    };
    const findUnique = vi.fn();
    const prisma = {
      session: { findUnique, updateMany: vi.fn() },
    };
    const sessions = new SessionService(prisma as never, tokens, testConfig());

    findUnique.mockResolvedValueOnce({
      ...baseRecord,
      expiresAt: new Date(Date.now() - 1),
    });
    await expect(sessions.authenticate("raw-session-token")).rejects.toThrow(
      "Your session is invalid or has expired.",
    );

    findUnique.mockResolvedValueOnce({ ...baseRecord, revokedAt: new Date() });
    await expect(sessions.authenticate("raw-session-token")).rejects.toThrow(
      "Your session is invalid or has expired.",
    );

    findUnique.mockResolvedValueOnce({
      ...baseRecord,
      user: { ...baseRecord.user, status: UserStatus.DISABLED },
    });
    await expect(sessions.authenticate("raw-session-token")).rejects.toThrow(
      "Your session is invalid or has expired.",
    );
  });

  it("returns a safe session projection without password hashes", async () => {
    const tokens = new AuthTokenService(testConfig());
    const prisma = {
      session: {
        findUnique: vi.fn().mockResolvedValue({
          id: "session-id",
          expiresAt: new Date(Date.now() + 60_000),
          revokedAt: null,
          lastUsedAt: new Date(),
          user: {
            id: "user-id",
            email: "operator@example.com",
            name: "Operator",
            passwordHash: "must-not-be-returned",
            status: UserStatus.ACTIVE,
            emailVerifiedAt: new Date(),
            memberships: [],
          },
        }),
        updateMany: vi.fn(),
      },
    };
    const sessions = new SessionService(prisma as never, tokens, testConfig());
    const result = await sessions.authenticate("raw-session-token");

    expect(result.user).toEqual({
      id: "user-id",
      email: "operator@example.com",
      name: "Operator",
      emailVerified: true,
    });
    expect(JSON.stringify(result)).not.toContain("must-not-be-returned");
  });

  it("revokes a session by hashed token rather than raw secret", async () => {
    const tokens = new AuthTokenService(testConfig());
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const sessions = new SessionService(
      { session: { updateMany } } as never,
      tokens,
      testConfig(),
    );

    await sessions.revoke("raw-session-secret");
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        tokenHash: tokens.hash("raw-session-secret"),
        revokedAt: null,
      },
      data: { revokedAt: expect.any(Date) },
    });
    expect(JSON.stringify(updateMany.mock.calls)).not.toContain(
      "raw-session-secret",
    );
  });
});

describe("authentication behavior", () => {
  it("returns the same recovery response when no account exists", async () => {
    const prisma = { user: { findUnique: vi.fn().mockResolvedValue(null) } };
    const auth = new AuthService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
      testConfig(),
      {
        deliveryConfigured: false,
        sendVerificationCode: vi.fn(),
        sendPasswordReset: vi.fn(),
      },
    );

    await expect(
      auth.forgotPassword({ email: "unknown@example.com" }),
    ).resolves.toEqual({ accepted: true, deliveryConfigured: false });
  });

  it("keeps recovery responses generic when delivery fails", async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: "active-user",
          email: "operator@example.com",
          status: UserStatus.ACTIVE,
          emailVerifiedAt: new Date(),
        }),
      },
      passwordResetToken: {
        updateMany: vi.fn(),
        create: vi.fn(),
      },
      $transaction: vi.fn().mockResolvedValue([]),
    };
    const auth = new AuthService(
      prisma as never,
      {} as never,
      new AuthTokenService(testConfig()),
      {} as never,
      testConfig(),
      {
        deliveryConfigured: true,
        sendVerificationCode: vi.fn(),
        sendPasswordReset: vi
          .fn()
          .mockRejectedValue(new Error("provider down")),
      },
    );

    await expect(
      auth.forgotPassword({ email: "operator@example.com" }),
    ).resolves.toEqual({ accepted: true, deliveryConfigured: true });
  });

  it("rejects disabled users even when a password matches", async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: "disabled-user",
          passwordHash: "encoded",
          status: UserStatus.DISABLED,
          emailVerifiedAt: new Date(),
        }),
      },
    };
    const auth = new AuthService(
      prisma as never,
      { verify: vi.fn().mockResolvedValue(true) } as never,
      {} as never,
      {} as never,
      testConfig(),
      {
        deliveryConfigured: false,
        sendVerificationCode: vi.fn(),
        sendPasswordReset: vi.fn(),
      },
    );

    await expect(
      auth.login({
        email: "disabled@example.com",
        password: "Controlled10!",
      }),
    ).rejects.toThrow("The email or password is incorrect.");
  });

  it("consumes verification tokens transactionally and rejects reuse", async () => {
    const tokens = new AuthTokenService(testConfig());
    const record = {
      id: "verification-id",
      userId: "user-id",
      tokenHash: tokens.hash("123456"),
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: null as Date | null,
      user: {
        status: UserStatus.PENDING_VERIFICATION,
        emailVerifiedAt: null,
      },
    };
    const transaction = {
      emailVerificationToken: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      user: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    };
    const prisma = {
      emailVerificationToken: {
        findUnique: vi.fn().mockImplementation(() => record),
      },
      $transaction: vi.fn((operation) => operation(transaction)),
    };
    const auth = new AuthService(
      prisma as never,
      {} as never,
      tokens,
      {
        create: vi.fn().mockResolvedValue({
          rawToken: "session-token",
          expiresAt: new Date(Date.now() + 60_000),
          session: {
            user: {
              id: "user-id",
              email: "operator@example.com",
              name: "Operator",
              emailVerified: true,
            },
            session: { expiresAt: new Date().toISOString() },
            workspaceAccess: [],
          },
        }),
      } as never,
      testConfig(),
      {
        deliveryConfigured: false,
        sendVerificationCode: vi.fn(),
        sendPasswordReset: vi.fn(),
      },
    );

    await expect(
      auth.verifyEmail("verification-context", "123456"),
    ).resolves.toMatchObject({ response: { verified: true } });
    expect(transaction.emailVerificationToken.updateMany).toHaveBeenCalled();
    record.consumedAt = new Date();
    await expect(
      auth.verifyEmail("verification-context", "123456"),
    ).rejects.toThrow("invalid or has expired");
  });

  it("rejects expired reset tokens before changing a password", async () => {
    const tokens = new AuthTokenService(testConfig());
    const hashPassword = vi.fn();
    const auth = new AuthService(
      {
        passwordResetToken: {
          findUnique: vi.fn().mockResolvedValue({
            expiresAt: new Date(Date.now() - 1),
            consumedAt: null,
            user: { status: UserStatus.ACTIVE },
          }),
        },
      } as never,
      { hash: hashPassword } as never,
      tokens,
      {} as never,
      testConfig(),
      {
        deliveryConfigured: false,
        sendVerificationCode: vi.fn(),
        sendPasswordReset: vi.fn(),
      },
    );

    await expect(
      auth.resetPassword({
        resetToken: "expired-reset-token",
        newPassword: "UpdatedControl20!",
      }),
    ).rejects.toThrow("invalid or has expired");
    expect(hashPassword).not.toHaveBeenCalled();
  });
});

describe("authentication persistence architecture", () => {
  it("stores hashes, expiry, consumption, and revocation state", () => {
    const schema = readFileSync("database/schema.prisma", "utf8");
    const migration = readFileSync(
      "database/migrations/20260908203000_authentication_foundation/migration.sql",
      "utf8",
    );

    for (const model of [
      "EmailVerificationToken",
      "PasswordResetToken",
      "Session",
    ]) {
      expect(schema).toContain(`model ${model}`);
    }
    expect(schema).not.toMatch(/rawToken\s+String/);
    expect(schema).not.toMatch(/sessionSecret\s+String/);
    expect(schema).toContain("tokenHash");
    expect(schema).toContain("expiresAt");
    expect(schema).toContain("consumedAt");
    expect(schema).toContain("revokedAt");
    expect(migration).toContain("sessions_time_check");
    expect(migration).toContain("ON DELETE RESTRICT");
  });
});
