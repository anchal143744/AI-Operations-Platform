import { BadRequestException, NotFoundException } from "@nestjs/common";

export function followUpNotFound() {
  return new NotFoundException({
    statusCode: 404,
    code: "FOLLOW_UP_NOT_FOUND",
    message: "This follow-up is not available in the selected workspace.",
  });
}

export function followUpContextNotFound() {
  return new NotFoundException({
    statusCode: 404,
    code: "FOLLOW_UP_CONTEXT_NOT_FOUND",
    message: "A related record is not available in the selected workspace.",
  });
}

export function invalidFollowUp(message: string) {
  return new BadRequestException({
    statusCode: 400,
    code: "INVALID_FOLLOW_UP",
    message,
  });
}
