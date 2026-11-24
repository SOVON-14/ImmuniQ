import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { VaccinePresentation } from './vaccine-presentation.entity';

export enum VaccineStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  ARCHIVED = 'archived',
}

/** Catalogue des vaccins (M04-F01). */
@Entity('vaccines')
export class Vaccine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string; // ex. PENTA, ROR, VPH, BCG, VPI

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: VaccineStatus, default: VaccineStatus.ACTIVE })
  status: VaccineStatus;

  @Column({ name: 'source_reference', nullable: true })
  sourceReference: string; // référentiel officiel

  @OneToMany(() => VaccinePresentation, (p) => p.vaccine)
  presentations: VaccinePresentation[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
