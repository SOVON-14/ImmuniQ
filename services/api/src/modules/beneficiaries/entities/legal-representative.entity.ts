import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from '../../identity/entities/user.entity';

export enum RepresentativeLinkType {
  PARENT = 'parent',
  GUARDIAN = 'guardian',
  LEGAL_REPRESENTATIVE = 'legal_representative',
  OTHER = 'other',
}

export enum RepresentativeStatus {
  ACTIVE = 'active',
  REVOKED = 'revoked',
  EXPIRED = 'expired',
}

/** Parent ou représentant légal d'un bénéficiaire (M02-F04). */
@Entity('legal_representatives')
export class LegalRepresentative {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string; // compte portail éventuel

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'full_name' })
  fullName: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ name: 'link_type', type: 'enum', enum: RepresentativeLinkType })
  linkType: RepresentativeLinkType;

  @Column({ name: 'authority_basis', type: 'text', nullable: true })
  authorityBasis: string; // base de l'autorité (jugement, déclaration…)

  @Column({ name: 'valid_from', type: 'date', nullable: true })
  validFrom: Date;

  @Column({ name: 'valid_to', type: 'date', nullable: true })
  validTo: Date;

  @Column({ type: 'enum', enum: RepresentativeStatus, default: RepresentativeStatus.ACTIVE })
  status: RepresentativeStatus;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
