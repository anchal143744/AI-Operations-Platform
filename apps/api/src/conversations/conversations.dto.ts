import { Transform } from "class-transformer";
import { ConversationChannel, ConversationStatus } from "@prisma/client";
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
} from "class-validator";

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? value.trim() : value;
const numberOrDefault =
  (fallback: number) =>
  ({ value }: { value: unknown }): unknown =>
    value === undefined ? fallback : Number(value);

export class CreateConversationDto {
  @Transform(trim)
  @IsString()
  @Length(1, 160)
  declare participantName: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @Length(1, 160)
  declare participantCompany?: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @Length(1, 200)
  declare subject?: string;

  @IsEnum(ConversationChannel)
  declare channel: ConversationChannel;

  @IsOptional()
  @IsUUID("4")
  declare leadId?: string;
}

export class CreateMessageDto {
  @Transform(trim)
  @IsString()
  @Length(1, 10000)
  declare content: string;
}

export const conversationSortOptions = [
  "NEWEST_ACTIVITY",
  "OLDEST_ACTIVITY",
] as const;

export class ListConversationsDto {
  @Transform(numberOrDefault(1))
  @IsInt()
  @Min(1)
  @Max(1000)
  page = 1;

  @Transform(numberOrDefault(20))
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(160)
  declare search?: string;

  @IsOptional()
  @IsEnum(ConversationStatus)
  declare status?: ConversationStatus;

  @IsOptional()
  @IsEnum(ConversationChannel)
  declare channel?: ConversationChannel;

  @IsOptional()
  @IsUUID("4")
  declare leadId?: string;

  @IsOptional()
  @IsIn(conversationSortOptions)
  declare sort?: (typeof conversationSortOptions)[number];
}
