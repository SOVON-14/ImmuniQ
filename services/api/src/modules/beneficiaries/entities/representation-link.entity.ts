import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { Beneficiary } from './beneficiary.entity';
import { LegalRepresentative } from './legal-representative.entity';

/**
 * Association bénéficiaire ↔ représentant avec droits différenciés (IMQ-013).
 * L'accès du représentant ne supprime jamais l'identité du bénéficiaire.
 */
@Entity('representation_links')
export class RepresentationLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'beneficiary_id', type: 'uuid' })
  beneficiaryId: string;

  @ManyToOne(() => Beneficiary, (b) => b.representationLinks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'beneficiary_id' })
  beneficiary: Beneficiary;

  @Column({ name: 'representative_id', type: 'uuid' })
  representativeId: string;

  @ManyToOne(() => LegalRepresentative, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'representative_id' })
  representative: LegalRepresentative;

  @Column({ type: 'jsonb', nullable: true })
  rights: Record<string, boolean>; // read / notifications / acts?

  @Column({ name: 'granted_by', type: 'uuid', nullable: true })
  grantedBy: string;

  @CreateDateColumn({ name: 'granted_at' })
  grantedAt: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt: Date;

  @Column({ name: 'revoke_reason', type: 'text', nullable: true })
  revokeReason: string | null;
}
