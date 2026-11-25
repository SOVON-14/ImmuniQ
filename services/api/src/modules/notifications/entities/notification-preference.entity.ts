import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { Beneficiary } from '../../beneficiaries/entities/beneficiary.entity';
import { NotificationChannel } from './notification-template.entity';

/**
 * Préférences et consentements du bénéficiaire (M10-F03).
 * Pas d'opt-in = pas d'envoi sur ce canal. Traçable et révocable.
 */
@Entity('notification_preferences')
export class NotificationPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'beneficiary_id', type: 'uuid' })
  beneficiaryId: string;

  @ManyToOne(() => Beneficiary)
  @JoinColumn({ name: 'beneficiary_id' })
  beneficiary: Beneficiary;

  @Column({ type: 'enum', enum: NotificationChannel })
  channel: NotificationChannel;

  @Column({ name: 'opted_in', default: false })
  optedIn: boolean;

  @Column({ name: 'phone_override', nullable: true })
  phoneOverride: string; // numéro différent du dossier si consentement

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
