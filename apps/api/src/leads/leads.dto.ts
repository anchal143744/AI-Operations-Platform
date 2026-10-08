import { Transform } from "class-transformer";
import { LeadPriority, LeadSource, LeadStatus } from "@prisma/client";
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from "class-validator";

function trim({ value }: { value: unknown }): unknown {
  return typeof value === "string" ? value.trim() : value;
}

function normalizeEmail({ value }: { value: unknown }): unknown {
  return typeof value === "string" ? value.trim().toLowerCase() : value;
}

function numberOrDefault(fallback: number) {
  return ({ value }: { value: unknown }): unknown =>
    value === undefined ? fallback : Number(value);
}

function commaSeparated({ value }: { value: unknown }): unknown {
  return typeof value === "string" ? value.split(",") : value;
}

export class CreateLeadDto {
  @Transform(trim)
  @IsString()
  @Length(1, 160)
  declare name: string;

  @Transform(trim)
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @Length(1, 160)
  declare company?: string;

  @Transform(normalizeEmail)
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsEmail()
  @MaxLength(320)
  declare email?: string;

  @Transform(trim)
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @Length(1, 40)
  declare phone?: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsEnum(LeadSource)
  declare source?: LeadSource;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsEnum(LeadPriority)
  declare priority?: LeadPriority;
}

export class UpdateLeadDto {
  @Transform(trim)
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @Length(1, 160)
  declare name?: string;

  @Transform(trim)
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @Length(1, 160)
  declare company?: string;

  @Transform(normalizeEmail)
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsEmail()
  @MaxLength(320)
  declare email?: string;

  @Transform(trim)
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @Length(1, 40)
  declare phone?: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsEnum(LeadStatus)
  declare status?: LeadStatus;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsEnum(LeadPriority)
  declare priority?: LeadPriority;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsEnum(LeadSource)
  declare source?: LeadSource;
}

export const leadSortOptions = [
  "NEWEST",
  "OLDEST",
  "RECENTLY_UPDATED",
  "PRIORITY",
] as const;

export class ListLeadsDto {
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

  @Transform(commaSeparated)
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsEnum(LeadStatus, { each: true })
  declare status?: LeadStatus[];

  @Transform(commaSeparated)
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @IsEnum(LeadPriority, { each: true })
  declare priority?: LeadPriority[];

  @Transform(commaSeparated)
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @IsEnum(LeadSource, { each: true })
  declare source?: LeadSource[];

  @IsOptional()
  @IsIn(leadSortOptions)
  declare sort?: (typeof leadSortOptions)[number];
}
