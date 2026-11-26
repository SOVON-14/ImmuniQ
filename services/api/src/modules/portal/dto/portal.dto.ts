import { IsDateString, IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { NotificationChannel } from '../../notifications/entities/notification-template.entity';

export class LinkBeneficiaryDto {
  @IsString()
  @Matches(/^IMQ-[A-Z0-9-]+$/i, { message: 'immuniqId invalide (format IMQ-…)' })
  immuniqId: string;

  @IsDateString({}, { message: 'birthDate invalide (AAAA-MM-JJ)' })
  birthDate: string;
}

export class UpdatePreferenceDto {
  @IsIn(['sms', 'push', 'portal', 'email'])
  channel: NotificationChannel;

  @IsOptional()
  optedIn?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phoneOverride?: string;
}
