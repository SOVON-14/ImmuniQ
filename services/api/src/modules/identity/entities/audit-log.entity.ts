import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum AuditResult {
  SUCCESS = 'success',
  FAILURE = 'failure',
  DENIED = 'denied',
}

@Entity('audit_log')
@Index(['createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId: string;

  @Column()
  action: string;

  @Column({ name: 'resource_type', nullable: true })
  resourceType: string;

  @Column({ name: 'resource_id', type: 'uuid', nullable: true })
  resourceId: string;

  @Column({ type: 'jsonb', nullable: true })
  details: Record<string, unknown>;

  @Column({ nullable: true })
  ip: string;

  @Column({ name: 'user_agent', nullable: true })
  userAgent: string;

  @Column({ type: 'enum', enum: AuditResult, default: AuditResult.SUCCESS })
  result: AuditResult;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
