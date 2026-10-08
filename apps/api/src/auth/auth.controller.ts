import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Request, Response } from "express";
import type { AuthenticatedSession } from "@aop/types";
import { AuthCookieService } from "./auth-cookie.service.js";
import {
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from "./auth.dto.js";
import { AuthRateLimit } from "./auth-rate-limit.guard.js";
import { AuthService } from "./auth.service.js";
import { CurrentSession } from "./current-session.decorator.js";
import { SessionAuthGuard } from "./session-auth.guard.js";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly cookies: AuthCookieService,
  ) {}

  @Post("register")
  @HttpCode(HttpStatus.ACCEPTED)
  @AuthRateLimit({ limit: 5, windowMs: 15 * 60 * 1000 })
  async register(
    @Body() input: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.register(input);
    this.cookies.clearVerificationContext(response);
    if (result.verificationContext && result.verificationExpiresAt) {
      this.cookies.setVerificationContext(
        response,
        result.verificationContext,
        result.verificationExpiresAt,
      );
    }
    return result.response;
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @AuthRateLimit({ limit: 10, windowMs: 5 * 60 * 1000 })
  async login(
    @Body() input: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.login(input);
    this.cookies.setSession(
      response,
      result.sessionToken,
      result.sessionExpiresAt,
    );
    return result.response;
  }

  @Post("verify-email")
  @HttpCode(HttpStatus.OK)
  @AuthRateLimit({ limit: 10, windowMs: 15 * 60 * 1000 })
  async verifyEmail(
    @Body() input: VerifyEmailDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.verifyEmail(
      this.cookies.readVerificationContext(request),
      input.code,
    );
    this.cookies.clearVerificationContext(response);
    this.cookies.setSession(
      response,
      result.sessionToken,
      result.sessionExpiresAt,
    );
    return result.response;
  }

  @Post("resend-verification")
  @HttpCode(HttpStatus.ACCEPTED)
  @AuthRateLimit({ limit: 3, windowMs: 15 * 60 * 1000 })
  async resendVerification(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.resendVerification(
      this.cookies.readVerificationContext(request),
    );
    if (result.verificationContext && result.verificationExpiresAt) {
      this.cookies.setVerificationContext(
        response,
        result.verificationContext,
        result.verificationExpiresAt,
      );
    } else {
      this.cookies.clearVerificationContext(response);
    }
    return result.response;
  }

  @Post("forgot-password")
  @HttpCode(HttpStatus.ACCEPTED)
  @AuthRateLimit({ limit: 5, windowMs: 15 * 60 * 1000 })
  forgotPassword(@Body() input: ForgotPasswordDto) {
    return this.auth.forgotPassword(input);
  }

  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  @AuthRateLimit({ limit: 5, windowMs: 15 * 60 * 1000 })
  resetPassword(@Body() input: ResetPasswordDto) {
    return this.auth.resetPassword(input);
  }

  @Get("session")
  @UseGuards(SessionAuthGuard)
  getSession(@CurrentSession() session: AuthenticatedSession) {
    return session;
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(SessionAuthGuard)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const rawToken = this.cookies.readSession(request);
    if (rawToken) await this.auth.logout(rawToken);
    this.cookies.clearSession(response);
  }
}
