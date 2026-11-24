import {
  BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vaccine, VaccineStatus } from './entities/vaccine.entity';
import { VaccinePresentation } from './entities/vaccine-presentation.entity';
import { Referential, ReferentialStatus } from './entities/referential.entity';
import { VaccinationRule } from './entities/vaccination-rule.entity';
import { RuleValidation, ValidationDecision } from './entities/rule-validation.entity';
import { CreateVaccineDto, CreatePresentationDto, CreateReferentialDto, CreateRuleDto } from './dto/referentials.dto';
import { User } from '../identity/entities/user.entity';
import { RoleCode } from '../identity/entities/role.entity';
import { AuditService } from '../../common/audit/audit.service';

/** Transitions autorisées du cycle de vie d'un référentiel (M04-F04). */
const TRANSITIONS: Record<ReferentialStatus, ReferentialStatus[]> = {
  [ReferentialStatus.DRAFT]: [ReferentialStatus.SUBMITTED, ReferentialStatus.ARCHIVED],
  [ReferentialStatus.SUBMITTED]: [ReferentialStatus.APPROVED, ReferentialStatus.DRAFT],
  [ReferentialStatus.APPROVED]: [ReferentialStatus.PUBLISHED, ReferentialStatus.WITHDRAWN],
  [ReferentialStatus.PUBLISHED]: [ReferentialStatus.WITHDRAWN, ReferentialStatus.ARCHIVED],
  [ReferentialStatus.WITHDRAWN]: [ReferentialStatus.ARCHIVED],
  [ReferentialStatus.ARCHIVED]: [],
};

@Injectable()
export class ReferentialsService {
  constructor(
    @InjectRepository(Vaccine) private vaccines: Repository<Vaccine>,
    @InjectRepository(VaccinePresentation) private presentations: Repository<VaccinePresentation>,
    @InjectRepository(Referential) private referentials: Repository<Referential>,
    @InjectRepository(VaccinationRule) private rules: Repository<VaccinationRule>,
    @InjectRepository(RuleValidation) private validations: Repository<RuleValidation>,
    private audit: AuditService,
  ) {}

  // ---------- Vaccins ----------

  async listVaccines(status?: VaccineStatus) {
    const qb = this.vaccines.createQueryBuilder('v').leftJoinAndSelect('v.presentations', 'p');
    if (status) qb.where('v.status = :s', { s: status });
    return qb.orderBy('v.name', 'ASC').getMany();
  }

  async createVaccine(actor: User, dto: CreateVaccineDto, ip?: string, ua?: string) {
    const exists = await this.vaccines.findOne({ where: { code: dto.code.toUpperCase() } });
    if (exists) throw new ConflictException('Code vaccin déjà utilisé');
    const v = this.vaccines.create({ ...dto, code: dto.code.toUpperCase() });
    const saved = await this.vaccines.save(v);
    await this.audit.log({ actorId: actor.id, action: 'vaccine.create', resourceType: 'vaccine', resourceId: saved.id, ip, userAgent: ua });
    return saved;
  }

  async addPresentation(vaccineId: string, dto: CreatePresentationDto) {
    const v = await this.vaccines.findOne({ where: { id: vaccineId } });
    if (!v) throw new NotFoundException('Vaccin introuvable');
    return this.presentations.save(this.presentations.create({ ...dto, vaccineId }));
  }

  // ---------- Référentiels ----------

  async listReferentials(status?: ReferentialStatus, type?: string) {
    const qb = this.referentials.createQueryBuilder('r')
      .leftJoinAndSelect('r.rules', 'rule')
      .leftJoinAndSelect('rule.vaccine', 'v')
      .orderBy('r.type', 'ASC').addOrderBy('r.version', 'DESC');
    if (status) qb.where('r.status = :s', { s: status });
    if (type) qb.andWhere('r.type = :t', { t: type });
    return qb.getMany();
  }

  async getReferential(id: string) {
    const r = await this.referentials.findOne({
      where: { id },
      relations: ['rules', 'rules.vaccine', 'validations', 'validations.actor'],
    });
    if (!r) throw new NotFoundException('Référentiel introuvable');
    return r;
  }

  /** Version publiée courante d'un type (utilisée par les calculs d'échéances). */
  async getPublished(type: string): Promise<Referential | null> {
    return this.referentials.findOne({
      where: { type: type as any, status: ReferentialStatus.PUBLISHED },
      relations: ['rules', 'rules.vaccine'],
      order: { version: 'DESC' },
    });
  }

  /** Crée une nouvelle version (brouillon) — le numéro est incrémenté par type. */
  async createVersion(actor: User, dto: CreateReferentialDto, ip?: string, ua?: string) {
    const last = await this.referentials.findOne({
      where: { type: dto.type as any },
      order: { version: 'DESC' },
    });
    const version = (last?.version ?? 0) + 1;
    const r = this.referentials.create({
      ...dto,
      type: dto.type,
      version,
      effectiveFrom: new Date(dto.effectiveFrom),
      createdBy: actor.id,
    });
    const saved = await this.referentials.save(r);
    await this.audit.log({
      actorId: actor.id, action: 'referential.create', resourceType: 'referential', resourceId: saved.id,
      ip, userAgent: ua, details: { type: dto.type, version },
    });
    return saved;
  }

