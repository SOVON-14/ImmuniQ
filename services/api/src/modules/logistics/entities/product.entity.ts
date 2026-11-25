import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Lot } from './lot.entity';

export enum ProductType {
  VACCINE = 'vaccine',
  SUPPLY = 'supply', // seringues, diluants, matériel
  OTHER = 'other',
}

/** Produit stockable : vaccin (lié au catalogue M04) ou consommable (M08-F01). */
@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column({ name: 'vaccine_id', type: 'uuid', nullable: true })
  vaccineId: string; // FK vers vaccines si type = vaccine

  @Column({ type: 'enum', enum: ProductType, default: ProductType.VACCINE })
  type: ProductType;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: true })
  active: boolean;

  @OneToMany(() => Lot, (l) => l.product)
  lots: Lot[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
