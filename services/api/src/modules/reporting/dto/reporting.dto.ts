import { IsEnum, IsOptional, IsString, IsUUID, IsDateString } from 'class-validator';
import { ExportType, ExportFormat } from '../entities/report-export.entity';

export class ReportQueryDto {
  @IsUUID() @IsOptional()
  territoryId?: string;

  @IsUUID() @IsOptional()
  structureId?: string;

  @IsUUID() @IsOptional()
  vaccineId?: string;

  @IsDateString() @IsOptional()
  from?: string;

  @IsDateString() @IsOptional()
  to?: string;
}

export class ExportDto extends ReportQueryDto {
  @IsEnum(ExportType)
  type: ExportType;

  @IsEnum(ExportFormat) @IsOptional()
  format?: ExportFormat;
}
