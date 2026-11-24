import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { Structure } from './structure.entity';
import { Territory } from './territory.entity';

/**
 * Équipe mobile de vaccination (M06-F03) : composition, zone d'intervention,
 * période d'activité. Les membres sont gérés via `assignments` (identity).
 */
@Entity('mobile_teams')
export class MobileTeam {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'structure_id', type: 'uuid', nullable: true })
  structureId: string;

  @ManyToOne(() => Structure, (s) => s.mobileTeams, { nullable: true })
  @JoinColumn({ name: 'structure_id' })
  structure: Structure;

  @Column()
  name: string;

  @Column({ name: 'zone_territory_id', type: 'uuid', nullable: true })
  zoneTerritoryId: string;

  @ManyToOne(() => Territory, { nullable: true })
  @JoinColumn({ name: 'zone_territory_id' })
  zoneTerritory: Territory;

  @Column({ name: 'leader_user_id', type: 'uuid', nullable: true })
  leaderUserId: string;

  @Column({ name: 'vehicle_info', type: 'text', nullable: true })
  vehicleInfo: string;

  @Column({ type: 'jsonb', nullable: true })
  equipment: Record<string, unknown>; // vaccins, chaîne du froid embarquée…

  @Column({ default: 'active' })
  status: string; // active / inactive / on_mission

  @Column({ name: 'active_from', type: 'date', nullable: true })
  activeFrom: Date;

  @Column({ name: 'active_to', type: 'date', nullable: true })
  activeTo: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
