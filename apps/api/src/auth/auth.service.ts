import { Inject, Injectable, Logger } from "@nestjs/common";
import { Prisma, UserStatus } from "@prisma/client";
import type {
  AuthenticatedSession,
  GenericAuthResponse,
  RegistrationResponse,
} from "@aop/types";
import { PrismaService } from "../database/prisma.service.js";
import type {
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
} from "./auth.dto.js";
import { AuthConfig } from "./auth.config.js";
import {
  invalidCredentials,
  invalidToken,
  verificationRequired,
} from "./auth.errors.js";
import { AUTH_EMAIL_SERVICE, type AuthEmailService } from "./email.service.js";
import { PasswordService } from "./password.service.js";
import { SessionService } from "./session.service.js";
import { AuthTokenService } from "./token.service.js";

type RegistrationResult = Readonly<{
  response: RegistrationResponse;
  verificationContext?: string;
  verificationExpiresAt?: Date;
}>;

type VerificationResult = Readonly<{
  response: Readonly<{ verified: true; session: AuthenticatedSession }>;
  sessionToken: string;
  sessionExpiresAt: Date;
}>;

type ResendResult = Readonly<{
  response: GenericAuthResponse;
  verificationContext?: string;
  verificationExpiresAt?: Date;
}>;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly tokens: AuthTokenService,
    private readonly sessions: SessionService,
    private readonly config: AuthConfig,
    @Inject(AUTH_EMAIL_SERVICE)
    private readonly email: AuthEmailService,
  ) {}

  async register(input: RegisterDto): Promise<RegistrationResult> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const passwordHash = await this.passwords.hash(input.password);
    const context = this.tokens.issueOpaqueToken();
    const code = this.tokens.issueVerificationCode();
    const expiresAt = this.tokens.expiresIn(this.config.verificationTtlMs);

    const localPreview =
      this.config.localCodePreviewEnabled && !this.email.deliveryConfigured;
    let recipient: string | undefined;
    try {
      recipient = await this.prisma.$transaction(async (transaction) => {
        const existing = await transaction.user.findUnique({
          where: { normalizedEmail },
        });

        if (existing) {
          if (
            existing.status !== UserStatus.PENDING_VERIFICATION ||
            existing.emailVerifiedAt
          ) {
            return undefined;
          }

          // In local preview mode, never reveal a pending account's code to
          // someone who merely knows its email address.
          if (
            localPreview &&
            !(await this.passwords.verify(
              input.password,
              existing.passwordHash,
            ))
          ) {
            return undefined;
          }

          await transaction.emailVerificationToken.updateMany({
            where: { userId: existing.id, consumedAt: null },
            data: { consumedAt: new Date() },
          });
          await transaction.emailVerificationToken.create({
            data: {
              userId: existing.id,
              contextHash: context.tokenHash,
              tokenHash: code.tokenHash,
              expiresAt,
            },
          });
          return existing.email;
        }

        const user = await transaction.user.create({
          data: {
            email: input.email.trim(),
            normalizedEmail,
            name: `${input.firstName.trim()} ${input.lastName.trim()}`,
            passwordHash,
            status: UserStatus.PENDING_VERIFICATION,
          },
        });
        await transaction.emailVerificationToken.create({
          data: {
            userId: user.id,
            contextHash: context.tokenHash,
            tokenHash: code.tokenHash,
            expiresAt,
          },
        });
        return user.email;
      });
    } catch (error) {
      if (!(
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )) {
        throw error;
      }
    }

    if (recipient) {
      await this.deliverSafely(() =>
        this.email.sendVerificationCode({
          recipient,
          code: code.code,
          expiresAt,
        }),
      );
    }

    return {
      response: {
        accepted: true,
        verificationRequired: true,
        deliveryConfigured: this.email.deliveryConfigured,
        ...(localPreview && recipient
          ? { localDevelopmentCode: code.code }
          : {}),
      },
      verificationContext: context.rawToken,
      verificationExpiresAt: expiresAt,
    };
  }

  async login(input: LoginDto): Promise<
    Readonly<{
      response: AuthenticatedSession;
      sessionToken: string;
      sessionExpiresAt: Date;
    }>
  > {
    const user = await this.prisma.user.findUnique({
      where: { normalizedEmail: input.email.trim().toLowerCase() },
    });
    const passwordMatches = await this.passwords.verify(
      input.password,
      user?.passwordHash,
    );

    if (
      !user ||
      !passwordMatches ||
      user.status === UserStatus.DISABLED ||
      user.status === UserStatus.SUSPENDED
    ) {
      throw invalidCredentials();
    }
    if (
      user.status === UserStatus.PENDING_VERIFICATION ||
      !user.emailVerifiedAt
    ) {
      throw verificationRequired();
    }

    const issued = await this.sessions.create(
      user.id,
      input.rememberMe ?? false,
    );
    return {
      response: issued.session,
      sessionToken: issued.rawToken,
      sessionExpiresAt: issued.expiresAt,
    };
  }

  async verifyEmail(
    contextToken: string | undefined,
    code: string,
  ): Promise<VerificationResult> {
    if (!contextToken) throw invalidToken();

    const now = new Date();
    const token = await this.prisma.emailVerificationToken.findUnique({
      where: { contextHash: this.tokens.hash(contextToken) },
      include: { user: true },
    });
    if (
      !token ||
      token.consumedAt ||
      this.tokens.isExpired(token.expiresAt, now) ||
      token.user.status !== UserStatus.PENDING_VERIFICATION ||
      !this.tokens.matches(code, token.tokenHash)
    ) {
      throw invalidToken();
    }

    await this.prisma.$transaction(async (transaction) => {
      const consumed = await transaction.emailVerificationToken.updateMany({
        where: { id: token.id, consumedAt: null, expiresAt: { gt: now } },
        data: { consumedAt: now },
      });
      if (consumed.count !== 1) throw invalidToken();

      const activated = await transaction.user.updateMany({
        where: {
          id: token.userId,
          status: UserStatus.PENDING_VERIFICATION,
          emailVerifiedAt: null,
        },
        data: { status: UserStatus.ACTIVE, emailVerifiedAt: now },
      });
      if (activated.count !== 1) throw invalidToken();
    });

    const session = await this.sessions.create(token.userId, false);
    return {
      response: { verified: true, session: session.session },
      sessionToken: session.rawToken,
      sessionExpiresAt: session.expiresAt,
    };
  }

  async resendVerification(
    contextToken: string | undefined,
  ): Promise<ResendResult> {
    if (!contextToken) {
      const decoy = this.tokens.issueOpaqueToken();
      return {
        response: {
          accepted: true,
          deliveryConfigured: this.email.deliveryConfigured,
        },
        verificationContext: decoy.rawToken,
        verificationExpiresAt: this.tokens.expiresIn(
          this.config.verificationTtlMs,
        ),
      };
    }

    const existing = await this.prisma.emailVerificationToken.findUnique({
      where: { contextHash: this.tokens.hash(contextToken) },
      include: { user: true },
    });
    if (
      !existing ||
      existing.user.status !== UserStatus.PENDING_VERIFICATION ||
      existing.user.emailVerifiedAt
    ) {
      const decoy = this.tokens.issueOpaqueToken();
      return {
        response: {
          accepted: true,
          deliveryConfigured: this.email.deliveryConfigured,
        },
        verificationContext: decoy.rawToken,
        verificationExpiresAt: this.tokens.expiresIn(
          this.config.verificationTtlMs,
        ),
      };
    }

    const context = this.tokens.issueOpaqueToken();
    const code = this.tokens.issueVerificationCode();
    const expiresAt = this.tokens.expiresIn(this.config.verificationTtlMs);
    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.updateMany({
        where: { userId: existing.userId, consumedAt: null },
        data: { consumedAt: new Date() },
      }),
      this.prisma.emailVerificationToken.create({
        data: {
          userId: existing.userId,
          contextHash: context.tokenHash,
          tokenHash: code.tokenHash,
          expiresAt,
        },
      }),
    ]);
    await this.deliverSafely(() =>
      this.email.sendVerificationCode({
        recipient: existing.user.email,
        code: code.code,
        expiresAt,
      }),
    );

    return {
      response: {
        accepted: true,
        deliveryConfigured: this.email.deliveryConfigured,
        ...(this.config.localCodePreviewEnabled &&
        !this.email.deliveryConfigured
          ? { localDevelopmentCode: code.code }
          : {}),
      },
      verificationContext: context.rawToken,
      verificationExpiresAt: expiresAt,
    };
  }

  async forgotPassword(input: ForgotPasswordDto): Promise<GenericAuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { normalizedEmail: input.email.trim().toLowerCase() },
    });
    if (
      user &&
      user.status === UserStatus.ACTIVE &&
      Boolean(user.emailVerifiedAt)
    ) {
      const reset = this.tokens.issueOpaqueToken();
      const expiresAt = this.tokens.expiresIn(this.config.passwordResetTtlMs);
      await this.prisma.$transaction([
        this.prisma.passwordResetToken.updateMany({
          where: { userId: user.id, consumedAt: null },
          data: { consumedAt: new Date() },
        }),
        this.prisma.passwordResetToken.create({
          data: { userId: user.id, tokenHash: reset.tokenHash, expiresAt },
        }),
      ]);
      await this.deliverSafely(() =>
        this.email.sendPasswordReset({
          recipient: user.email,
          resetToken: reset.rawToken,
          expiresAt,
        }),
      );
    }

    return {
      accepted: true,
      deliveryConfigured: this.email.deliveryConfigured,
    };
  }

  async resetPassword(input: ResetPasswordDto): Promise<GenericAuthResponse> {
    const now = new Date();
    const token = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: this.tokens.hash(input.resetToken) },
      include: { user: true },
    });
    if (
      !token ||
      token.consumedAt ||
      this.tokens.isExpired(token.expiresAt, now) ||
      token.user.status !== UserStatus.ACTIVE
    ) {
      throw invalidToken();
    }

    const passwordHash = await this.passwords.hash(input.newPassword);
    await this.prisma.$transaction(async (transaction) => {
      const consumed = await transaction.passwordResetToken.updateMany({
        where: { id: token.id, consumedAt: null, expiresAt: { gt: now } },
        data: { consumedAt: now },
      });
      if (consumed.count !== 1) throw invalidToken();

      await transaction.user.update({
        where: { id: token.userId },
        data: { passwordHash },
      });
      await transaction.session.updateMany({
        where: { userId: token.userId, revokedAt: null },
        data: { revokedAt: now },
      });
      await transaction.passwordResetToken.updateMany({
        where: { userId: token.userId, consumedAt: null },
        data: { consumedAt: now },
      });
    });

    return { accepted: true };
  }

  session(rawToken: string): Promise<AuthenticatedSession> {
    return this.sessions.authenticate(rawToken);
  }

  logout(rawToken: string): Promise<void> {
    return this.sessions.revoke(rawToken);
  }

  private async deliverSafely(deliver: () => Promise<void>): Promise<void> {
    try {
      await deliver();
    } catch {
      // Do not leak provider details, recipients, or token material through logs
      // or response differences. Provider health belongs in future observability.
      this.logger.error("Authentication email delivery failed.");
    }
  }
}
