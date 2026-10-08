import { Transform, Type } from "class-transformer";
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { ActivityActorType, ActivityEventType } from "@prisma/client";

export class ListActivityDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  declare page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  declare limit?: number;

  @IsOptional()
  @IsEnum(ActivityEventType)
  declare eventType?: ActivityEventType;

  @IsOptional()
  @IsEnum(ActivityActorType)
  declare actorType?: ActivityActorType;

  @IsOptional()
  @IsIn([
    "ALL",
    "AI_OPERATIONS",
    "APPROVALS",
    "WORKFLOWS",
    "CUSTOMER_OPERATIONS",
    "SYSTEM",
    "SECURITY",
  ])
  declare category?:
    | "ALL"
    | "AI_OPERATIONS"
    | "APPROVALS"
    | "WORKFLOWS"
    | "CUSTOMER_OPERATIONS"
    | "SYSTEM"
    | "SECURITY";

  @IsOptional()
  @IsString()
  @MaxLength(120)
  declare search?: string;

  @IsOptional()
  @IsUUID("4")
  declare workflowId?: string;

  @IsOptional()
  @IsIn(["ANY", "TODAY", "LAST_7_DAYS", "LAST_30_DAYS"])
  declare dateRange?: "ANY" | "TODAY" | "LAST_7_DAYS" | "LAST_30_DAYS";

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.toUpperCase() : value,
  )
  @IsIn(["NEWEST", "OLDEST"])
  declare sort?: "NEWEST" | "OLDEST";
}
