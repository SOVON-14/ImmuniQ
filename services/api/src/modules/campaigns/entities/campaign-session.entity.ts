import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Campaign } from './campaign.entity';
import { Structure } from '../../org/entities/structure.entity';
import { MobileTeam } from '../../org/entities/mobile-team.entity';
import { User } from '../../identity/entities/user.entity';

export enum SessionStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

/** Séance de vaccination dans le cadre d'une campagne (M07-F02). */
@Entity('campaign_sessions')
export class CampaignSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'campaign_id', type: 'uuid' })
  campaignId: string;

  @ManyToOne(() => Campaign, (c) => c.sessions)
  @JoinColumn({ name: 'campaign_id' })
  campaign: Campaign;

  @Column({ name: 'structure_id', type: 'uuid', nullable: true })
  structureId: string;

  @ManyToOne(() => Structure, { nullable: true })
  @JoinColumn({ name: 'structure_id' })
  structure: Structure;

  @Column({ name: 'mobile_team_id', type: 'uuid', nullable: true })
  mobileTeamId: string;

  @ManyToOne(() => MobileTeam, { nullable: true })
  @JoinColumn({ name: 'mobile_team_id' })
  mobileTeam: MobileTeam;

  @Column({ name: 'scheduled_at', type: 'timestamptz', nullable: true })
  scheduledAt: Date;

  @Column({ name: 'actual_start', type: 'timestamptz', nullable: true })
  actualStart: Date;

  @Column({ name: 'actual_end', type: 'timestamptz', nullable: true })
  actualEnd: Date;

  @Column({ type: 'varchar', nullable: true })
  location: string; // village, école, site mobile…

  @Column({ type: 'enum', enum: SessionStatus, default: SessionStatus.SCHEDULED })
  status: SessionStatus;

  @Column({ name: 'supervisor_id', type: 'uuid', nullable: true })
  supervisorId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'supervisor_id' })
  supervisor: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
