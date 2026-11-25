import {
  BadRequestException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Campaign, CampaignStatus } from './entities/campaign.entity';
import { CampaignSession, SessionStatus } from './entities/campaign-session.entity';
import { VaccinationAct, ActStatus } from '../vaccination-acts/entities/vaccination-act.entity';
import {
  CreateCampaignDto, UpdateCampaignDto, CreateSessionDto, UpdateSessionDto, TransitionCampaignDto,
} from './dto/campaigns.dto';
import { User } from '../identity/entities/user.entity';
import { RoleCode } from '../identity/entities/role.entity';
import { AuditService } from '../../common/audit/audit.service';
import { ScopeService } from '../../common/scope/scope.service';

const CAMPAIGN_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  [CampaignStatus.DRAFT]: [CampaignStatus.PLANNED, CampaignStatus.CANCELLED],
  [CampaignStatus.PLANNED]: [CampaignStatus.ACTIVE, CampaignStatus.CANCELLED, CampaignStatus.DRAFT],
  [CampaignStatus.ACTIVE]: [CampaignStatus.PAUSED, CampaignStatus.COMPLETED, CampaignStatus.CANCELLED],
  [CampaignStatus.PAUSED]: [CampaignStatus.ACTIVE, CampaignStatus.CANCELLED],
  [CampaignStatus.COMPLETED]: [],
  [CampaignStatus.CANCELLED]: [],
};

const SESSION_TRANSITIONS: Record<SessionStatus, SessionStatus[]> = {
  [SessionStatus.SCHEDULED]: [SessionStatus.IN_PROGRESS, SessionStatus.CANCELLED],
  [SessionStatus.IN_PROGRESS]: [SessionStatus.COMPLETED, SessionStatus.CANCELLED],
  [SessionStatus.COMPLETED]: [],
  [SessionStatus.CANCELLED]: [],
};

@Injectable()
export class CampaignsService {
  constructor(
    @InjectRepository(Campaign) private campaigns: Repository<Campaign>,
    @InjectRepository(CampaignSession) private sessions: Repository<CampaignSession>,
    @InjectRepository(VaccinationAct) private acts: Repository<VaccinationAct>,
    private audit: AuditService,
    private scope: ScopeService,
  ) {}

  // ---------- Campagnes ----------

  async list(actor: User, status?: CampaignStatus) {
    const qb = this.campaigns.createQueryBuilder('c')
      .leftJoinAndSelect('c.territory', 't')
      .leftJoinAndSelect('c.structure', 's')
      .leftJoinAndSelect('c.sessions', 'ss')
      .orderBy('c.created_at', 'DESC');
    if (status) qb.where('c.status = :st', { st: status });
    const rows = await qb.getMany();
    return this.filterCampaignScope(actor, rows);
  }

  async get(actor: User, id: string) {
    const c = await this.campaigns.findOne({
      where: { id },
      relations: ['territory', 'structure', 'referential', 'sessions', 'sessions.structure', 'sessions.mobileTeam', 'sessions.supervisor'],
    });
    if (!c) throw new NotFoundException('Campagne introuvable');
    await this.assertCampaignAccess(actor, c);
    return c;
  }

  async create(actor: User, dto: CreateCampaignDto, ip?: string, ua?: string) {
    const exists = await this.campaigns.findOne({ where: { code: dto.code.toUpperCase() } });
    if (exists) throw new BadRequestException('Code campagne déjà utilisé');
    if (dto.startDate && dto.endDate && new Date(dto.endDate) < new Date(dto.startDate)) {
      throw new BadRequestException('endDate antérieure à startDate');
    }
    const c = await this.campaigns.save(this.campaigns.create({
      ...dto,
      code: dto.code.toUpperCase(),
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      createdBy: actor.id,
    }));
    await this.audit.log({ actorId: actor.id, action: 'campaign.create', resourceType: 'campaign', resourceId: c.id, ip, userAgent: ua });
    return c;
  }

  /** Mise à jour limitée aux brouillons et campagnes planifiées. */
  async update(actor: User, id: string, dto: UpdateCampaignDto, ip?: string, ua?: string) {
    const c = await this.get(actor, id);
    if (![CampaignStatus.DRAFT, CampaignStatus.PLANNED].includes(c.status)) {
      throw new BadRequestException('Campagne non modifiable dans son statut actuel');
    }
    Object.assign(c, {
      name: dto.name ?? c.name,
      startDate: dto.startDate ? new Date(dto.startDate) : c.startDate,
      endDate: dto.endDate ? new Date(dto.endDate) : c.endDate,
      targetPopulation: dto.targetPopulation ?? c.targetPopulation,
      objectives: dto.objectives ?? c.objectives,
    });
    const saved = await this.campaigns.save(c);
    await this.audit.log({ actorId: actor.id, action: 'campaign.update', resourceType: 'campaign', resourceId: id, ip, userAgent: ua });
    return saved;
  }

