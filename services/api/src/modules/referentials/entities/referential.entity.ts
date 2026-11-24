import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany,
} from 'typeorm';
import { VaccinationRule } from './vaccination-rule.entity';
import { RuleValidation } from './rule-validation.entity';

export enum ReferentialType {
  ROUTINE_CALENDAR = 'routine_calendar',
  CAMPAIGN = 'campaign',
  CATCHUP = 'catchup',
  SPECIFIC = 'specific',
}

export enum ReferentialStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  PUBLISHED = 'published',
  WITHDRAWN = 'withdrawn',
  ARCHIVED = 'archived',
}

/**
 * Version d'un référentiel vaccinal (M04-F03).
 * Jamais d'écrasement : une évolution = nouvelle ligne `version` incrémentée.
 * Seule la version `published` est utilisée pour les calculs d'échéances.
 */
@Entity('referentials')
export class Referential {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: ReferentialType })
  type: ReferentialType;

  @Column({ type: 'int' })
  version: number;

  @Column({ type: 'enum', enum: ReferentialStatus, default: ReferentialStatus.DRAFT })
  status: ReferentialStatus;

  @Column({ name: 'source_official' })
  sourceOfficial: string; // source officielle (PnEV, OMS…)

  @Column({ name: 'effective_from', type: 'date' })
  effectiveFrom: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string;

  @Column({ name: 'submitted_by', type: 'uuid', nullable: true })
  submittedBy: string;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy: string;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @OneToMany(() => VaccinationRule, (r) => r.referential)
  rules: VaccinationRule[];

  @OneToMany(() => RuleValidation, (v) => v.referential)
  validations: RuleValidation[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
