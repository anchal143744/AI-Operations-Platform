import { SendEmailCommand, SESv2Client } from "@aws-sdk/client-sesv2";
import type {
  AuthEmailService,
  DevelopmentAuthEmailService,
  PasswordResetEmail,
  VerificationEmail,
} from "./email.service.js";

const SENDER_ADDRESS = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** AWS role credentials are resolved by the SDK. This service never stores AWS keys. */
export class SesAuthEmailService implements AuthEmailService {
  readonly deliveryConfigured = true;

  constructor(
    private readonly client: SESv2Client,
    private readonly fromAddress: string,
    private readonly appOrigin: string,
  ) {}

  async sendVerificationCode(message: VerificationEmail): Promise<void> {
    await this.send(
      message.recipient,
      "Verify your AI Operations Platform email",
      `Your verification code is ${message.code}. It expires at ${message.expiresAt.toISOString()}. If you did not request this, ignore this email.`,
    );
  }

  async sendPasswordReset(message: PasswordResetEmail): Promise<void> {
    const link = new URL("/reset-password", this.appOrigin);
    link.searchParams.set("token", message.resetToken);
    await this.send(
      message.recipient,
      "Reset your AI Operations Platform password",
      `Use this link to reset your password: ${link.toString()}\nThis link expires at ${message.expiresAt.toISOString()}. If you did not request this, ignore this email.`,
    );
  }

  private async send(recipient: string, subject: string, body: string) {
    const response = await this.client.send(
      new SendEmailCommand({
        FromEmailAddress: this.fromAddress,
        Destination: { ToAddresses: [recipient] },
        Content: {
          Simple: {
            Subject: { Data: subject, Charset: "UTF-8" },
            Body: { Text: { Data: body, Charset: "UTF-8" } },
          },
        },
      }),
      { abortSignal: AbortSignal.timeout(10_000) },
    );
    if (!response.MessageId) {
      throw new Error("SES did not confirm message acceptance.");
    }
  }
}

export function createSesAuthEmailService(
  environment: NodeJS.ProcessEnv,
  appOrigin: string,
): SesAuthEmailService {
  const region = environment.AWS_REGION?.trim();
  const fromAddress = environment.SES_FROM_EMAIL?.trim();
  if (!region || !fromAddress || !SENDER_ADDRESS.test(fromAddress)) {
    throw new Error(
      "AWS_REGION and a valid SES_FROM_EMAIL are required for SES delivery.",
    );
  }
  return new SesAuthEmailService(
    new SESv2Client({ region, maxAttempts: 1 }),
    fromAddress,
    appOrigin,
  );
}

/** Production must not silently use the adapter that discards account email. */
export function selectAuthEmailService(
  environment: NodeJS.ProcessEnv,
  appOrigin: string,
  development: DevelopmentAuthEmailService,
): AuthEmailService {
  const transport = environment.AUTH_EMAIL_TRANSPORT ?? "development";
  if (transport === "development") {
    if (environment.NODE_ENV === "production") {
      throw new Error(
        "AUTH_EMAIL_TRANSPORT must be configured for production delivery.",
      );
    }
    return development;
  }
  if (transport === "ses") {
    return createSesAuthEmailService(environment, appOrigin);
  }
  throw new Error("Unsupported AUTH_EMAIL_TRANSPORT value.");
}
