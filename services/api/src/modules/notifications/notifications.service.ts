import {
  BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException, OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationTemplate, NotificationChannel } from './entities/notification-template.entity';
import { NotificationPreference } from './entities/notification-preference.entity';
import { Notification, NotificationStatus } from './entities/notification.entity';
import {
  CreateTemplateDto, UpdatePreferenceDto, SendNotificationDto, ListNotificationsQuery,
} from './dto/notifications.dto';
import { Beneficiary, BeneficiaryStatus } from '../beneficiaries/entities/beneficiary.entity';
import { User } from '../identity/entities/user.entity';
import { RoleCode } from '../identity/entities/role.entity';
import { AuditService } from '../../common/audit/audit.service';
import { ScopeService } from '../../common/scope/scope.service';
import { RecordService } from '../record/record.service';

const DAY = 24 * 3600 * 1000;

/** Canaux nécessitant un consentement explicite du bénéficiaire. */
const CONSENT_CHANNELS = [NotificationChannel.SMS, NotificationChannel.PUSH];

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(NotificationTemplate) private templates: Repository<NotificationTemplate>,
    @InjectRepository(NotificationPreference) private preferences: Repository<NotificationPreference>,
    @InjectRepository(Notification) private notifications: Repository<Notification>,
    @InjectRepository(Beneficiary) private beneficiaries: Repository<Beneficiary>,
    private audit: AuditService,
    private scope: ScopeService,
    private record: RecordService,
  ) {}

  async onModuleInit() {
    // Template par défaut : rappel d'échéance (aucune donnée de santé dans le message)
    const exists = await this.templates.findOne({ where: { code: 'vaccination_reminder' } });
    if (!exists) {
      await this.templates.save(this.templates.create({
        code: 'vaccination_reminder',
        name: 'Rappel de vaccination',
        channel: NotificationChannel.SMS,
        body: 'Bonjour {{name}}, un vaccin de votre enfant est prévu le {{dueDate}}. Présentez-vous au centre de vaccination. - ImmuniQ',
        locale: 'fr',
      }));
    }
  }

  // ---------- Templates ----------

  listTemplates() {
    return this.templates.find({ order: { code: 'ASC' } });
  }

  async createTemplate(actor: User, dto: CreateTemplateDto, ip?: string, ua?: string) {
    const exists = await this.templates.findOne({ where: { code: dto.code } });
    if (exists) throw new BadRequestException('Code template déjà utilisé');
    const t = await this.templates.save(this.templates.create(dto));
    await this.audit.log({ actorId: actor.id, action: 'notification.template_create', resourceType: 'notification_template', resourceId: t.id, ip, userAgent: ua });
    return t;
  }

  // ---------- Préférences ----------

  async getPreferences(actor: User, beneficiaryId: string) {
    await this.getBeneficiaryScoped(actor, beneficiaryId);
    return this.preferences.find({ where: { beneficiaryId } });
  }

  async upsertPreference(actor: User, beneficiaryId: string, channel: NotificationChannel, dto: UpdatePreferenceDto, ip?: string, ua?: string) {
    await this.getBeneficiaryScoped(actor, beneficiaryId);
    let pref = await this.preferences.findOne({ where: { beneficiaryId, channel } });
    if (!pref) pref = this.preferences.create({ beneficiaryId, channel });
    pref.optedIn = dto.optedIn;
    pref.phoneOverride = dto.phoneOverride ?? pref.phoneOverride;
    pref.updatedAt = new Date();
    const saved = await this.preferences.save(pref);
    await this.audit.log({
      actorId: actor.id, action: 'notification.preference_update', resourceType: 'notification_preference',
      resourceId: saved.id, ip, userAgent: ua, details: { beneficiaryId, channel, optedIn: dto.optedIn },
    });
    return saved;
  }

  // ---------- Envoi ----------

  /**
   * Envoie (ou planifie) une notification. Si beneficiaryId + canal consenti,
   * le consentement est vérifié : pas d'opt-in = refus.
   */
  async send(actor: User, dto: SendNotificationDto, ip?: string, ua?: string) {
    if (dto.beneficiaryId) await this.getBeneficiaryScoped(actor, dto.beneficiaryId);

    if (CONSENT_CHANNELS.includes(dto.channel) && dto.beneficiaryId) {
      const pref = await this.preferences.findOne({
        where: { beneficiaryId: dto.beneficiaryId, channel: dto.channel },
      });
      if (!pref?.optedIn) {
        throw new ForbiddenException('Le bénéficiaire n’a pas consenti à ce canal de notification');
      }
      if (pref.phoneOverride) dto.recipientRef = pref.phoneOverride;
    }

    const n = await this.notifications.save(this.notifications.create({
      channel: dto.channel,
      recipientRef: dto.recipientRef,
      beneficiaryId: dto.beneficiaryId,
      payload: dto.payload,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      createdBy: actor.id,
    }));
    await this.audit.log({
      actorId: actor.id, action: 'notification.send', resourceType: 'notification', resourceId: n.id,
      ip, userAgent: ua, details: { channel: dto.channel, beneficiaryId: dto.beneficiaryId },
    });
    if (!n.scheduledAt || n.scheduledAt <= new Date()) await this.dispatch(n);
    return this.notifications.findOne({ where: { id: n.id } });
  }

  async list(actor: User, q: ListNotificationsQuery) {
    const qb = this.notifications.createQueryBuilder('n')
      .leftJoinAndSelect('n.template', 't')
      .orderBy('n.created_at', 'DESC').take(300);
    if (q.status) qb.andWhere('n.status = :st', { st: q.status });
    if (q.channel) qb.andWhere('n.channel = :ch', { ch: q.channel });
    if (q.beneficiaryId) qb.andWhere('n.beneficiary_id = :bid', { bid: q.beneficiaryId });
    const rows = await qb.getMany();
    if ([RoleCode.NATIONAL_ADMIN, RoleCode.HEALTH_AUTHORITY].includes(actor.role?.code as RoleCode)) return rows;
    // filtre : notifications créées par l'utilisateur ou de bénéficiaires de son périmètre
    const sids = await this.scope.structureIdsFor(actor.id);
    if (rows.length === 0) return rows;
    const bIds = [...new Set(rows.map((r) => r.beneficiaryId).filter(Boolean))] as string[];
    const scoped = bIds.length
      ? await this.beneficiaries.find({ where: bIds.map((id) => ({ id })) as any })
      : [];
    const scopedIds = new Set(scoped.filter((b) => b.originStructureId && sids.includes(b.originStructureId)).map((b) => b.id));
    return rows.filter((r) => r.createdBy === actor.id || (r.beneficiaryId && scopedIds.has(r.beneficiaryId)));
  }

  /**
   * Envoie les notifications planifiées échues (worker). En MVP le "provider"
   * est un stub : statut SENT + log. L'intégration SMS/push réelle se branchera
   * ici sans toucher au reste.
   */
  async processQueue(limit = 200) {
    const due = await this.notifications.find({
      where: { status: NotificationStatus.QUEUED },
      order: { scheduledAt: 'ASC' },
      take: limit,
    });
    let sent = 0;
    for (const n of due) {
      if (n.scheduledAt && n.scheduledAt > new Date()) continue;
      await this.dispatch(n);
      sent++;
    }
    return { processed: sent };
  }

  /**
   * Génère les rappels depuis les échéanciers (M03) : pour chaque bénéficiaire
   * avec une dose `due` dans les N prochains jours et un consentement SMS/portail,
   * une notification est planifiée. Idempotent par (bénéficiaire, échéance, jour).
   */
  async generateReminders(daysAhead = 7, ip?: string, ua?: string) {
    const template = await this.templates.findOne({ where: { code: 'vaccination_reminder', channel: NotificationChannel.SMS } })
      ?? await this.templates.findOne({ where: { code: 'vaccination_reminder' } });
    if (!template) throw new BadRequestException('Template vaccination_reminder absent');

    const horizon = new Date(Date.now() + daysAhead * DAY);
    const beneficiaries = await this.beneficiaries.createQueryBuilder('b')
      .where('b.status = :st', { st: BeneficiaryStatus.ACTIVE })
      .getMany();

    let created = 0;
    let skipped = 0;
    for (const b of beneficiaries) {
      const schedule = await this.record.computeSchedule(b);
      const nextDue = schedule.vaccines
        .map((v) => v.nextDueAt)
        .filter((d): d is Date => !!d && d <= horizon)
        .sort((a, b2) => a.getTime() - b2.getTime())[0];
      if (!nextDue) { skipped++; continue; }

      const dueDate = nextDue.toISOString().slice(0, 10);
      // Idempotence : une notif déjà planifiée pour cette échéance ?
      const dupe = await this.notifications.createQueryBuilder('n')
        .where('n.beneficiary_id = :bid', { bid: b.id })
        .andWhere('n.template_id = :tid', { tid: template.id })
        .andWhere(`n.payload->>'dueDate' = :dd`, { dd: dueDate })
        .andWhere('n.status IN (:...sts)', { sts: [NotificationStatus.QUEUED, NotificationStatus.SENT, NotificationStatus.DELIVERED] })
        .getCount();
      if (dupe > 0) { skipped++; continue; }

      // Un rappel par canal consenti
      const prefs = await this.preferences.find({ where: { beneficiaryId: b.id, optedIn: true } });
      for (const pref of prefs) {
        const channel = pref.channel === NotificationChannel.PORTAL ? NotificationChannel.PORTAL : pref.channel;
        const recipientRef = channel === NotificationChannel.SMS ? (pref.phoneOverride ?? b.phone) : b.immuniqId;
        if (!recipientRef) continue;
        await this.notifications.save(this.notifications.create({
          templateId: template.id,
          channel,
          recipientRef,
          beneficiaryId: b.id,
          payload: { name: `${b.firstName} ${b.lastName}`, dueDate }, // pas de donnée de vaccin
          scheduledAt: new Date(nextDue.getTime() - 3 * DAY), // rappel 3 jours avant
        }));
        created++;
      }
    }
    await this.audit.log({ actorId: undefined, action: 'notification.reminders_generate', resourceType: 'notification', details: { created, skipped, daysAhead }, ip, userAgent: ua });
    return { created, skipped };
  }

  // ---------- Helpers ----------

  /** Envoi effectif — stub provider en attendant l'intégration SMS/push. */
  private async dispatch(n: Notification) {
    try {
      // TODO(provider): appel agrégateur SMS / FCM / passerelle portail
      this.logger.log(`[stub] envoi ${n.channel} → ${n.recipientRef} : ${JSON.stringify(n.payload)}`);
      n.status = NotificationStatus.SENT;
      n.sentAt = new Date();
    } catch (e: any) {
      n.status = NotificationStatus.FAILED;
      n.error = e?.message;
    }
    return this.notifications.save(n);
  }

  private async getBeneficiaryScoped(actor: User, beneficiaryId: string) {
    const b = await this.beneficiaries.findOne({ where: { id: beneficiaryId }, relations: ['originStructure'] });
    if (!b) throw new NotFoundException('Bénéficiaire introuvable');
    if ([RoleCode.NATIONAL_ADMIN, RoleCode.HEALTH_AUTHORITY].includes(actor.role?.code as RoleCode)) return b;
    const sids = await this.scope.structureIdsFor(actor.id);
    const tids = await this.scope.territoryIdsFor(actor.id);
    if (b.originStructureId && sids.includes(b.originStructureId)) return b;
    if (b.originStructure?.territoryId && tids.includes(b.originStructure.territoryId)) return b;
    throw new ForbiddenException('Bénéficiaire hors de votre périmètre');
  }
}
