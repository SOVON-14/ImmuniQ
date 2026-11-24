import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum AssignmentType {
  PERMANENT = 'permanent',
  TEMPORARY = 'temporary',
}

/**
 * Rattachement / affectation d'un utilisateur à une structure ou une équipe.
 * Les ids structure/territoire sont des uuid tant que le module `org` (M06)
 * n'expose pas ses entités ; les FK seront ajoutées lors de son implémentation.
 */
@Entity('assignments')
export class Assignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, (u) => u.assignments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'structure_id', type: 'uuid', nullable: true })
  structureId: string;

  @Column({ name: 'team_id', type: 'uuid', nullable: true })
  teamId: string;

  @Column({ name: 'territory_id', type: 'uuid', nullable: true })
  territoryId: string;

  @Column({ type: 'enum', enum: AssignmentType, default: AssignmentType.PERMANENT })
  type: AssignmentType;

  @Column({ name: 'is_primary', default: false })
  isPrimary: boolean;

  @Column({ name: 'starts_at', type: 'timestamptz' })
  startsAt: Date;

  @Column({ name: 'ends_at', type: 'timestamptz', nullable: true })
  endsAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  responsibilities: Record<string, unknown>;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
