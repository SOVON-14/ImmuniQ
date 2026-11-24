import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
} from 'typeorm';
import { Vaccine } from './vaccine.entity';

/** Présentation / formulation d'un vaccin (ex. "0,5 ml", lyophilisat). */
@Entity('vaccine_presentations')
export class VaccinePresentation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'vaccine_id', type: 'uuid' })
  vaccineId: string;

  @ManyToOne(() => Vaccine, (v) => v.presentations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vaccine_id' })
  vaccine: Vaccine;

  @Column()
  presentation: string;

  @Column({ nullable: true })
  formulation: string;

  @Column({ default: true })
  active: boolean;
}
