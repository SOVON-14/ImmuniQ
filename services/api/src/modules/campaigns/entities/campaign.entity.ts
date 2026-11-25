import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, OneToMany,
} from 'typeorm';
import { Territory } from '../../org/entities/territory.entity';
import { Structure } from '../../org/entities/structure.entity';
import { Referential } from '../../referentials/entities/referential.entity';
import { User } from '../../identity/entities/user.entity';
import { CampaignSession } from './campaign-session.entity';

export enum CampaignType {
  ROUTINE = 'routine',
  CATCHUP = 'catchup',
  CAMPAIGN = 'campaign', // campagne spéciale (PI, VPO…)
  OUTBREAK_RESPONSE = 'outbreak_response',
}

export enum CampaignStatus {
  DRAFT = 'draft',
  PLANNED = 'planned',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

/** Campagne de vaccination (M07-F01). */
@Entity('campaigns')
export class Campaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: CampaignType, default: CampaignType.CAMPAIGN })
  type: CampaignType;

  @Column({ name: 'referential_id', type: 'uuid', nullable: true })
  referentialId: string; // version du référentiel 'campaign' appliquée

  @ManyToOne(() => Referential, { nullable: true })
  @JoinColumn({ name: 'referential_id' })
  referential: Referential;

  @Column({ name: 'territory_id', type: 'uuid', nullable: true })
  territoryId: string;

  @ManyToOne(() => Territory, { nullable: true })
  @JoinColumn({ name: 'territory_id' })
  territory: Territory;

  @Column({ name: 'structure_id', type: 'uuid', nullable: true })
  structureId: string; // structure coordinatrice (null = campagne nationale)

  @ManyToOne(() => Structure, { nullable: true })
  @JoinColumn({ name: 'structure_id' })
  structure: Structure;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate: Date;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: Date;

  @Column({ name: 'target_population', type: 'text', nullable: true })
  targetPopulation: string;

  @Column({ type: 'text', nullable: true })
  objectives: string;

  @Column({ type: 'enum', enum: CampaignStatus, default: CampaignStatus.DRAFT })
  status: CampaignStatus;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @OneToMany(() => CampaignSession, (s) => s.campaign)
  sessions: CampaignSession[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
