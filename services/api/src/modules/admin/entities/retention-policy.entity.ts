import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

/** Politique de conservation des données (M13-F03) — base légale requise. */
@Entity('retention_policies')
export class RetentionPolicy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'data_type', unique: true })
  dataType: string; // ex. audit_log, vaccination_acts, beneficiaries, notifications

  @Column({ name: 'retention_days', type: 'int' })
  retentionDays: number;

  @Column({ name: 'legal_basis', type: 'text', nullable: true })
  legalBasis: string;

  @Column({ default: true })
  active: boolean;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
