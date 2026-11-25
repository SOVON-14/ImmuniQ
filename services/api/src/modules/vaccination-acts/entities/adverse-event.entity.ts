import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { VaccinationAct } from './vaccination-act.entity';
import { Beneficiary } from '../../beneficiaries/entities/beneficiary.entity';
import { User } from '../../identity/entities/user.entity';

export enum AdverseEventSeverity {
  MILD = 'mild',
  MODERATE = 'moderate',
  SEVERE = 'severe',
}

export enum AdverseEventStatus {
  DECLARED = 'declared',
  INVESTIGATING = 'investigating',
  CLOSED = 'closed',
}

/** Déclaration d'effet indésirable (M05 / pharmacovigilance). */
@Entity('adverse_events')
export class AdverseEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'act_id', type: 'uuid', nullable: true })
  actId: string;

  @ManyToOne(() => VaccinationAct, { nullable: true })
  @JoinColumn({ name: 'act_id' })
  act: VaccinationAct;

  @Column({ name: 'beneficiary_id', type: 'uuid' })
  beneficiaryId: string;

  @ManyToOne(() => Beneficiary)
  @JoinColumn({ name: 'beneficiary_id' })
  beneficiary: Beneficiary;

  @Column({ name: 'declared_by', type: 'uuid' })
  declaredBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'declared_by' })
  declarant: User;

  @Column({ type: 'enum', enum: AdverseEventSeverity })
  severity: AdverseEventSeverity;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'occurred_at', type: 'timestamptz', nullable: true })
  occurredAt: Date;

  @Column({ type: 'enum', enum: AdverseEventStatus, default: AdverseEventStatus.DECLARED })
  status: AdverseEventStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
