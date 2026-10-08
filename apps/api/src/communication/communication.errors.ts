import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
} from "@nestjs/common";

export const communicationErrorCodes = [
  "UNSUPPORTED_CHANNEL",
  "UNSUPPORTED_PROVIDER",
  "PROVIDER_NOT_CONFIGURED",
  "INVALID_MESSAGE_STATE",
  "DUPLICATE_IDEMPOTENCY_KEY",
  "PROVIDER_REJECTED",
  "DELIVERY_FAILED",
  "DELIVERY_OUTCOME_UNKNOWN",
  "WEBHOOK_VERIFICATION_FAILED",
] as const;

export class CommunicationError extends HttpException {
  constructor(
    readonly code: (typeof communicationErrorCodes)[number],
    message: string,
    readonly retryable = false,
  ) {
    super(
      { code, message, retryable },
      retryable ? HttpStatus.SERVICE_UNAVAILABLE : HttpStatus.BAD_GATEWAY,
    );
  }
}

export function providerNotConfigured() {
  return new BadRequestException({
    code: "PROVIDER_NOT_CONFIGURED",
    message:
      "No approved communication provider is configured for this channel.",
  });
}

export function duplicateIdempotencyKey() {
  return new ConflictException({
    code: "DUPLICATE_IDEMPOTENCY_KEY",
    message: "This delivery key was already used for a different message.",
  });
}

export function invalidMessageState() {
  return new ConflictException({
    code: "INVALID_MESSAGE_STATE",
    message: "The message cannot make that delivery-state transition.",
  });
}
