import { IsString, IsNotEmpty, MinLength, IsOptional } from 'class-validator';

export class LoginDto {
  @IsString() @IsNotEmpty()
  username: string;

  @IsString() @IsNotEmpty()
  password: string;

  /** Code TOTP — requis si le compte a le MFA activé. */
  @IsString() @IsOptional()
  totpCode?: string;
}

export class RefreshDto {
  @IsString() @IsNotEmpty()
  refreshToken: string;
}

export class RegisterDeviceDto {
  @IsString() @IsNotEmpty()
  fingerprint: string;

  @IsString() @IsOptional()
  platform?: string;

  @IsString() @IsOptional()
  pushToken?: string;
}