  async transition(actor: User, id: string, dto: TransitionCampaignDto, ip?: string, ua?: string) {
    const c = await this.get(actor, id);
    const allowed = CAMPAIGN_TRANSITIONS[c.status] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(`Transition ${c.status} → ${dto.status} non autorisée`);
    }
    if (dto.status === CampaignStatus.ACTIVE && !(await this.sessions.count({ where: { campaignId: id } }))) {
      throw new BadRequestException('Impossible d’activer une campagne sans séance planifiée');
    }
    const from = c.status;
    c.status = dto.status;
    const saved = await this.campaigns.save(c);
    await this.audit.log({
      actorId: actor.id, action: `campaign.${dto.status}`, resourceType: 'campaign', resourceId: id,
      ip, userAgent: ua, details: { from, to: dto.status, reason: dto.reason },
    });
    return saved;
  }

  // ---------- Séances ----------

  async addSession(actor: User, campaignId: string, dto: CreateSessionDto, ip?: string, ua?: string) {
    const c = await this.get(actor, campaignId);
    if (![CampaignStatus.DRAFT, CampaignStatus.PLANNED].includes(c.status)) {
      throw new BadRequestException('Séances ajoutables uniquement en brouillon ou planifié');
    }
    const session = await this.sessions.save(this.sessions.create({
      ...dto,
      campaignId,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
    }));
    await this.audit.log({ actorId: actor.id, action: 'campaign.session_add', resourceType: 'campaign_session', resourceId: session.id, ip, userAgent: ua });
    return session;
  }

  async updateSession(actor: User, sessionId: string, dto: UpdateSessionDto, ip?: string, ua?: string) {
    const session = await this.sessions.findOne({
      where: { id: sessionId }, relations: ['campaign'],
    });
    if (!session) throw new NotFoundException('Séance introuvable');
    await this.assertCampaignAccess(actor, session.campaign);
    if (dto.status) {
      const allowed = SESSION_TRANSITIONS[session.status] ?? [];
      if (!allowed.includes(dto.status)) {
        throw new BadRequestException(`Transition séance ${session.status} → ${dto.status} non autorisée`);
      }
      session.status = dto.status;
      if (dto.status === SessionStatus.IN_PROGRESS && !session.actualStart) session.actualStart = new Date();
      if (dto.status === SessionStatus.COMPLETED && !session.actualEnd) session.actualEnd = new Date();
    }
    Object.assign(session, {
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : session.scheduledAt,
      location: dto.location ?? session.location,
      supervisorId: dto.supervisorId ?? session.supervisorId,
    });
    const saved = await this.sessions.save(session);
    await this.audit.log({ actorId: actor.id, action: 'campaign.session_update', resourceType: 'campaign_session', resourceId: sessionId, ip, userAgent: ua });
    return saved;
  }

  async listSessions(actor: User, campaignId: string) {
    await this.get(actor, campaignId);
    return this.sessions.find({
      where: { campaignId },
      relations: ['structure', 'mobileTeam', 'supervisor'],
      order: { scheduledAt: 'ASC' },
    });
  }

  /** Statistiques d'une campagne : actes par statut, par séance. */
  async stats(actor: User, campaignId: string) {
    await this.get(actor, campaignId);
    const acts = await this.acts.createQueryBuilder('a')
      .select('a.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('a.campaign_id = :cid', { cid: campaignId })
      .groupBy('a.status')
      .getRawMany();
    const totalSessions = await this.sessions.count({ where: { campaignId } });
    const doneSessions = await this.sessions.count({ where: { campaignId, status: SessionStatus.COMPLETED } });
    return { byStatus: acts, totalSessions, completedSessions: doneSessions };
  }

  // ---------- Périmètre ----------

  private async filterCampaignScope(actor: User, rows: Campaign[]): Promise<Campaign[]> {
    if ([RoleCode.NATIONAL_ADMIN, RoleCode.HEALTH_AUTHORITY].includes(actor.role?.code as RoleCode)) return rows;
    const sids = await this.scope.structureIdsFor(actor.id);
    const tids = await this.scope.territoryIdsFor(actor.id);
    return rows.filter((c) =>
      (c.structureId && sids.includes(c.structureId)) ||
      (c.territoryId && tids.includes(c.territoryId)) ||
      c.createdBy === actor.id);
  }

  private async assertCampaignAccess(actor: User, c: Campaign) {
    if ([RoleCode.NATIONAL_ADMIN, RoleCode.HEALTH_AUTHORITY].includes(actor.role?.code as RoleCode)) return;
    const sids = await this.scope.structureIdsFor(actor.id);
    const tids = await this.scope.territoryIdsFor(actor.id);
    if ((c.structureId && sids.includes(c.structureId)) ||
        (c.territoryId && tids.includes(c.territoryId)) ||
        c.createdBy === actor.id) return;
    throw new ForbiddenException('Campagne hors de votre périmètre');
  }
}
