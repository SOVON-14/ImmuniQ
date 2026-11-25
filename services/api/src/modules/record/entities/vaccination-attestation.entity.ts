import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Beneficiary } from '../../beneficiaries/entities/beneficiary.entity';
import { User } from '../../identity/entities/user.entity';

export enum AttestationStatus {
  ISSUED = 'issued',
  REVOKED = 'revoked',
}

/**
 * Attestation de vaccination délivrée (M03).
 * Le contenu est figé au moment de la délivrance (snapshot JSON) :
 * une modification ultérieure du dossier ne réécrit pas les attestations passées.
 */
@Entity('vaccination_attestations')
export class VaccinationAttestation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  reference: string; // ex. ATT-XXXXXXXX

  @Column({ name: 'beneficiary_id', type: 'uuid' })
  beneficiaryId: string;

  @ManyToOne(() => Beneficiary)
  @JoinColumn({ name: 'beneficiary_id' })
  beneficiary: Beneficiary;

  @Column({ name: 'issued_by', type: 'uuid' })
  issuedBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'issued_by' })
  issuer: User;

  @Column({ name: 'issued_at', type: 'timestamptz' })
  issuedAt: Date;

  @Column({ type: 'jsonb' })
  content: Record<string, unknown>; // snapshot : identité + doses administrées + règles appliquées

  @Column({ type: 'enum', enum: AttestationStatus, default: AttestationStatus.ISSUED })
  status: AttestationStatus;

  @Column({ name: 'revoke_reason', type: 'text', nullable: true })
  revokeReason: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
