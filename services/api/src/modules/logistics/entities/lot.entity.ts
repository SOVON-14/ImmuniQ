import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, OneToMany,
} from 'typeorm';
import { Product } from './product.entity';
import { Structure } from '../../org/entities/structure.entity';
import { StockLevel } from './stock-level.entity';
import { StockMovement } from './stock-movement.entity';

export enum LotStatus {
  AVAILABLE = 'available',
  QUARANTINED = 'quarantined', // blocage qualité / investigation
  DEPLETED = 'depleted',
  EXPIRED = 'expired',
}

/**
 * Lot de produit (M08-F02). Traçabilité amont (fabricant, expiration)
 * et aval (structures, actes). Un lot expiré ou en quarantaine
 * ne doit plus être administrable — contrôlé à l'acte (M05).
 */
@Entity('lots')
export class Lot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @ManyToOne(() => Product, (p) => p.lots)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'lot_number' })
  lotNumber: string;

  @Column({ name: 'expiry_date', type: 'date' })
  expiryDate: Date;

  @Column({ name: 'receipt_date', type: 'date', nullable: true })
  receiptDate: Date;

  @Column({ name: 'quantity_initial', type: 'int' })
  quantityInitial: number;

  @Column({ name: 'manufacturer', nullable: true })
  manufacturer: string;

  @Column({ name: 'supplier', nullable: true })
  supplier: string;

  @Column({ name: 'structure_id', type: 'uuid', nullable: true })
  structureId: string; // structure de réception initiale

  @ManyToOne(() => Structure, { nullable: true })
  @JoinColumn({ name: 'structure_id' })
  structure: Structure;

  @Column({ type: 'enum', enum: LotStatus, default: LotStatus.AVAILABLE })
  status: LotStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @OneToMany(() => StockLevel, (s) => s.lot)
  levels: StockLevel[];

  @OneToMany(() => StockMovement, (m) => m.lot)
  movements: StockMovement[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
