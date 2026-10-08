import { Transform, Type } from "class-transformer";
import {
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  ValidateNested,
} from "class-validator";
import { WorkspaceProfileFieldsDto } from "../settings/settings.dto.js";

function collapseWhitespace({ value }: { value: unknown }): unknown {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : value;
}

function normalizeSlug({ value }: { value: unknown }): unknown {
  return typeof value === "string" ? value.trim().toLowerCase() : value;
}

class NamedSlugDto {
  @Transform(collapseWhitespace)
  @IsString()
  @Length(2, 160)
  declare name: string;

  @Transform(normalizeSlug)
  @IsString()
  @Length(2, 100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  declare slug: string;
}

export class CreateWorkspaceDto extends NamedSlugDto {}

export class BootstrapOrganizationDto extends NamedSlugDto {
  @Transform(collapseWhitespace)
  @IsString()
  @Length(2, 160)
  declare workspaceName: string;

  @Transform(normalizeSlug)
  @IsString()
  @Length(2, 100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  declare workspaceSlug: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => WorkspaceProfileFieldsDto)
  declare profile?: WorkspaceProfileFieldsDto;
}

export class SelectWorkspaceDto {
  @IsUUID("4")
  declare organizationId: string;

  @IsUUID("4")
  declare workspaceId: string;
}
