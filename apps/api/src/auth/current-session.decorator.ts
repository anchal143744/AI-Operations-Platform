import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { AuthenticatedSession } from "@aop/types";
import type { AuthenticatedRequest } from "./session-auth.guard.js";
import { invalidSession } from "./auth.errors.js";

export const CurrentSession = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedSession => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.authenticatedSession) throw invalidSession();
    return request.authenticatedSession;
  },
);
