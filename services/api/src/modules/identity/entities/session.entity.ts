import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Device } from './device.entity';

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, (u) => u.sessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'device_id', type: 'uuid', nullable: true })
  deviceId: string;

  @ManyToOne(() => Device, { nullable: true })
  @JoinColumn({ name: 'device_id' })
  device: Device;

  @Column({ nullable: true })
  ip: string;

  @Column({ name: 'user_agent', nullable: true })
  userAgent: string;

  @Column({ name: 'refresh_token_hash', nullable: true })
  refreshTokenHash: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'last_activity_at', type: 'timestamptz' })
  lastActivityAt: Date;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt: Date;

  @Column({ name: 'revoke_reason', nullable: true })
  revokeReason: string;
}
