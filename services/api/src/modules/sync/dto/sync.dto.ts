import {
  ArrayMaxSize, ArrayNotEmpty, IsArray, IsDateString, IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SyncOpType } from '../entities/sync-operation.entity';

export class SyncOperationDto {
  @IsString() @IsNotEmpty()
  opId: string;

  @IsEnum(SyncOpType)
  type: SyncOpType;

  @IsUUID() @IsOptional()
  entityId?: string;

  @IsObject()
  payload: Record<string, unknown>;

  @IsDateString() @IsOptional()
  clientTimestamp?: string;
}

export class PushDto {
  @IsString() @IsOptional()
  deviceId?: string;

  @IsArray() @ArrayNotEmpty() @ArrayMaxSize(500) @ValidateNested({ each: true }) @Type(() => SyncOperationDto)
  operations: SyncOperationDto[];
}
