import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { VaccinationAct } from './vaccination-act.entity';
import { User } from '../../identity/entities/user.entity';

/**
 * Correction tracée d'un acte (M05). Jamais d'effacement : chaque modification
 * d'un champ est historisée avec ancienne/nouvelle valeur et motif.
 */
@Entity('act_corrections')
export class ActCorrection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'act_id', type: 'uuid' })
  actId: string;

  @ManyToOne(() => VaccinationAct, (a) => a.corrections)
  @JoinColumn({ name: 'act_id' })
  act: VaccinationAct;

  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'actor_id' })
  actor: User;

  @Column()
  field: string;

  @Column({ name: 'old_value', type: 'text', nullable: true })
  oldValue: string;

  @Column({ name: 'new_value', type: 'text', nullable: true })
  newValue: string;

  @Column({ type: 'text' })
  reason: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
