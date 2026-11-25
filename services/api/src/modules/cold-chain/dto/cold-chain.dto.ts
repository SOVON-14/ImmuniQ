import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsDateString, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EquipmentType, EquipmentStatus } from '../entities/cold-chain-equipment.entity';
import { ReadingSource } from '../entities/temperature-reading.entity';
import { IncidentSeverity, IncidentStatus, LotDecision } from '../entities/cold-chain-incident.entity';

export class CreateEquipmentDto {
  @IsString() @IsNotEmpty()
  code: string;

  @IsString() @IsNotEmpty()
  name: string;

  @IsEnum(EquipmentType)
  type: EquipmentType;

  @IsUUID() @IsOptional()
  structureId?: string;

  @IsNumber()
  minTempC: number;

  @IsNumber()
  maxTempC: number;

  @IsDateString() @IsOptional()
  commissionedAt?: string;

  @IsString() @IsOptional()
  notes?: string;
}

export class UpdateEquipmentDto {
  @IsString() @IsOptional()
  name?: string;

  @IsEnum(EquipmentStatus) @IsOptional()
  status?: EquipmentStatus;

  @IsNumber() @IsOptional()
  minTempC?: number;

  @IsNumber() @IsOptional()
  maxTempC?: number;

  @IsString() @IsOptional()
  notes?: string;
}

export class ReadingItemDto {
  @IsDateString()
  recordedAt: string;

  @IsNumber()
  temperatureC: number;

  @IsEnum(ReadingSource) @IsOptional()
  source?: ReadingSource;

  @IsString() @IsOptional()
  notes?: string;
}

export class RecordReadingsDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(500) @ValidateNested({ each: true }) @Type(() => ReadingItemDto)
  readings: ReadingItemDto[];
}

export class CreateIncidentDto {
  @IsUUID()
  equipmentId: string;

  @IsDateString()
  detectedAt: string;

  @IsEnum(IncidentSeverity) @IsOptional()
  severity?: IncidentSeverity;

  @IsString() @IsOptional()
  description?: string;

  @IsNumber() @IsOptional()
  tempMinObserved?: number;

  @IsNumber() @IsOptional()
  tempMaxObserved?: number;
}

export class DecideIncidentDto {
  @IsEnum(LotDecision)
  lotDecision: LotDecision;

  @IsString() @IsNotEmpty()
  reason: string;
}

export class ResolveIncidentDto {
  @IsString() @IsOptional()
  resolution?: string;
}
