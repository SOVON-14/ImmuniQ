import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from '../../identity/entities/user.entity';

/** Paramètre système clé/valeur (M13-F01). */
@Entity('settings')
export class Setting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  key: string; // ex. sync.batch_size, session.ttl_minutes

  @Column({ type: 'jsonb' })
  value: unknown;

  @Column({ type: 'varchar', nullable: true })
  category: string; // security / sync / notifications / general

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updater: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
