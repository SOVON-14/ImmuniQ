import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from '../../identity/entities/user.entity';
import { Beneficiary } from '../../beneficiaries/entities/beneficiary.entity';

export enum PortalLinkStatus {
  ACTIVE = 'active',
  REVOKED = 'revoked',
}

export enum PortalLinkVia {
  IMMUNIQ_ID_BIRTHDATE = 'immuniq_id_birthdate',
}

/**
 * Lien vérifié entre un compte portail (rôle beneficiary / legal_representative)
 * et un dossier bénéficiaire. Créé après vérification d'identité
 * (IMQ-id + date de naissance). Une seule liaison active par couple.
 */
@Entity('portal_links')
export class PortalLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'beneficiary_id', type: 'uuid' })
  beneficiaryId: string;

  @ManyToOne(() => Beneficiary)
  @JoinColumn({ name: 'beneficiary_id' })
  beneficiary: Beneficiary;

  @Column({ name: 'verified_via', type: 'varchar' })
  verifiedVia: PortalLinkVia;

  @Column({ type: 'enum', enum: PortalLinkStatus, default: PortalLinkStatus.ACTIVE })
  status: PortalLinkStatus;

  @Column({ name: 'verified_at', type: 'timestamptz' })
  verifiedAt: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
