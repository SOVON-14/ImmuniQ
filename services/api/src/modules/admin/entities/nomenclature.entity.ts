import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

/**
 * Nomenclature fermée (M13-F02) : listes de valeurs contrôlées
 * (communes, motifs de perte, professions…). `domain` regroupe les codes.
 */
@Entity('nomenclatures')
export class Nomenclature {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  domain: string; // ex. commune, perte_motif, profession

  @Column()
  code: string;

  @Column()
  label: string;

  @Column({ name: 'parent_code', nullable: true })
  parentCode: string; // hiérarchie éventuelle

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
