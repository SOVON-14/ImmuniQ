import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { ColdChainEquipment } from './cold-chain-equipment.entity';
import { User } from '../../identity/entities/user.entity';

export enum IncidentStatus {
  OPEN = 'open',
  INVESTIGATING = 'investigating',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum IncidentSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum LotDecision {
  QUARANTINE = 'quarantine',
  RELEASE = 'release',
  DISCARD = 'discard',
  PENDING = 'pending',
}

/**
 * Incident de chaîne du froid (M09-F03) — excursion de température.
 * Règle CDC : ImmuniQ constate et trace, la DÉCISION sur les lots
 * (quarantaine / libération / destruction) appartient à l'autorité
 * sanitaire compétente — jamais automatique.
 */
@Entity('cold_chain_incidents')
export class ColdChainIncident {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'equipment_id', type: 'uuid' })
  equipmentId: string;

  @ManyToOne(() => ColdChainEquipment, (e) => e.incidents)
  @JoinColumn({ name: 'equipment_id' })
  equipment: ColdChainEquipment;

  @Column({ name: 'detected_at', type: 'timestamptz' })
  detectedAt: Date;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt: Date;

  @Column({ type: 'enum', enum: IncidentStatus, default: IncidentStatus.OPEN })
  status: IncidentStatus;

  @Column({ type: 'enum', enum: IncidentSeverity, default: IncidentSeverity.MEDIUM })
  severity: IncidentSeverity;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'temp_min_observed', type: 'decimal', precision: 5, scale: 2, nullable: true })
  tempMinObserved: number;

  @Column({ name: 'temp_max_observed', type: 'decimal', precision: 5, scale: 2, nullable: true })
  tempMaxObserved: number;

  @Column({ name: 'required_min_c', type: 'decimal', precision: 5, scale: 2, nullable: true })
  requiredMinC: number;

  @Column({ name: 'required_max_c', type: 'decimal', precision: 5, scale: 2, nullable: true })
  requiredMaxC: number;

  // Décision de l'autorité sur les lots impactés
  @Column({ name: 'lot_decision', type: 'enum', enum: LotDecision, default: LotDecision.PENDING })
  lotDecision: LotDecision;

  @Column({ name: 'decision_reason', type: 'text', nullable: true })
  decisionReason: string;

  @Column({ name: 'decided_by', type: 'uuid', nullable: true })
  decidedBy: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'decided_by' })
  decider: User;

  @Column({ name: 'decided_at', type: 'timestamptz', nullable: true })
  decidedAt: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
