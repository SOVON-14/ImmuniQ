import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, OneToMany, JoinColumn,
} from 'typeorm';
import { User } from '../../identity/entities/user.entity';
import { Structure } from '../../org/entities/structure.entity';
import { RepresentationLink } from './representation-link.entity';

export enum BeneficiaryStatus {
  ACTIVE = 'active',
  TO_VERIFY = 'to_verify',
  MERGED = 'merged',
  ARCHIVED = 'archived',
  FLAGGED = 'flagged',
}

export enum BeneficiarySex {
  MALE = 'male',
  FEMALE = 'female',
  UNKNOWN = 'unknown',
}

/**
 * Dossier bénéficiaire ImmuniQ (M02).
 * immuniqId : identifiant interne permanent, généré automatiquement, jamais réattribué.
 */
@Entity('beneficiaries')
export class Beneficiary {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'immuniq_id', unique: true })
  immuniqId: string; // format IMQ-XXXXXXXX

  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'last_name' })
  lastName: string;

  @Column({ name: 'birth_date', type: 'date', nullable: true })
  birthDate: Date;

  @Column({ type: 'enum', enum: BeneficiarySex, default: BeneficiarySex.UNKNOWN })
  sex: BeneficiarySex;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  commune: string;

  @Column({ nullable: true })
  address: string;

  @Column({ type: 'enum', enum: BeneficiaryStatus, default: BeneficiaryStatus.ACTIVE })
  status: BeneficiaryStatus;

  @Column({ name: 'merged_into_id', type: 'uuid', nullable: true })
  mergedIntoId: string;

  @Column({ name: 'origin_structure_id', type: 'uuid', nullable: true })
  originStructureId: string;

  @ManyToOne(() => Structure, { nullable: true })
  @JoinColumn({ name: 'origin_structure_id' })
  originStructure: Structure;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string;

  @Column({ name: 'created_via', type: 'varchar', default: 'professional_portal' })
  createdVia: string; // professional_portal / self_service / import / campaign

  @OneToMany(() => RepresentationLink, (l) => l.beneficiary)
  representationLinks: RepresentationLink[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
