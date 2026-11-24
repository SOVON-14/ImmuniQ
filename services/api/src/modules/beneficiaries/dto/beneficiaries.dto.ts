import { IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString, IsUUID } from 'class-validator';
import { BeneficiarySex } from '../entities/beneficiary.entity';
import { RepresentativeLinkType } from '../entities/legal-representative.entity';

export class CreateBeneficiaryDto {
  @IsString() @IsNotEmpty()
  firstName: string;

  @IsString() @IsNotEmpty()
  lastName: string;

  @IsDateString() @IsOptional()
  birthDate?: string;

  @IsEnum(BeneficiarySex) @IsOptional()
  sex?: BeneficiarySex;

  @IsString() @IsOptional()
  phone?: string;

  @IsString() @IsOptional()
  commune?: string;

  @IsString() @IsOptional()
  address?: string;

  @IsUUID() @IsOptional()
  originStructureId?: string;

  @IsString() @IsOptional()
  createdVia?: string;
}

export class UpdateBeneficiaryDto {
  @IsString() @IsOptional() firstName?: string;
  @IsString() @IsOptional() lastName?: string;
  @IsDateString() @IsOptional() birthDate?: string;
  @IsEnum(BeneficiarySex) @IsOptional() sex?: BeneficiarySex;
  @IsString() @IsOptional() phone?: string;
  @IsString() @IsOptional() commune?: string;
  @IsString() @IsOptional() address?: string;
}

export class CreateRepresentativeDto {
  @IsString() @IsNotEmpty()
  fullName: string;

  @IsString() @IsOptional()
  phone?: string;

  @IsEnum(RepresentativeLinkType)
  linkType: RepresentativeLinkType;

  @IsString() @IsOptional()
  authorityBasis?: string;

  @IsUUID() @IsOptional()
  userId?: string;
}

export class LinkRepresentativeDto {
  @IsUUID()
  representativeId: string;

  @IsOptional()
  rights?: Record<string, boolean>;
}
