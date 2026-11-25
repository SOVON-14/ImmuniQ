import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Lot } from './lot.entity';
import { Product } from './product.entity';
import { Structure } from '../../org/entities/structure.entity';
import { User } from '../../identity/entities/user.entity';

export enum MovementType {
  RECEIPT = 'receipt',          // entrée : réception fournisseur
  TRANSFER_OUT = 'transfer_out',// sortie : envoi vers une autre structure
  TRANSFER_IN = 'transfer_in',  // entrée : réception d'un transfert
  ADMINISTRATION = 'administration', // sortie : doses administrées (M05)
  LOSS = 'loss',                // perte / casse
  ADJUSTMENT = 'adjustment',    // correction inventaire / régularisation
  RETURN = 'return',            // retour vers le niveau supérieur
  QUARANTINE = 'quarantine',    // mise en quarantaine
  RELEASE = 'release',          // sortie de quarantaine
}

/**
 * Mouvement de stock (M08-F04) — journal APPEND-ONLY.
 * Jamais de UPDATE/DELETE : la quantité finale d'un niveau
 * se recalcule par somme des mouvements. Motif obligatoire.
 */
@Entity('stock_movements')
export class StockMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'lot_id', type: 'uuid' })
  lotId: string;

  @ManyToOne(() => Lot)
  @JoinColumn({ name: 'lot_id' })
  lot: Lot;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'from_structure_id', type: 'uuid', nullable: true })
  fromStructureId: string;

  @ManyToOne(() => Structure, { nullable: true })
  @JoinColumn({ name: 'from_structure_id' })
  fromStructure: Structure;

  @Column({ name: 'to_structure_id', type: 'uuid', nullable: true })
  toStructureId: string;

  @ManyToOne(() => Structure, { nullable: true })
  @JoinColumn({ name: 'to_structure_id' })
  toStructure: Structure;

  @Column({ type: 'int' })
  quantity: number; // signé : positif = entrée, négatif = sortie ; ajustements = delta

  @Column({ type: 'enum', enum: MovementType })
  type: MovementType;

  @Column({ type: 'text' })
  reason: string; // motif obligatoire

  @Column({ name: 'reference_type', nullable: true })
  referenceType: string; // ex. 'vaccination_act', 'inventory'

  @Column({ name: 'reference_id', type: 'uuid', nullable: true })
  referenceId: string;

  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'actor_id' })
  actor: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
