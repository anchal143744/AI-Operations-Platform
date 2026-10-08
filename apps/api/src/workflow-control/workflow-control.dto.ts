import {
  ApprovalStatus,
  PolicyMode,
  WorkflowActionType,
  WorkflowStatus,
} from "@prisma/client";
import { Transform } from "class-transformer";
import {
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from "class-validator";

const trim = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

export class CreateWorkflowDto {
  @Transform(trim)
  @IsString()
  @Length(1, 160)
  declare name: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  declare description?: string;

  @IsOptional()
  @IsEnum(WorkflowActionType)
  declare actionType?: WorkflowActionType;
}

export class UpdateWorkflowDefinitionDto {
  @Transform(trim)
  @IsOptional()
  @IsString()
  @Length(1, 160)
  declare name?: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  declare description?: string;

  @IsOptional()
  @IsEnum(WorkflowActionType)
  declare actionType?: WorkflowActionType;
}

export class ChangeWorkflowStatusDto {
  @IsEnum(WorkflowStatus)
  declare status: WorkflowStatus;
}

export class ChangePolicyDto {
  @IsEnum(PolicyMode)
  declare mode: PolicyMode;
}

export class RequestDryRunDto {
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{8,120}$/)
  declare idempotencyKey: string;
}

export class DecideApprovalDto {
  @IsEnum(ApprovalStatus)
  declare decision: ApprovalStatus;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  declare note?: string;
}
