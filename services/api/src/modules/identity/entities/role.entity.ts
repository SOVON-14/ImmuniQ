import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToMany, JoinTable, OneToMany,
} from 'typeorm';
import { Permission } from './permission.entity';
import { User } from './user.entity';

export enum RoleCode {
  NATIONAL_ADMIN = 'national_admin',
  HEALTH_AUTHORITY = 'health_authority',
  FACILITY_MANAGER = 'facility_manager',
  STOCK_MANAGER = 'stock_manager',
  VACCINATOR = 'vaccinator',
  CAMPAIGN_AGENT = 'campaign_agent',
  MOBILE_TEAM_LEADER = 'mobile_team_leader',
  BENEFICIARY = 'beneficiary',
  LEGAL_REPRESENTATIVE = 'legal_representative',
}

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: RoleCode;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @ManyToMany(() => Permission, (p) => p.roles, { eager: true })
  @JoinTable({ name: 'role_permissions' })
  permissions: Permission[];

  @OneToMany(() => User, (u) => u.role)
  users: User[];

  @CreateDateColumn()
  createdAt: Date;
}
