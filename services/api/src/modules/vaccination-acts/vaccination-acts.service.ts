import {
  BadRequestException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { VaccinationAct, ActStatus, ActSource } from './entities/vaccination-act.entity';
import { ActCorrection } from './entities/act-correction.entity';
import { AdverseEvent } from './entities/adverse-event.entity';
import {
  CreateActDto, UpdateActDto, TransitionActDto, DeclareAdverseEventDto, ListActsQuery,
} from './dto/vaccination-acts.dto';
import { Beneficiary, BeneficiaryStatus } from '../beneficiaries/entities/beneficiary.entity';
import { Vaccine } from '../referentials/entities/vaccine.entity';
import { Referential, ReferentialStatus } from '../referentials/entities/referential.entity';
import { VaccinationRule } from '../referentials/entities/vaccination-rule.entity';
import { User } from '../identity/entities/user.entity';
import { RoleCode } from '../identity/entities/role.entity';
import { AuditService } from '../../common/audit/audit.service';
import { ScopeService } from '../../common/scope/scope.service';

const TRANSITIONS: Record<ActStatus, ActStatus[]> = {
  [ActStatus.PLANNED]: [ActStatus.ADMINISTERED, ActStatus.NOT_PERFORMED, ActStatus.CANCELLED],
  [ActStatus.ADMINISTERED]: [],
  [ActStatus.NOT_PERFORMED]: [],
  [ActStatus.CANCELLED]: [],
};

@Injectable()
export class VaccinationActsService {
  constructor(
    @InjectRepository(VaccinationAct) private acts: Repository<VaccinationAct>,
    @InjectRepository(ActCorrection) private corrections: Repository<ActCorrection>,
    @InjectRepository(AdverseEvent) private adverseEvents: Repository<AdverseEvent>,
    @InjectRepository(Beneficiary) private beneficiaries: Repository<Beneficiary>,
    @InjectRepository(Vaccine) private vaccines: Repository<Vaccine>,
    @InjectRepository(Referential) private referentials: Repository<Referential>,
    @InjectRepository(VaccinationRule) private rules: Repository<VaccinationRule>,
    private audit: AuditService,
    private scope: ScopeService,
    private dataSource: DataSource,
  ) {}

  // ---------- Actes ----------

  /**
   * Création idempotente : si `localId` existe déjà (rejeu de synchronisation),
   * l'acte existant est retourné sans doublon (M12-F02).
   */
  async create(actor: User, dto: CreateActDto, ip?: string, ua?: string) {
    if (dto.localId) {
      const existing = await this.acts.findOne({ where: { localId: dto.localId } });
      if (existing) return { ...existing, replayed: true };
    }

    const beneficiary = await this.beneficiaries.findOne({
      where: { id: dto.beneficiaryId },
      relations: ['originStructure'],
    });
    if (!beneficiary) throw new NotFoundException('Bénéficiaire introuvable');
    if ([BeneficiaryStatus.MERGED, BeneficiaryStatus.ARCHIVED].includes(beneficiary.status)) {
      throw new BadRequestException('Acte impossible sur un dossier fusionné ou archivé');
    }

    const vaccine = await this.vaccines.findOne({ where: { id: dto.vaccineId } });
    if (!vaccine || vaccine.status !== 'active') throw new BadRequestException('Vaccin indisponible');

    const status = dto.status ?? ActStatus.PLANNED;
    if (status === ActStatus.ADMINISTERED && !dto.administeredAt) {
      throw new BadRequestException('administeredAt requis pour un acte administré');
    }

    const structureId = dto.structureId ?? beneficiary.originStructureId ?? undefined;
    if (structureId) await this.assertStructureScope(actor, structureId);

    // Rattachement automatique à la version publiée du référentiel courant si non précisé
    let referentialId = dto.referentialId;
    if (!referentialId && dto.ruleId) {
      const rule = await this.rules.findOne({ where: { id: dto.ruleId } });
      referentialId = rule?.referentialId;
    }
    if (!referentialId) {
      const published = await this.referentials.findOne({
        where: { type: 'routine_calendar' as any, status: ReferentialStatus.PUBLISHED },
        order: { version: 'DESC' },
      });
      referentialId = published?.id;
    }

    const act = this.acts.create({
      ...dto,
      status,
      source: dto.source ?? ActSource.ONLINE,
      administeredAt: dto.administeredAt ? new Date(dto.administeredAt) : undefined,
      structureId,
      vaccinatorId: actor.id,
      referentialId,
      createdBy: actor.id,
    });
    const saved = await this.acts.save(act);
    await this.audit.log({
      actorId: actor.id, action: 'act.create', resourceType: 'vaccination_act', resourceId: saved.id,
      ip, userAgent: ua,
      details: { beneficiaryId: dto.beneficiaryId, vaccineId: dto.vaccineId, dose: dto.doseNumber, localId: dto.localId, status },
    });
    return saved;
  }

  async get(actor: User, id: string) {
    const act = await this.acts.findOne({
      where: { id },
      relations: ['beneficiary', 'vaccine', 'presentation', 'rule', 'structure', 'vaccinator', 'corrections', 'corrections.actor'],
    });
    if (!act) throw new NotFoundException('Acte introuvable');
    await this.assertActAccess(actor, act);
    return act;
  }

  async list(actor: User, q: ListActsQuery) {
    const qb = this.acts.createQueryBuilder('a')
      .leftJoinAndSelect('a.beneficiary', 'b')
      .leftJoinAndSelect('a.vaccine', 'v')
      .leftJoinAndSelect('a.structure', 's')
      .orderBy('a.created_at', 'DESC')
      .take(200);

    if (q.beneficiaryId) qb.andWhere('a.beneficiary_id = :bid', { bid: q.beneficiaryId });
    if (q.vaccineId) qb.andWhere('a.vaccine_id = :vid', { vid: q.vaccineId });
    if (q.status) qb.andWhere('a.status = :st', { st: q.status });
    if (q.from) qb.andWhere('a.created_at >= :from', { from: q.from });
    if (q.to) qb.andWhere('a.created_at <= :to', { to: q.to });

    await this.applyScope(actor, qb);
    return qb.getMany();
  }

  /** Historique des corrections d'un acte. */
  async history(actor: User, id: string) {
    await this.get(actor, id);
    return this.corrections.find({
      where: { actId: id },
      relations: ['actor'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Modification d'un acte.
   * - Acte planifié : mise à jour directe, auditée.
   * - Acte administré : chaque champ modifié devient une ActCorrection (jamais d'écrasement silencieux).
   */
  async update(actor: User, id: string, dto: UpdateActDto, reason: string | undefined, ip?: string, ua?: string) {
    const act = await this.acts.findOne({ where: { id } });
    if (!act) throw new NotFoundException('Acte introuvable');
    await this.assertActAccess(actor, act);
    if (act.status !== ActStatus.ADMINISTERED && act.status !== ActStatus.PLANNED) {
      throw new BadRequestException(`Un acte ${act.status} n'est plus modifiable`);
    }

    const editable = ['administeredAt', 'structureId', 'presentationId', 'lotId', 'lotNumber', 'site', 'route', 'notes'] as const;
    const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];
    for (const f of editable) {
      const nv = (dto as any)[f];
      if (nv === undefined) continue;
      const normalized = f === 'administeredAt' && nv ? new Date(nv).toISOString() : nv;
      const ov = act[f] instanceof Date ? (act[f] as Date).toISOString() : act[f];
      if (String(ov ?? '') !== String(normalized ?? '')) {
        changes.push({ field: f, oldValue: ov, newValue: normalized });
      }
    }
    if (changes.length === 0) return act;

    // Transaction : corrections + mise à jour de l'acte — tout ou rien
    const saved = await this.dataSource.transaction(async (em) => {
      if (act.status === ActStatus.ADMINISTERED) {
        if (!reason) throw new BadRequestException('Un motif est obligatoire pour corriger un acte administré');
        const corrRepo = em.getRepository(ActCorrection);
        for (const c of changes) {
          await corrRepo.save(corrRepo.create({
            actId: id, actorId: actor.id, field: c.field,
            oldValue: c.oldValue == null ? null : String(c.oldValue),
            newValue: c.newValue == null ? null : String(c.newValue),
            reason,
          } as ActCorrection));
        }
      }

      Object.assign(act, {
        administeredAt: dto.administeredAt ? new Date(dto.administeredAt) : act.administeredAt,
        structureId: dto.structureId ?? act.structureId,
        presentationId: dto.presentationId ?? act.presentationId,
        lotId: dto.lotId ?? act.lotId,
        lotNumber: dto.lotNumber ?? act.lotNumber,
        site: dto.site ?? act.site,
        route: dto.route ?? act.route,
        notes: dto.notes ?? act.notes,
      });
      return em.getRepository(VaccinationAct).save(act);
    });
    await this.audit.log({
      actorId: actor.id, action: act.status === ActStatus.ADMINISTERED ? 'act.correct' : 'act.update',
      resourceType: 'vaccination_act', resourceId: id, ip, userAgent: ua,
      details: { changes: changes.map((c) => c.field), reason },
    });
    return saved;
  }

  /** Transition de statut : planned → administered | not_performed | cancelled. */
  async transition(actor: User, id: string, dto: TransitionActDto, ip?: string, ua?: string) {
    const act = await this.acts.findOne({ where: { id } });
    if (!act) throw new NotFoundException('Acte introuvable');
    await this.assertActAccess(actor, act);

    const allowed = TRANSITIONS[act.status] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(`Transition ${act.status} → ${dto.status} non autorisée`);
    }
    if (dto.status === ActStatus.ADMINISTERED && !dto.administeredAt && !act.administeredAt) {
      throw new BadRequestException('Date d’administration requise');
    }

    const from = act.status;
    act.status = dto.status;
    if (dto.status === ActStatus.ADMINISTERED) {
      act.administeredAt = new Date(dto.administeredAt ?? act.administeredAt!);
    } else {
      act.cancelReason = dto.reason;
    }
    const saved = await this.acts.save(act);
    await this.audit.log({
      actorId: actor.id, action: `act.${dto.status}`, resourceType: 'vaccination_act', resourceId: id,
      ip, userAgent: ua, details: { from, to: dto.status, reason: dto.reason },
    });
    return saved;
  }

  /** Validation qualité (acte administré → validé). */
  async validate(actor: User, id: string, ip?: string, ua?: string) {
    const act = await this.acts.findOne({ where: { id } });
    if (!act) throw new NotFoundException('Acte introuvable');
    if (act.status !== ActStatus.ADMINISTERED) {
      throw new BadRequestException('Seul un acte administré peut être validé');
    }
    act.validatedBy = actor.id;
    act.validatedAt = new Date();
    const saved = await this.acts.save(act);
    await this.audit.log({ actorId: actor.id, action: 'act.validate', resourceType: 'vaccination_act', resourceId: id, ip, userAgent: ua });
    return saved;
  }

  // ---------- Effets indésirables ----------

  async declareAdverseEvent(actor: User, dto: DeclareAdverseEventDto, ip?: string, ua?: string) {
    if (dto.actId) {
      const act = await this.acts.findOne({ where: { id: dto.actId } });
      if (!act) throw new NotFoundException('Acte introuvable');
      if (act.beneficiaryId !== dto.beneficiaryId) {
        throw new BadRequestException('L’acte ne correspond pas au bénéficiaire');
      }
    }
    const ev = this.adverseEvents.create({
      ...dto,
      occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : undefined,
      declaredBy: actor.id,
    });
    const saved = await this.adverseEvents.save(ev);
    await this.audit.log({
      actorId: actor.id, action: 'adverse_event.declare', resourceType: 'adverse_event', resourceId: saved.id,
      ip, userAgent: ua, details: { beneficiaryId: dto.beneficiaryId, severity: dto.severity },
    });
    return saved;
  }

  async listAdverseEvents(actor: User) {
    const qb = this.adverseEvents.createQueryBuilder('e')
      .leftJoinAndSelect('e.beneficiary', 'b')
      .leftJoinAndSelect('e.declarant', 'u')
      .orderBy('e.created_at', 'DESC').take(200);
    // adverse_events n'a pas de structure_id propre : on filtre via le périmètre
    // du bénéficiaire (structure/territoire d'origine) ou le déclarant.
    if (![RoleCode.NATIONAL_ADMIN, RoleCode.HEALTH_AUTHORITY].includes(actor.role?.code as RoleCode)) {
      const sids = await this.scope.structureIdsFor(actor.id);
      const tids = await this.scope.territoryIdsFor(actor.id);
      const empty = '00000000-0000-0000-0000-000000000000';
      qb.andWhere(
        `(e.declared_by = :uid OR e.beneficiary_id IN (
          SELECT bb.id FROM beneficiaries bb
          LEFT JOIN structures st ON bb.origin_structure_id = st.id
          WHERE bb.origin_structure_id IN (:...sids) OR st.territory_id IN (:...tids)))`,
        { uid: actor.id, sids: sids.length ? sids : [empty], tids: tids.length ? tids : [empty] },
      );
    }
    return qb.getMany();
  }

  // ---------- Périmètre ----------

  private async applyScope(actor: User, qb: any, alias = 'a') {
    if ([RoleCode.NATIONAL_ADMIN, RoleCode.HEALTH_AUTHORITY].includes(actor.role?.code as RoleCode)) return qb;
    const sids = await this.scope.structureIdsFor(actor.id);
    const tids = await this.scope.territoryIdsFor(actor.id);
    const empty = '00000000-0000-0000-0000-000000000000';
    qb.andWhere(
      `(${alias}.structure_id IN (:...sids) OR ${alias}.vaccinator_id = :uid OR ${alias}.created_by = :uid
        OR ${alias}.beneficiary_id IN (SELECT id FROM beneficiaries WHERE origin_structure_id IN (:...sids) OR origin_structure_id IN (SELECT id FROM structures WHERE territory_id IN (:...tids))))`,
      { sids: sids.length ? sids : [empty], tids: tids.length ? tids : [empty], uid: actor.id },
    );
    return qb;
  }

  private async assertStructureScope(actor: User, structureId: string) {
    if ([RoleCode.NATIONAL_ADMIN, RoleCode.HEALTH_AUTHORITY].includes(actor.role?.code as RoleCode)) return;
    const ok = await this.scope.canAccessStructure(actor, structureId);
    if (!ok) throw new ForbiddenException('Structure hors de votre périmètre');
  }

  private async assertActAccess(actor: User, act: VaccinationAct) {
    if ([RoleCode.NATIONAL_ADMIN, RoleCode.HEALTH_AUTHORITY].includes(actor.role?.code as RoleCode)) return;
    const sids = await this.scope.structureIdsFor(actor.id);
    const tids = await this.scope.territoryIdsFor(actor.id);
    if (act.vaccinatorId === actor.id || act.createdBy === actor.id) return;
    if (act.structureId && sids.includes(act.structureId)) return;
    if (act.beneficiary?.originStructure?.territoryId && tids.includes(act.beneficiary.originStructure.territoryId)) return;
    // bénéficiaire sans structure : vérifier via son origine
    const b = act.beneficiary ?? await this.beneficiaries.findOne({
      where: { id: act.beneficiaryId }, relations: ['originStructure'],
    });
    if (b?.originStructureId && sids.includes(b.originStructureId)) return;
    if (b?.originStructure?.territoryId && tids.includes(b.originStructure.territoryId)) return;
    throw new ForbiddenException('Acte hors de votre périmètre');
  }
}
