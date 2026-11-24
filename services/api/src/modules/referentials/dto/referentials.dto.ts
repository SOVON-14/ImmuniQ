import {
  IsString, IsNotEmpty, IsOptional, IsEnum, IsInt, IsDateString, IsUUID, IsBoolean, Min,
} from 'class-validator';
import { ReferentialType } from '../entities/referential.entity';
import { RuleContext } from '../entities/vaccination-rule.entity';
import { VaccineStatus } from '../entities/vaccine.entity';

export class CreateVaccineDto {
  @IsString() @IsNotEmpty()
  code: string;

  @IsString() @IsNotEmpty()
  name: string;

  @IsString() @IsOptional()
  description?: string;

  @IsEnum(VaccineStatus) @IsOptional()
  status?: VaccineStatus;

  @IsString() @IsOptional()
  sourceReference?: string;
}

export class CreatePresentationDto {
  @IsString() @IsNotEmpty()
  presentation: string;

  @IsString() @IsOptional()
  formulation?: string;
}

export class CreateReferentialDto {
  @IsEnum(ReferentialType)
  type: ReferentialType;

  @IsString() @IsNotEmpty()
  sourceOfficial: string;

  @IsDateString()
  effectiveFrom: string;

  @IsString() @IsOptional()
  notes?: string;
}

export class CreateRuleDto {
  @IsUUID()
  vaccineId: string;

  @IsInt() @Min(1)
  doseNumber: number;

  @IsInt() @Min(0) @IsOptional()
  minAgeDays?: number;

  @IsInt() @Min(0) @IsOptional()
  maxAgeDays?: number;

  @IsInt() @Min(0) @IsOptional()
  minIntervalDays?: number;

  @IsEnum(RuleContext)
  context: RuleContext;

  @IsOptional()
  contraindicationFlags?: Record<string, unknown>;

  @IsString() @IsOptional()
  notes?: string;
}

export class ValidationDecisionDto {
  @IsString() @IsNotEmpty()
  comment?: string;
}
