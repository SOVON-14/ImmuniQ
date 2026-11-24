import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, OneToMany,
} from 'typeorm';
import { Territory } from './territory.entity';
import { MobileTeam } from './mobile-team.entity';

export enum StructureType {
  PUBLIC = 'public',
  PRIVATE = 'private',
  MOBILE_TEAM = 'mobile_team',
}

export enum StructureStatus {
  ACTIVE = 'active',
  TEMPORARILY_CLOSED = 'temporarily_closed',
  INACTIVE = 'inactive',
}

/** Établissement de santé (public, privé) ou structure mobile (IMQ-003, M06-F01). */
@Entity('structures')
export class Structure {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: StructureType })
  type: StructureType;

  @Column({ name: 'territory_id', type: 'uuid' })
  territoryId: string;

  @ManyToOne(() => Territory, (t) => t.structures)
  @JoinColumn({ name: 'territory_id' })
  territory: Territory;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ type: 'enum', enum: StructureStatus, default: StructureStatus.ACTIVE })
  status: StructureStatus;

  @Column({ name: 'valid_from', type: 'date', nullable: true })
  validFrom: Date;

  @Column({ name: 'valid_to', type: 'date', nullable: true })
  validTo: Date;

  @OneToMany(() => MobileTeam, (t) => t.structure)
  mobileTeams: MobileTeam[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
