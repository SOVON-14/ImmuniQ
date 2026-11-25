import {
  IsString, IsNotEmpty, IsOptional, IsInt, Min, IsBoolean, IsEnum, IsObject, IsUUID,
} from 'class-validator';
import { BackupType } from '../entities/backup-record.entity';

export class UpsertSettingDto {
  @IsObject()
  value: unknown;

  @IsString() @IsOptional()
  category?: string;

  @IsString() @IsOptional()
  description?: string;
}

export class CreateNomenclatureDto {
  @IsString() @IsNotEmpty()
  domain: string;

  @IsString() @IsNotEmpty()
  code: string;

  @IsString() @IsNotEmpty()
  label: string;

  @IsString() @IsOptional()
  parentCode?: string;

  @IsInt() @IsOptional()
  sortOrder?: number;
}

export class UpdateNomenclatureDto {
  @IsString() @IsOptional()
  label?: string;

  @IsString() @IsOptional()
  parentCode?: string;

  @IsInt() @IsOptional()
  sortOrder?: number;

  @IsBoolean() @IsOptional()
  active?: boolean;
}

export class UpsertRetentionDto {
  @IsInt() @Min(1)
  retentionDays: number;

  @IsString() @IsOptional()
  legalBasis?: string;

  @IsBoolean() @IsOptional()
  active?: boolean;
}

export class TriggerBackupDto {
  @IsEnum(BackupType) @IsOptional()
  type?: BackupType;
}
