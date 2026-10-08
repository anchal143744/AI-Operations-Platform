import { Transform } from "class-transformer";
import {
  IsIn,
  IsString,
  IsTimeZone,
  IsUrl,
  Length,
  ValidateIf,
} from "class-validator";

const trim = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

const industries = [
  "technology",
  "software",
  "professional-services",
  "real-estate",
  "healthcare",
  "education",
  "retail",
  "manufacturing",
  "financial-services",
  "marketing-advertising",
  "other",
  "",
] as const;
const companySizes = [
  "1–10",
  "11–50",
  "51–200",
  "201–500",
  "500+",
  "",
] as const;
const expectations = [
  "immediately",
  "15-minutes",
  "1-hour",
  "same-day",
  "24-hours",
  "",
] as const;

export class WorkspaceProfileFieldsDto {
  @Transform(trim)
  @IsString()
  @ValidateIf((_object, value: unknown) => value !== "")
  @IsUrl({ protocols: ["https"], require_protocol: true })
  @Length(0, 2048)
  declare website: string;

  @IsIn(industries)
  declare industry: (typeof industries)[number];

  @IsIn(companySizes)
  declare companySize: (typeof companySizes)[number];

  @ValidateIf((_object, value: unknown) => value !== "")
  @IsTimeZone()
  declare timezone: string;

  @IsIn(expectations)
  declare responseExpectation: (typeof expectations)[number];
}

export class UpdateWorkspaceProfileDto extends WorkspaceProfileFieldsDto {
  @Transform(trim)
  @IsString()
  @Length(2, 160)
  declare workspaceName: string;
}
