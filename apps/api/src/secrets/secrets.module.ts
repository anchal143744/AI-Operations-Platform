import { Module } from "@nestjs/common";
import { SecretReferenceService } from "./secret-reference.service.js";

@Module({
  providers: [SecretReferenceService],
  exports: [SecretReferenceService],
})
export class SecretsModule {}
