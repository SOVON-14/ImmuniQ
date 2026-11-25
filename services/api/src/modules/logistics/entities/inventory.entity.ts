import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, OneToMany,
} from 'typeorm';
import { Structure } from '../../org/entities/structure.entity';
import { User } from '../../identity/entities/user.entity';
import { InventoryLine } from './inventory-line.entity';

export enum InventoryStatus {
  OPEN = 'open',
  CLOSED = 'closed',
  CANCELLED = 'cancelled',
}

/** Session d'inventaire d'une structure (M08-F05). */
@Entity('inventories')
export class Inventory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'structure_id', type: 'uuid' })
  structureId: string;

  @ManyToOne(() => Structure)
  @JoinColumn({ name: 'structure_id' })
  structure: Structure;

  @Column({ type: 'enum', enum: InventoryStatus, default: InventoryStatus.OPEN })
  status: InventoryStatus;

  @Column({ name: 'opened_by', type: 'uuid' })
  openedBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'opened_by' })
  opener: User;

  @Column({ name: 'opened_at', type: 'timestamptz' })
  openedAt: Date;

  @Column({ name: 'closed_by', type: 'uuid', nullable: true })
  closedBy: string;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt: Date;

  @OneToMany(() => InventoryLine, (l) => l.inventory)
  lines: InventoryLine[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
