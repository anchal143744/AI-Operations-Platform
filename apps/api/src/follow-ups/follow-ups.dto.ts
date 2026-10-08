import { Transform } from "class-transformer";
import { FollowUpType, LeadPriority } from "@prisma/client";
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from "class-validator";
import type { FollowUpStatus } from "@aop/types";

const trim = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;
const commaSeparated = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.split(",") : value;
const numberOrDefault =
  (fallback: number) =>
  ({ value }: { value: unknown }) =>
    value === undefined ? fallback : Number(value);

export class CreateFollowUpDto {
  @Transform(trim)
  @IsString()
  @Length(1, 160)
  declare title: string;

  @Transform(trim)
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(2000)
  declare description?: string;

  @IsEnum(FollowUpType)
  declare type: FollowUpType;

  @IsEnum(LeadPriority)
  declare priority: LeadPriority;

  @IsISO8601({ strict: true })
  declare dueAt: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsUUID("4")
  declare leadId?: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsUUID("4")
  declare conversationId?: string;
}

export class RescheduleFollowUpDto {
  @IsISO8601({ strict: true })
  declare dueAt: string;
}

export const followUpViews = [
  "ALL",
  "DUE_TODAY",
  "UPCOMING",
  "OVERDUE",
  "COMPLETED",
] as const;
export const followUpSorts = [
  "DUE_SOONEST",
  "DUE_LATEST",
  "PRIORITY_HIGHEST",
  "RECENTLY_CREATED",
] as const;
const followUpStatuses = [
  "PENDING",
  "DUE",
  "OVERDUE",
  "COMPLETED",
  "CANCELLED",
] as const satisfies readonly FollowUpStatus[];

export class ListFollowUpsDto {
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
  @IsIn(followUpViews)
  declare view?: (typeof followUpViews)[number];

  @Transform(commaSeparated)
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsIn(followUpStatuses, { each: true })
  declare status?: (typeof followUpStatuses)[number][];

  @Transform(commaSeparated)
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @IsEnum(LeadPriority, { each: true })
  declare priority?: LeadPriority[];

  @Transform(commaSeparated)
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsEnum(FollowUpType, { each: true })
  declare type?: FollowUpType[];

  @IsOptional()
  @IsIn(followUpSorts)
  declare sort?: (typeof followUpSorts)[number];

  @IsOptional()
  @IsIn(["ANY", "DUE_TODAY", "UPCOMING", "OVERDUE"])
  declare date?: "ANY" | "DUE_TODAY" | "UPCOMING" | "OVERDUE";
}
