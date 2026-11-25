import {
  IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString, IsUUID,
} from 'class-validator';
import { CampaignType, CampaignStatus } from '../entities/campaign.entity';
import { SessionStatus } from '../entities/campaign-session.entity';

export class CreateCampaignDto {
  @IsString() @IsNotEmpty()
  code: string;

  @IsString() @IsNotEmpty()
  name: string;

  @IsEnum(CampaignType) @IsOptional()
  type?: CampaignType;

  @IsUUID() @IsOptional()
  referentialId?: string;

  @IsUUID() @IsOptional()
  territoryId?: string;

  @IsUUID() @IsOptional()
  structureId?: string;

  @IsDateString() @IsOptional()
  startDate?: string;

  @IsDateString() @IsOptional()
  endDate?: string;

  @IsString() @IsOptional()
  targetPopulation?: string;

  @IsString() @IsOptional()
  objectives?: string;
}

export class UpdateCampaignDto {
  @IsString() @IsOptional()
  name?: string;

  @IsDateString() @IsOptional()
  startDate?: string;

  @IsDateString() @IsOptional()
  endDate?: string;

  @IsString() @IsOptional()
  targetPopulation?: string;

  @IsString() @IsOptional()
  objectives?: string;
}

export class CreateSessionDto {
  @IsUUID() @IsOptional()
  structureId?: string;

  @IsUUID() @IsOptional()
  mobileTeamId?: string;

  @IsDateString() @IsOptional()
  scheduledAt?: string;

  @IsString() @IsOptional()
  location?: string;

  @IsUUID() @IsOptional()
  supervisorId?: string;
}

export class UpdateSessionDto {
  @IsEnum(SessionStatus) @IsOptional()
  status?: SessionStatus;

  @IsDateString() @IsOptional()
  scheduledAt?: string;

  @IsString() @IsOptional()
  location?: string;

  @IsUUID() @IsOptional()
  supervisorId?: string;
}

export class TransitionCampaignDto {
  @IsEnum(CampaignStatus)
  status: CampaignStatus;

  @IsString() @IsOptional()
  reason?: string;
}
