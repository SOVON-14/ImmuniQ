import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { NotificationTemplate, NotificationChannel } from './notification-template.entity';
import { User } from '../../identity/entities/user.entity';

export enum NotificationStatus {
  QUEUED = 'queued',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * Notification envoyée ou en file (M10-F02).
 * `payload` est minimal : identifiants et variables de template,
 * JAMAIS de données médicales (pas de nom de vaccin administré,
 * pas de diagnostic — règle de confidentialité du CDC).
 */
@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'template_id', type: 'uuid', nullable: true })
  templateId: string;

  @ManyToOne(() => NotificationTemplate, { nullable: true })
  @JoinColumn({ name: 'template_id' })
  template: NotificationTemplate;

  @Column({ type: 'enum', enum: NotificationChannel })
  channel: NotificationChannel;

  @Column({ name: 'recipient_ref', nullable: true })
  recipientRef: string; // téléphone, user_id ou beneficiary_id selon le canal

  @Column({ name: 'beneficiary_id', type: 'uuid', nullable: true })
  beneficiaryId: string;

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, unknown>; // variables du template — pas de données de santé

  @Column({ type: 'enum', enum: NotificationStatus, default: NotificationStatus.QUEUED })
  status: NotificationStatus;

  @Column({ name: 'scheduled_at', type: 'timestamptz', nullable: true })
  scheduledAt: Date;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt: Date;

  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true })
  deliveredAt: Date;

  @Column({ type: 'text', nullable: true })
  error: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
