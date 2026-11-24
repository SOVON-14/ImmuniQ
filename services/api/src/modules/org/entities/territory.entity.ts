import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, OneToMany, JoinColumn, Tree, TreeChildren, TreeParent,
} from 'typeorm';
import { Structure } from './structure.entity';

export enum TerritoryLevel {
  NATIONAL = 'national',
  REGIONAL = 'regional',
  DISTRICT = 'district',
}

/**
 * Hiérarchie territoriale : national → régional → district (IMQ-015).
 * Le niveau national est la racine (parent_id NULL).
 */
@Entity('territories')
@Tree('closure-table')
export class Territory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: TerritoryLevel })
  level: TerritoryLevel;

  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column({ default: 'active' })
  status: string; // active / inactive

  @TreeParent()
  @JoinColumn({ name: 'parent_id' })
  parent: Territory;

  @TreeChildren()
  children: Territory[];

  @OneToMany(() => Structure, (s) => s.territory)
  structures: Structure[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
