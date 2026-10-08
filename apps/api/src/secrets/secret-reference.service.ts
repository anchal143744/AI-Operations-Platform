import { BadRequestException, Injectable } from "@nestjs/common";

const secretReferencePattern = /^secret:\/\/[a-z0-9][a-z0-9/_-]{2,239}$/;

@Injectable()
export class SecretReferenceService {
  validate(reference: string) {
    if (!secretReferencePattern.test(reference)) {
      throw new BadRequestException({
        code: "INVALID_SECRET_REFERENCE",
        message: "Use an approved secret-manager reference.",
      });
    }
    return reference;
  }
}
