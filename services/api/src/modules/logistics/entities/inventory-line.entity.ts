import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
} from 'typeorm';
import { Inventory } from './inventory.entity';
import { Lot } from './lot.entity';

/** Ligne d'inventaire : quantité théorique vs comptée (M08-F05). */
@Entity('inventory_lines')
export class InventoryLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'inventory_id', type: 'uuid' })
  inventoryId: string;

  @ManyToOne(() => Inventory, (i) => i.lines)
  @JoinColumn({ name: 'inventory_id' })
  inventory: Inventory;

  @Column({ name: 'lot_id', type: 'uuid' })
  lotId: string;

  @ManyToOne(() => Lot)
  @JoinColumn({ name: 'lot_id' })
  lot: Lot;

  @Column({ name: 'expected_qty', type: 'int' })
  expectedQty: number; // stock théorique au moment du comptage

  @Column({ name: 'counted_qty', type: 'int', nullable: true })
  countedQty: number;

  @Column({ name: 'variance', type: 'int', nullable: true })
  variance: number; // counted - expected (calculé à la clôture)
}
