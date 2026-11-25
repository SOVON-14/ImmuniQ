import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export enum NotificationChannel {
  SMS = 'sms',
  PUSH = 'push',
  PORTAL = 'portal',
  EMAIL = 'email',
}

/**
 * Modèle de message (M10-F01). Le corps contient des variables
 * ({{name}}, {{date}}…) remplacées à l'envoi. Pas de données de santé
 * dans les notifications — uniquement des rappels génériques.
 */
@Entity('notification_templates')
export class NotificationTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string; // ex. vaccination_reminder, campaign_announce

  @Column()
  name: string;

  @Column({ type: 'enum', enum: NotificationChannel })
  channel: NotificationChannel;

  @Column({ nullable: true })
  subject: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'varchar', default: 'fr' })
  locale: string;

  @Column({ default: true })
  active: boolean;

  @Column({ type: 'int', default: 1 })
  version: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
