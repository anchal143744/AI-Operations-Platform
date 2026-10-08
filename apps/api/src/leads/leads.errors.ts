import { BadRequestException, NotFoundException } from "@nestjs/common";

export function leadNotFound(): NotFoundException {
  return new NotFoundException({
    statusCode: 404,
    code: "LEAD_NOT_FOUND",
    message: "This lead is not available.",
  });
}

export function emptyLeadUpdate(): BadRequestException {
  return new BadRequestException({
    statusCode: 400,
    code: "VALIDATION_FAILED",
    message: "Provide at least one field to update.",
  });
}
