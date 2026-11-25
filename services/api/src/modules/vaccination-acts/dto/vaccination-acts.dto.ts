import {
  IsString, IsNotEmpty, IsOptional, IsEnum, IsInt, IsDateString, IsUUID, Min,
} from 'class-validator';
import { ActStatus, ActSource } from '../entities/vaccination-act.entity';
import { AdverseEventSeverity } from '../entities/adverse-event.entity';

export class CreateActDto {
  @IsUUID() @IsOptional()
  localId?: string; // idempotence sync hors ligne

  @IsUUID()
  beneficiaryId: string;

  @IsUUID()
  vaccineId: string;

  @IsUUID() @IsOptional()
  presentationId?: string;

  @IsInt() @Min(1)
  doseNumber: number;

  @IsUUID() @IsOptional()
  ruleId?: string;

  @IsUUID() @IsOptional()
  referentialId?: string;

  @IsDateString() @IsOptional()
  administeredAt?: string;

  @IsUUID() @IsOptional()
  structureId?: string;

  @IsUUID() @IsOptional()
  campaignId?: string;

  @IsUUID() @IsOptional()
  lotId?: string;

  @IsString() @IsOptional()
  lotNumber?: string;

  @IsString() @IsOptional()
  site?: string;

  @IsString() @IsOptional()
  route?: string;

  @IsEnum(ActStatus) @IsOptional()
  status?: ActStatus;

  @IsEnum(ActSource) @IsOptional()
  source?: ActSource;

  @IsString() @IsOptional()
  notes?: string;
}

export class UpdateActDto {
  @IsDateString() @IsOptional()
  administeredAt?: string;

  @IsUUID() @IsOptional()
  structureId?: string;

  @IsUUID() @IsOptional()
  presentationId?: string;

  @IsUUID() @IsOptional()
  lotId?: string;

  @IsString() @IsOptional()
  lotNumber?: string;

  @IsString() @IsOptional()
  site?: string;

  @IsString() @IsOptional()
  route?: string;

  @IsString() @IsOptional()
  notes?: string;
}

export class TransitionActDto {
  @IsEnum(ActStatus)
  status: ActStatus; // administered | not_performed | cancelled | planned

  @IsDateString() @IsOptional()
  administeredAt?: string;

  @IsString() @IsNotEmpty()
  reason: string; // motif obligatoire pour not_performed / cancelled / correction
}

export class DeclareAdverseEventDto {
  @IsUUID() @IsOptional()
  actId?: string;

  @IsUUID()
  beneficiaryId: string;

  @IsEnum(AdverseEventSeverity)
  severity: AdverseEventSeverity;

  @IsString() @IsNotEmpty()
  description: string;

  @IsDateString() @IsOptional()
  occurredAt?: string;
}

export class ListActsQuery {
  @IsUUID() @IsOptional()
  beneficiaryId?: string;

  @IsUUID() @IsOptional()
  vaccineId?: string;

  @IsEnum(ActStatus) @IsOptional()
  status?: ActStatus;

  @IsDateString() @IsOptional()
  from?: string;

  @IsDateString() @IsOptional()
  to?: string;
}
