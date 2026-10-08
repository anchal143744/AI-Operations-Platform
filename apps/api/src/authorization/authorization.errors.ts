import { ForbiddenException, UnauthorizedException } from "@nestjs/common";

export function unauthenticated(): UnauthorizedException {
  return new UnauthorizedException({
    statusCode: 401,
    code: "UNAUTHENTICATED",
    message: "Sign in to continue.",
  });
}

export function permissionDenied(): ForbiddenException {
  return new ForbiddenException({
    statusCode: 403,
    code: "PERMISSION_DENIED",
    message: "This action is not available to this account.",
  });
}
