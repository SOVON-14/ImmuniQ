import {
  IsString, IsNotEmpty, IsOptional, IsEnum, IsIn, IsInt, IsDateString, IsUUID, Min,
} from 'class-validator';
import { ProductType } from '../entities/product.entity';
import { LotStatus } from '../entities/lot.entity';
import { MovementType } from '../entities/stock-movement.entity';

export class CreateProductDto {
  @IsString() @IsNotEmpty()
  code: string;

  @IsString() @IsNotEmpty()
  name: string;

  @IsUUID() @IsOptional()
  vaccineId?: string;

  @IsEnum(ProductType) @IsOptional()
  type?: ProductType;

  @IsString() @IsOptional()
  description?: string;
}

export class ReceiveLotDto {
  @IsUUID()
  productId: string;

  @IsString() @IsNotEmpty()
  lotNumber: string;

  @IsDateString()
  expiryDate: string;

  @IsDateString() @IsOptional()
  receiptDate?: string;

  @IsInt() @Min(1)
  quantityInitial: number;

  @IsString() @IsOptional()
  manufacturer?: string;

  @IsString() @IsOptional()
  supplier?: string;

  @IsUUID()
  structureId: string;

  @IsEnum(LotStatus) @IsOptional()
  status?: LotStatus;

  @IsString() @IsOptional()
  notes?: string;
}

export class TransferDto {
  @IsUUID()
  lotId: string;

  @IsUUID()
  fromStructureId: string;

  @IsUUID()
  toStructureId: string;

  @IsInt() @Min(1)
  quantity: number;

  @IsString() @IsNotEmpty()
  reason: string;
}

export class AdjustDto {
  @IsUUID()
  lotId: string;

  @IsUUID()
  structureId: string;

  @IsInt()
  newQuantity: number; // quantité théorique corrigée (peut être 0)

  @IsString() @IsNotEmpty()
  reason: string;
}

export class MovementDto {
  @IsUUID()
  lotId: string;

  @IsUUID()
  structureId: string;

  @IsInt() @Min(1)
  quantity: number;

  @IsIn([MovementType.LOSS, MovementType.RETURN, MovementType.QUARANTINE, MovementType.RELEASE])
  type: MovementType;

  @IsString() @IsNotEmpty()
  reason: string;
}

export class CountLineDto {
  @IsUUID()
  lotId: string;

  @IsInt() @Min(0)
  countedQty: number;
}
