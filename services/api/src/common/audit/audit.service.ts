import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditResult } from '../../modules/identity/entities/audit-log.entity';

export interface AuditEntry {
  actorId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  result?: AuditResult;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
  ) {}

  async log(entry: AuditEntry): Promise<void> {
    try {
      await this.repo.save(this.repo.create({ ...entry, result: entry.result ?? AuditResult.SUCCESS }));
    } catch {
      // L'audit ne doit jamais bloquer l'opération métier ; à surveiller via métriques.
    }
  }
}
