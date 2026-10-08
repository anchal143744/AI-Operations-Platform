import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from "class-validator";

const PASSWORD_POLICY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,128}$/;

function normalizeEmail({ value }: { value: unknown }): unknown {
  return typeof value === "string" ? value.trim().toLowerCase() : value;
}

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === "string" ? value.trim() : value;
}

export class RegisterDto {
  @Transform(trimString)
  @IsString()
  @Length(1, 64)
  declare firstName: string;

  @Transform(trimString)
  @IsString()
  @Length(1, 64)
  declare lastName: string;

  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(320)
  declare email: string;

  @IsString()
  @Matches(PASSWORD_POLICY, {
    message:
      "password must contain 10-128 characters with upper, lower, and numeric characters",
  })
  declare password: string;
}

export class LoginDto {
  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(320)
  declare email: string;

  @IsString()
  @Length(1, 128)
  declare password: string;

  @IsOptional()
  @IsBoolean()
  declare rememberMe?: boolean;
}

export class VerifyEmailDto {
  @IsString()
  @Matches(/^\d{6}$/)
  declare code: string;
}

export class ForgotPasswordDto {
  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(320)
  declare email: string;
}

export class ResetPasswordDto {
  @IsString()
  @Length(40, 512)
  declare resetToken: string;

  @IsString()
  @Matches(PASSWORD_POLICY, {
    message:
      "newPassword must contain 10-128 characters with upper, lower, and numeric characters",
  })
  declare newPassword: string;
}
