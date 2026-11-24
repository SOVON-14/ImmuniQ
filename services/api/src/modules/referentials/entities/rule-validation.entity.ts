import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { Referential } from './referential.entity';
import { User } from '../../identity/entities/user.entity';

export enum ValidationDecision {
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

/** Journal des validations d'un référentiel (M04-F04). */
@Entity('rule_validations')
export class RuleValidation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'referential_id', type: 'uuid' })
  referentialId: string;

  @ManyToOne(() => Referential, (r) => r.validations)
  @JoinColumn({ name: 'referential_id' })
  referential: Referential;

  @Column({ name: 'actor_id', type: 'uuid' })
  actorId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'actor_id' })
  actor: User;

  @Column({ type: 'enum', enum: ValidationDecision })
  decision: ValidationDecision;

  @Column({ type: 'text', nullable: true })
  comment: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
