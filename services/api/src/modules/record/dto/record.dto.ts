import { IsString, IsOptional, IsUUID } from 'class-validator';

export class RevokeAttestationDto {
  @IsString()
  reason: string;
}
