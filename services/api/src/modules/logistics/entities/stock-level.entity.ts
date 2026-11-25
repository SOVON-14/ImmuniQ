import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
} from 'typeorm';
import { Lot } from './lot.entity';
import { Structure } from '../../org/entities/structure.entity';

/**
 * Niveau de stock d'un lot dans une structure donnée (M08-F03).
 * Une ligne par (lot, structure). Le stock ne devient jamais négatif.
 */
@Entity('stock_levels')
export class StockLevel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'lot_id', type: 'uuid' })
  lotId: string;

  @ManyToOne(() => Lot, (l) => l.levels)
  @JoinColumn({ name: 'lot_id' })
  lot: Lot;

  @Column({ name: 'structure_id', type: 'uuid' })
  structureId: string;

  @ManyToOne(() => Structure)
  @JoinColumn({ name: 'structure_id' })
  structure: Structure;

  @Column({ name: 'quantity_on_hand', type: 'int', default: 0 })
  quantityOnHand: number;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
