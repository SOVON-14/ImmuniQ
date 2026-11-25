import {
  BadRequestException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from './entities/setting.entity';
import { Nomenclature } from './entities/nomenclature.entity';
import { RetentionPolicy } from './entities/retention-policy.entity';
import { BackupRecord, BackupType, BackupStatus } from './entities/backup-record.entity';
import { AuditLog } from '../identity/entities/audit-log.entity';
import {
  UpsertSettingDto, CreateNomenclatureDto, UpdateNomenclatureDto,
  UpsertRetentionDto, TriggerBackupDto,
} from './dto/admin.dto';
import { User } from '../identity/entities/user.entity';
import { AuditService } from '../../common/audit/audit.service';

/** M13 — Administration : paramétrage, nomenclatures, rétention, sauvegardes, audit. */
@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Setting) private settings: Repository<Setting>,
    @InjectRepository(Nomenclature) private nomenclatures: Repository<Nomenclature>,
    @InjectRepository(RetentionPolicy) private retentions: Repository<RetentionPolicy>,
    @InjectRepository(BackupRecord) private backups: Repository<BackupRecord>,
    @InjectRepository(AuditLog) private auditLogs: Repository<AuditLog>,
    private audit: AuditService,
  ) {}

  // ---------- Paramètres ----------

  async listSettings(category?: string) {
    const qb = this.settings.createQueryBuilder('s').orderBy('s.key', 'ASC');
    if (category) qb.where('s.category = :c', { c: category });
    return qb.getMany();
  }

  async getSetting(key: string) {
    const s = await this.settings.findOne({ where: { key } });
    if (!s) throw new NotFoundException('Paramètre introuvable');
    return s;
  }

  async upsertSetting(actor: User, key: string, dto: UpsertSettingDto, ip?: string, ua?: string) {
    let s = await this.settings.findOne({ where: { key } });
    const isNew = !s;
    if (!s) s = this.settings.create({ key });
    s.value = dto.value;
    s.category = dto.category ?? s.category;
    s.description = dto.description ?? s.description;
    s.updatedBy = actor.id;
    const saved = await this.settings.save(s);
    await this.audit.log({
      actorId: actor.id, action: isNew ? 'settings.create' : 'settings.update',
      resourceType: 'setting', resourceId: saved.id, ip, userAgent: ua,
      details: { key, value: dto.value },
    });
    return saved;
  }

  // ---------- Nomenclatures ----------

  async listNomenclatures(domain?: string) {
    const qb = this.nomenclatures.createQueryBuilder('n').orderBy('n.domain').addOrderBy('n.sortOrder');
    if (domain) qb.where('n.domain = :d', { d: domain });
    return qb.getMany();
  }

  async createNomenclature(actor: User, dto: CreateNomenclatureDto, ip?: string, ua?: string) {
    const dup = await this.nomenclatures.findOne({ where: { domain: dto.domain, code: dto.code } });
    if (dup) throw new BadRequestException('Code déjà utilisé dans ce domaine');
    const n = await this.nomenclatures.save(this.nomenclatures.create({
      ...dto, sortOrder: dto.sortOrder ?? 0,
    }));
    await this.audit.log({ actorId: actor.id, action: 'nomenclature.create', resourceType: 'nomenclature', resourceId: n.id, ip, userAgent: ua, details: { domain: dto.domain, code: dto.code } });
    return n;
  }

  async updateNomenclature(actor: User, id: string, dto: UpdateNomenclatureDto, ip?: string, ua?: string) {
    const n = await this.nomenclatures.findOne({ where: { id } });
    if (!n) throw new NotFoundException('Nomenclature introuvable');
    Object.assign(n, dto);
    const saved = await this.nomenclatures.save(n);
    await this.audit.log({ actorId: actor.id, action: 'nomenclature.update', resourceType: 'nomenclature', resourceId: id, ip, userAgent: ua });
    return saved;
  }

  // ---------- Rétention ----------

  async listRetentions() {
    return this.retentions.find({ order: { dataType: 'ASC' } });
  }

  async upsertRetention(actor: User, dataType: string, dto: UpsertRetentionDto, ip?: string, ua?: string) {
    let r = await this.retentions.findOne({ where: { dataType } });
    if (!r) r = this.retentions.create({ dataType });
    r.retentionDays = dto.retentionDays;
    r.legalBasis = dto.legalBasis ?? r.legalBasis;
    r.active = dto.active ?? r.active ?? true;
    const saved = await this.retentions.save(r);
    await this.audit.log({
      actorId: actor.id, action: 'retention.update', resourceType: 'retention_policy', resourceId: saved.id,
      ip, userAgent: ua, details: { dataType, retentionDays: dto.retentionDays },
    });
    return saved;
  }

  // ---------- Sauvegardes ----------

  /**
   * Déclenche une sauvegarde. En MVP le backup réel est stubé :
   * l'enregistrement passe à COMPLETED avec une référence simulée.
   * L'intégration pg_dump/stockage chiffré viendra avec l'infra.
   */
  async triggerBackup(actor: User, dto: TriggerBackupDto, ip?: string, ua?: string) {
    const rec = await this.backups.save(this.backups.create({
      type: dto.type ?? BackupType.FULL,
      status: BackupStatus.RUNNING,
      triggeredBy: actor.id,
    }));
    // TODO(infra): exécution réelle pg_dump + chiffrement + upload coffre
    rec.status = BackupStatus.COMPLETED;
    rec.finishedAt = new Date();
    rec.storageRef = `s3://immuniq-backups/${rec.id}.dump.enc`;
    rec.sizeBytes = 0;
    const saved = await this.backups.save(rec);
    await this.audit.log({
      actorId: actor.id, action: 'backup.trigger', resourceType: 'backup_record', resourceId: saved.id,
      ip, userAgent: ua, details: { type: saved.type },
    });
    return saved;
  }

  async listBackups() {
    return this.backups.find({ order: { startedAt: 'DESC' }, take: 100 });
  }

  // ---------- Journal d'audit ----------

  async listAudit(filters: { action?: string; resourceType?: string; actorId?: string; from?: string; to?: string }) {
    const qb = this.auditLogs.createQueryBuilder('a')
      .orderBy('a.created_at', 'DESC').take(500);
    if (filters.action) qb.andWhere('a.action = :act', { act: filters.action });
    if (filters.resourceType) qb.andWhere('a.resource_type = :rt', { rt: filters.resourceType });
    if (filters.actorId) qb.andWhere('a.actor_id = :aid', { aid: filters.actorId });
    if (filters.from) qb.andWhere('a.created_at >= :from', { from: filters.from });
    if (filters.to) qb.andWhere('a.created_at <= :to', { to: filters.to });
    return qb.getMany();
  }
}