  async addRule(actor: User, referentialId: string, dto: CreateRuleDto, ip?: string, ua?: string) {
    const r = await this.getReferential(referentialId);
    if (r.status !== ReferentialStatus.DRAFT) {
      throw new BadRequestException('Les règles ne sont modifiables qu’en brouillon (avant soumission)');
    }
    const vaccine = await this.vaccines.findOne({ where: { id: dto.vaccineId } });
    if (!vaccine) throw new NotFoundException('Vaccin introuvable');
    if (dto.maxAgeDays != null && dto.minAgeDays != null && dto.maxAgeDays < dto.minAgeDays) {
      throw new BadRequestException('maxAgeDays doit être ≥ minAgeDays');
    }
    const rule = this.rules.create({ ...dto, referentialId });
    const saved = await this.rules.save(rule);
    await this.audit.log({
      actorId: actor.id, action: 'referential.rule_add', resourceType: 'vaccination_rule', resourceId: saved.id,
      ip, userAgent: ua, details: { referentialId, vaccineId: dto.vaccineId, dose: dto.doseNumber },
    });
    return saved;
  }

  async removeRule(actor: User, referentialId: string, ruleId: string) {
    const r = await this.getReferential(referentialId);
    if (r.status !== ReferentialStatus.DRAFT) {
      throw new BadRequestException('Suppression possible uniquement en brouillon');
    }
    const rule = r.rules.find((x) => x.id === ruleId);
    if (!rule) throw new NotFoundException('Règle introuvable');
    await this.rules.delete(ruleId);
    await this.audit.log({ actorId: actor.id, action: 'referential.rule_remove', resourceType: 'vaccination_rule', resourceId: ruleId });
  }

  /** Soumission pour validation (draft → submitted). */
  async submit(actor: User, id: string, ip?: string, ua?: string) {
    return this.transition(actor, id, ReferentialStatus.SUBMITTED, { submittedBy: actor.id }, 'referential.submit', ip, ua);
  }

  /** Validation métier/médicale (submitted → approved). */
  async approve(actor: User, id: string, comment?: string, ip?: string, ua?: string) {
    const r = await this.getReferential(id);
    if (!this.canValidate(actor)) {
      throw new ForbiddenException('Validation réservée aux autorités sanitaires');
    }
    const decision = await this.validations.save(this.validations.create({
      referentialId: id, actorId: actor.id, decision: ValidationDecision.APPROVED, comment,
    }));
    return this.transition(actor, id, ReferentialStatus.APPROVED, { approvedBy: actor.id, approvedAt: new Date() }, 'referential.approve', ip, ua, decision.id);
  }

  /** Publication (approved → published) : retire la version publiée précédente du même type. */
  async publish(actor: User, id: string, ip?: string, ua?: string) {
    const r = await this.getReferential(id);
    if (r.status !== ReferentialStatus.APPROVED) {
      throw new BadRequestException('Seul un référentiel approuvé peut être publié');
    }
    if (r.rules.length === 0) {
      throw new BadRequestException('Impossible de publier un référentiel sans règles');
    }
    // Retrait des versions publiées précédentes du même type (elles passent en archived)
    await this.referentials.update(
      { type: r.type, status: ReferentialStatus.PUBLISHED },
      { status: ReferentialStatus.ARCHIVED },
    );
    const saved = await this.transition(actor, id, ReferentialStatus.PUBLISHED, { publishedAt: new Date() }, 'referential.publish', ip, ua);
    return saved;
  }

  async withdraw(actor: User, id: string, comment?: string, ip?: string, ua?: string) {
    return this.transition(actor, id, ReferentialStatus.WITHDRAWN, {}, 'referential.withdraw', ip, ua, undefined, comment);
  }

  private canValidate(actor: User): boolean {
    return [RoleCode.NATIONAL_ADMIN, RoleCode.HEALTH_AUTHORITY].includes(actor.role?.code as RoleCode);
  }

  private async transition(
    actor: User,
    id: string,
    to: ReferentialStatus,
    patch: Partial<Referential>,
    action: string,
    ip?: string,
    ua?: string,
    decisionId?: string,
    comment?: string,
  ) {
    const r = await this.getReferential(id);
    const allowed = TRANSITIONS[r.status] ?? [];
    if (!allowed.includes(to)) {
      throw new BadRequestException(`Transition ${r.status} → ${to} non autorisée`);
    }
    const from = r.status;
    Object.assign(r, patch, { status: to });
    const saved = await this.referentials.save(r);
    await this.audit.log({
      actorId: actor.id, action, resourceType: 'referential', resourceId: id,
      ip, userAgent: ua,
      details: { from, to, version: r.version, type: r.type, decisionId, comment },
    });
    return saved;
  }
}
