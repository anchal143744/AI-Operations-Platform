import { Injectable, Logger } from "@nestjs/common";

export const AUTH_EMAIL_SERVICE = Symbol("AUTH_EMAIL_SERVICE");

export type VerificationEmail = Readonly<{
  recipient: string;
  code: string;
  expiresAt: Date;
}>;

export type PasswordResetEmail = Readonly<{
  recipient: string;
  resetToken: string;
  expiresAt: Date;
}>;

export interface AuthEmailService {
  readonly deliveryConfigured: boolean;
  sendVerificationCode(message: VerificationEmail): Promise<void>;
  sendPasswordReset(message: PasswordResetEmail): Promise<void>;
}

@Injectable()
export class DevelopmentAuthEmailService implements AuthEmailService {
  readonly deliveryConfigured = false;
  private readonly logger = new Logger(DevelopmentAuthEmailService.name);

  async sendVerificationCode(message: VerificationEmail): Promise<void> {
    this.logger.warn(
      `[DEV ONLY] Verification code: ${message.code} | Expires: ${message.expiresAt.toISOString()}`,
    );
  }

  async sendPasswordReset(message: PasswordResetEmail): Promise<void> {
    this.logger.warn(
      `[DEV ONLY] Password reset token generated. Expires: ${message.expiresAt.toISOString()}`,
    );
  }
}
