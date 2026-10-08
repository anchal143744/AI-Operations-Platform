import { Transform } from "class-transformer";
import { IsString, IsUUID, Length } from "class-validator";

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? value.trim() : value;

export class SubmitOutboundMessageDto {
  @Transform(trim)
  @IsString()
  @Length(1, 10000)
  declare content: string;

  @IsUUID("4")
  declare idempotencyKey: string;
}
