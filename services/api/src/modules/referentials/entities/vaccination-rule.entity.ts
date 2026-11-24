import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
} from 'typeorm';
import { Referential } from './referential.entity';
import { Vaccine } from './vaccine.entity';

export enum RuleContext {
  ROUTINE = 'routine',
  CAMPAIGN = 'campaign',
  CATCHUP = 'catchup',
  SPECIFIC = 'specific',
}

/**
 * Règle vaccinale : tranche d'âge, dose, intervalle, contexte (M04-F02/F05).
 * Les valeurs sont des paramètres validés — jamais de logique médicale en dur.
 */
@Entity('vaccination_rules')
export class VaccinationRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'referential_id', type: 'uuid' })
  referentialId: string;

  @ManyToOne(() => Referential, (r) => r.rules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'referential_id' })
  referential: Referential;

  @Column({ name: 'vaccine_id', type: 'uuid' })
  vaccineId: string;

  @ManyToOne(() => Vaccine)
  @JoinColumn({ name: 'vaccine_id' })
  vaccine: Vaccine;

  @Column({ name: 'dose_number', type: 'int' })
  doseNumber: number;

  @Column({ name: 'min_age_days', type: 'int', nullable: true })
  minAgeDays: number;

  @Column({ name: 'max_age_days', type: 'int', nullable: true })
  maxAgeDays: number;

  @Column({ name: 'min_interval_days', type: 'int', nullable: true })
  minIntervalDays: number;

  @Column({ type: 'enum', enum: RuleContext })
  context: RuleContext;

  @Column({ name: 'contraindication_flags', type: 'jsonb', nullable: true })
  contraindicationFlags: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  notes: string;
}
