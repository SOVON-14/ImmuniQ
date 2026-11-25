import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, OneToMany,
} from 'typeorm';
import { Structure } from '../../org/entities/structure.entity';
import { TemperatureReading } from './temperature-reading.entity';
import { ColdChainIncident } from './cold-chain-incident.entity';

export enum EquipmentType {
  REFRIGERATOR = 'refrigerator',
  FREEZER = 'freezer',
  COLD_ROOM = 'cold_room',
  PASSIVE_CONTAINER = 'passive_container',
  COLD_BOX = 'cold_box',
  REFRIGERATED_VEHICLE = 'refrigerated_vehicle',
}

export enum EquipmentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  MAINTENANCE = 'maintenance',
}

/**
 * Équipement de chaîne du froid (M09-F01) : réfrigérateur, congélateur,
 * chambre froide, conteneur passif, glacières, véhicule frigorifique.
 * Plage de température requise = ce qui déclenche les incidents.
 */
@Entity('cold_chain_equipment')
export class ColdChainEquipment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: EquipmentType })
  type: EquipmentType;

  @Column({ name: 'structure_id', type: 'uuid', nullable: true })
  structureId: string;

  @ManyToOne(() => Structure, { nullable: true })
  @JoinColumn({ name: 'structure_id' })
  structure: Structure;

  @Column({ name: 'min_temp_c', type: 'decimal', precision: 5, scale: 2 })
  minTempC: number; // borne basse requise (ex. +2 pour vaccins)

  @Column({ name: 'max_temp_c', type: 'decimal', precision: 5, scale: 2 })
  maxTempC: number; // borne haute requise (ex. +8)

  @Column({ type: 'enum', enum: EquipmentStatus, default: EquipmentStatus.ACTIVE })
  status: EquipmentStatus;

  @Column({ name: 'commissioned_at', type: 'date', nullable: true })
  commissionedAt: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @OneToMany(() => TemperatureReading, (r) => r.equipment)
  readings: TemperatureReading[];

  @OneToMany(() => ColdChainIncident, (i) => i.equipment)
  incidents: ColdChainIncident[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
