import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from '../../identity/entities/user.entity';

export enum BackupType {
  FULL = 'full',
  INCREMENTAL = 'incremental',
}

export enum BackupStatus {
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/** Journal des sauvegardes (M13-F04). Le déclenchement réel est stubé en MVP. */
@Entity('backup_records')
export class BackupRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: BackupType, default: BackupType.FULL })
  type: BackupType;

  @Column({ type: 'enum', enum: BackupStatus, default: BackupStatus.RUNNING })
  status: BackupStatus;

  @Column({ name: 'size_bytes', type: 'bigint', nullable: true })
  sizeBytes: number;

  @Column({ name: 'storage_ref', nullable: true })
  storageRef: string; // référence coffre/stockage chiffré

  @Column({ name: 'triggered_by', type: 'uuid', nullable: true })
  triggeredBy: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'triggered_by' })
  trigger: User;

  @Column({ type: 'text', nullable: true })
  error: string;

  @CreateDateColumn({ name: 'started_at' })
  startedAt: Date;

  @Column({ name: 'finished_at', type: 'timestamptz', nullable: true })
  finishedAt: Date;
}
