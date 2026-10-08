import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from "@nestjs/common";
import type { AuthErrorCode, AuthErrorResponse } from "@aop/types";

function body(
  statusCode: number,
  code: AuthErrorCode,
  message: string,
): AuthErrorResponse {
  return { statusCode, code, message };
}

export function invalidCredentials(): UnauthorizedException {
  return new UnauthorizedException(
    body(
      HttpStatus.UNAUTHORIZED,
      "AUTHENTICATION_FAILED",
      "The email or password is incorrect.",
    ),
  );
}

export function verificationRequired(): ForbiddenException {
  return new ForbiddenException(
    body(
      HttpStatus.FORBIDDEN,
      "EMAIL_VERIFICATION_REQUIRED",
      "Verify your email before signing in.",
    ),
  );
}

export function invalidToken(): HttpException {
  return new HttpException(
    body(
      HttpStatus.BAD_REQUEST,
      "INVALID_OR_EXPIRED_TOKEN",
      "This authentication token is invalid or has expired.",
    ),
    HttpStatus.BAD_REQUEST,
  );
}

export function invalidSession(): UnauthorizedException {
  return new UnauthorizedException(
    body(
      HttpStatus.UNAUTHORIZED,
      "INVALID_SESSION",
      "Your session is invalid or has expired.",
    ),
  );
}
