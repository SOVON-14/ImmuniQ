import {
  IsString, IsNotEmpty, IsOptional, IsEnum, IsBoolean, IsUUID, IsDateString, IsObject,
} from 'class-validator';
import { NotificationChannel } from '../entities/notification-template.entity';
import { NotificationStatus } from '../entities/notification.entity';

export class CreateTemplateDto {
  @IsString() @IsNotEmpty()
  code: string;

  @IsString() @IsNotEmpty()
  name: string;

  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @IsString() @IsOptional()
  subject?: string;

  @IsString() @IsNotEmpty()
  body: string;

  @IsString() @IsOptional()
  locale?: string;
}

export class UpdatePreferenceDto {
  @IsBoolean()
  optedIn: boolean;

  @IsString() @IsOptional()
  phoneOverride?: string;
}

export class SendNotificationDto {
  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @IsString() @IsNotEmpty()
  recipientRef: string;

  @IsUUID() @IsOptional()
  beneficiaryId?: string;

  @IsObject() @IsOptional()
  payload?: Record<string, unknown>;

  @IsDateString() @IsOptional()
  scheduledAt?: string;
}

export class ListNotificationsQuery {
  @IsEnum(NotificationStatus) @IsOptional()
  status?: NotificationStatus;

  @IsEnum(NotificationChannel) @IsOptional()
  channel?: NotificationChannel;

  @IsUUID() @IsOptional()
  beneficiaryId?: string;
}
