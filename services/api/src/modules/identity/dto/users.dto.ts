import {
  IsString, IsNotEmpty, IsEmail, IsOptional, IsEnum, IsUUID, MinLength,
} from 'class-validator';
import { RoleCode } from '../entities/role.entity';
import { UserStatus } from '../entities/user.entity';

export class CreateUserDto {
  @IsString() @IsNotEmpty()
  username: string;

  @IsString() @MinLength(10)
  password: string;

  @IsEmail() @IsOptional()
  email?: string;

  @IsString() @IsOptional()
  phone?: string;

  @IsString() @IsNotEmpty()
  firstName: string;

  @IsString() @IsNotEmpty()
  lastName: string;

  @IsEnum(RoleCode)
  roleCode: RoleCode;

  /** Rattachement principal (facultatif à la création, ajoutable ensuite). */
  @IsUUID() @IsOptional()
  structureId?: string;

  @IsUUID() @IsOptional()
  territoryId?: string;
}

export class UpdateUserStatusDto {
  @IsEnum(UserStatus)
  status: UserStatus;

  @IsString() @IsOptional()
  reason?: string;
}

export class AssignScopeDto {
  @IsUUID() @IsOptional()
  structureId?: string;

  @IsUUID() @IsOptional()
  teamId?: string;

  @IsUUID() @IsOptional()
  territoryId?: string;

  @IsString() @IsOptional()
  type?: 'permanent' | 'temporary';

  @IsString() @IsOptional()
  startsAt?: string;

  @IsString() @IsOptional()
  endsAt?: string;

  @IsOptional()
  isPrimary?: boolean;
}
