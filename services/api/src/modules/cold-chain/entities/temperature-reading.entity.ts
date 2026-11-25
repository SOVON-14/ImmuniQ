import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { ColdChainEquipment } from './cold-chain-equipment.entity';
import { User } from '../../identity/entities/user.entity';

export enum ReadingSource {
  MANUAL = 'manual',
  SENSOR = 'sensor', // capteur IoT
}

/** Relevé de température (M09-F02). Append-only : un relevé erroné se corrige par un nouveau relevé. */
@Entity('temperature_readings')
export class TemperatureReading {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'equipment_id', type: 'uuid' })
  equipmentId: string;

  @ManyToOne(() => ColdChainEquipment, (e) => e.readings)
  @JoinColumn({ name: 'equipment_id' })
  equipment: ColdChainEquipment;

  @Column({ name: 'recorded_at', type: 'timestamptz' })
  recordedAt: Date;

  @Column({ name: 'temperature_c', type: 'decimal', precision: 5, scale: 2 })
  temperatureC: number;

  @Column({ type: 'enum', enum: ReadingSource, default: ReadingSource.MANUAL })
  source: ReadingSource;

  @Column({ name: 'recorded_by', type: 'uuid', nullable: true })
  recordedBy: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'recorded_by' })
  recorder: User;

  @Column({ name: 'incident_id', type: 'uuid', nullable: true })
  incidentId: string; // renseigné si le relevé a déclenché un incident

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
