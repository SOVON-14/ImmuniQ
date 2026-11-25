import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from '../../identity/entities/user.entity';

export enum ExportType {
  ACTS = 'acts',
  BENEFICIARIES = 'beneficiaries',
  STOCK = 'stock',
  CAMPAIGNS = 'campaigns',
}

export enum ExportFormat {
  CSV = 'csv',
  JSON = 'json',
}

/**
 * Trace des exports de données (M11 / exigence CDC : tout export
 * de données personnelles est journalisé avec auteur, périmètre, date).
 */
@Entity('report_exports')
export class ReportExport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: ExportType })
  type: ExportType;

  @Column({ type: 'enum', enum: ExportFormat, default: ExportFormat.CSV })
  format: ExportFormat;

  @Column({ type: 'jsonb' })
  params: Record<string, unknown>; // filtres appliqués

  @Column({ name: 'row_count', type: 'int', nullable: true })
  rowCount: number;

  @Column({ name: 'generated_by', type: 'uuid' })
  generatedBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'generated_by' })
  generator: User;

  @CreateDateColumn({ name: 'generated_at' })
  generatedAt: Date;
}
