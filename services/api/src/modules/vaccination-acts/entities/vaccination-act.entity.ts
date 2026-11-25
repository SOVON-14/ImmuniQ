import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, OneToMany,
} from 'typeorm';
import { Beneficiary } from '../../beneficiaries/entities/beneficiary.entity';
import { Vaccine } from '../../referentials/entities/vaccine.entity';
import { VaccinePresentation } from '../../referentials/entities/vaccine-presentation.entity';
import { Referential } from '../../referentials/entities/referential.entity';
import { VaccinationRule } from '../../referentials/entities/vaccination-rule.entity';
import { Structure } from '../../org/entities/structure.entity';
import { User } from '../../identity/entities/user.entity';
import { ActCorrection } from './act-correction.entity';

export enum ActStatus {
  PLANNED = 'planned',
  ADMINISTERED = 'administered',
  NOT_PERFORMED = 'not_performed',
  CANCELLED = 'cancelled',
}

export enum ActSource {
  ONLINE = 'online',
  OFFLINE_SYNC = 'offline_sync',
}

/**
 * Acte vaccinal (M05) — cœur du système.
 * - localId : identifiant généré hors ligne, garantit l'idempotence de la synchronisation (M12).
 * - ruleId/referentialId : version du référentiel utilisée → traçabilité des règles appliquées.
 * - Un acte "not_performed" ou "cancelled" n'est jamais comptabilisé comme dose administrée.
 */
@Entity('vaccination_acts')
export class VaccinationAct {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'local_id', unique: true, nullable: true })
  localId: string; // UUID généré par le client hors ligne

  @Column({ name: 'beneficiary_id', type: 'uuid' })
  beneficiaryId: string;

  @ManyToOne(() => Beneficiary)
  @JoinColumn({ name: 'beneficiary_id' })
  beneficiary: Beneficiary;

  @Column({ name: 'vaccine_id', type: 'uuid' })
  vaccineId: string;

  @ManyToOne(() => Vaccine)
  @JoinColumn({ name: 'vaccine_id' })
  vaccine: Vaccine;

  @Column({ name: 'presentation_id', type: 'uuid', nullable: true })
  presentationId: string;

  @ManyToOne(() => VaccinePresentation, { nullable: true })
  @JoinColumn({ name: 'presentation_id' })
  presentation: VaccinePresentation;

  @Column({ name: 'dose_number', type: 'int' })
  doseNumber: number;

  @Column({ name: 'rule_id', type: 'uuid', nullable: true })
  ruleId: string;

  @ManyToOne(() => VaccinationRule, { nullable: true })
  @JoinColumn({ name: 'rule_id' })
  rule: VaccinationRule;

  @Column({ name: 'referential_id', type: 'uuid', nullable: true })
  referentialId: string; // version du référentiel appliquée

  @Column({ name: 'administered_at', type: 'timestamptz', nullable: true })
  administeredAt: Date;

  @Column({ name: 'structure_id', type: 'uuid', nullable: true })
  structureId: string;

  @ManyToOne(() => Structure, { nullable: true })
  @JoinColumn({ name: 'structure_id' })
  structure: Structure;

  @Column({ name: 'vaccinator_id', type: 'uuid', nullable: true })
  vaccinatorId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'vaccinator_id' })
  vaccinator: User;

  @Column({ name: 'campaign_id', type: 'uuid', nullable: true })
  campaignId: string;

  @Column({ name: 'lot_id', type: 'uuid', nullable: true })
  lotId: string; // FK vers lots ajoutée avec M08

  @Column({ name: 'lot_number', nullable: true })
  lotNumber: string;

  @Column({ type: 'varchar', nullable: true })
  site: string;

  @Column({ type: 'varchar', nullable: true })
  route: string;

  @Column({ type: 'enum', enum: ActStatus, default: ActStatus.PLANNED })
  status: ActStatus;

  @Column({ type: 'enum', enum: ActSource, default: ActSource.ONLINE })
  source: ActSource;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'cancel_reason', type: 'text', nullable: true })
  cancelReason: string;

  @Column({ name: 'validated_by', type: 'uuid', nullable: true })
  validatedBy: string;

  @Column({ name: 'validated_at', type: 'timestamptz', nullable: true })
  validatedAt: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string;

  @OneToMany(() => ActCorrection, (c) => c.act)
  corrections: ActCorrection[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
