import { SendEmailCommand, type SESv2Client } from "@aws-sdk/client-sesv2";
import { describe, expect, it } from "vitest";
import { AuthConfig } from "../apps/api/src/auth/auth.config";
import { DevelopmentAuthEmailService } from "../apps/api/src/auth/email.service";
import {
  createSesAuthEmailService,
  selectAuthEmailService,
  SesAuthEmailService,
} from "../apps/api/src/auth/ses-auth-email.service";

describe("Amazon SES authentication email boundary", () => {
  it("fails closed for a development-only transport or HTTP app origin in production", () => {
    const development = new DevelopmentAuthEmailService();
    expect(() =>
      selectAuthEmailService(
        { NODE_ENV: "production", AUTH_EMAIL_TRANSPORT: "development" },
        "https://app.example",
        development,
      ),
    ).toThrow("must be configured");
    expect(
      selectAuthEmailService(
        { NODE_ENV: "test" },
        "http://localhost:3000",
        development,
      ),
    ).toBe(development);
    expect(
      () =>
        new AuthConfig({
          NODE_ENV: "production",
          APP_ORIGIN: "http://app.example",
          AUTH_TOKEN_PEPPER: "test-only-pepper-with-at-least-32-characters",
        }),
    ).toThrow("HTTPS");
  });

  it("requires explicit region and verified sender configuration", () => {
    expect(() =>
      createSesAuthEmailService(
        { AWS_REGION: "us-east-1" },
        "https://app.example",
      ),
    ).toThrow();
    expect(() =>
      createSesAuthEmailService(
        { AWS_REGION: "us-east-1", SES_FROM_EMAIL: "invalid" },
        "https://app.example",
      ),
    ).toThrow();
  });

  it("sends verification and reset content only through an injected SES client", async () => {
    const commands: SendEmailCommand[] = [];
    const client = {
      send: async (command: SendEmailCommand) => {
        commands.push(command);
        return { MessageId: "accepted-test-id" };
      },
    } as unknown as SESv2Client;
    const service = new SesAuthEmailService(
      client,
      "verified@example.invalid",
      "https://app.example",
    );
    const expiresAt = new Date("2026-10-01T12:00:00.000Z");

    await service.sendVerificationCode({
      recipient: "user@example.invalid",
      code: "123456",
      expiresAt,
    });
    await service.sendPasswordReset({
      recipient: "user@example.invalid",
      resetToken: "disposable-token",
      expiresAt,
    });

    expect(commands).toHaveLength(2);
    expect(commands[0]?.input).toMatchObject({
      FromEmailAddress: "verified@example.invalid",
      Destination: { ToAddresses: ["user@example.invalid"] },
    });
    expect(commands[0]?.input.Content?.Simple?.Body?.Text?.Data).toContain(
      "123456",
    );
    expect(commands[1]?.input.Content?.Simple?.Body?.Text?.Data).toContain(
      "https://app.example/reset-password?token=disposable-token",
    );
  });

  it("does not treat an unconfirmed SES response as delivery", async () => {
    const client = {
      send: async () => ({}),
    } as unknown as SESv2Client;
    const service = new SesAuthEmailService(
      client,
      "verified@example.invalid",
      "https://app.example",
    );
    await expect(
      service.sendVerificationCode({
        recipient: "user@example.invalid",
        code: "123456",
        expiresAt: new Date(),
      }),
    ).rejects.toThrow("did not confirm");
  });
});
