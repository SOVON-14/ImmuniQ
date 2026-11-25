import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
} from 'typeorm';

export enum SyncOpStatus {
  APPLIED = 'applied',
  DUPLICATE = 'duplicate',
  REJECTED = 'rejected',
}

export enum SyncOpType {
  BENEFICIARY_CREATE = 'beneficiary.create',
  BENEFICIARY_UPDATE = 'beneficiary.update',
  ACT_CREATE = 'act.create',
  ACT_UPDATE = 'act.update',
  ACT_TRANSITION = 'act.transition',
  ADVERSE_EVENT_DECLARE = 'adverse_event.declare',
}

/**
 * Journal des opérations de synchronisation (M12).
 * `opId` est généré par le client hors ligne : unique → un rejeu réseau
 * ne crée jamais de doublon métier. `result` mémorise la réponse pour
 * que les rejeux retournent exactement le même résultat.
 */
@Entity('sync_operations')
export class SyncOperation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'op_id', unique: true })
  opId: string;

  @Column({ name: 'device_id', nullable: true })
  deviceId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar' })
  type: SyncOpType;

  @Column({ name: 'entity_id', type: 'uuid', nullable: true })
  entityId: string;

  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;

  @Column({ type: 'enum', enum: SyncOpStatus })
  status: SyncOpStatus;

  @Column({ type: 'jsonb', nullable: true })
  result: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  error: string;

  @Column({ name: 'client_timestamp', type: 'timestamptz', nullable: true })
  clientTimestamp: Date;

  @Column({ name: 'processed_at', type: 'timestamptz' })
  processedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
