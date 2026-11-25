import {
  BadRequestException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VaccinationAttestation, AttestationStatus } from './entities/vaccination-attestation.entity';
import { Beneficiary, BeneficiaryStatus } from '../beneficiaries/entities/beneficiary.entity';
import { VaccinationAct, ActStatus } from '../vaccination-acts/entities/vaccination-act.entity';
import { Referential, ReferentialStatus, ReferentialType } from '../referentials/entities/referential.entity';
import { VaccinationRule } from '../referentials/entities/vaccination-rule.entity';
import { Vaccine } from '../referentials/entities/vaccine.entity';
import { User } from '../identity/entities/user.entity';
import { RoleCode } from '../identity/entities/role.entity';
import { AuditService } from '../../common/audit/audit.service';
import { ScopeService } from '../../common/scope/scope.service';
import { randomInt } from 'crypto';

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const DAY = 24 * 60 * 60 * 1000;

export interface ScheduleDose {
  rule: VaccinationRule;
  status: 'completed' | 'due' | 'upcoming' | 'overdue' | 'unknown_age';
  act?: VaccinationAct;
  eligibleAt?: Date;
  deadlineAt?: Date;
}

export interface ScheduleVaccine {
  vaccine: Vaccine;
  doses: ScheduleDose[];
  status: 'complete' | 'in_progress' | 'not_started' | 'unknown_age';
  nextDueAt?: Date;
}

@Injectable()
export class RecordService {
  constructor(
    @InjectRepository(VaccinationAttestation) private attestations: Repository<VaccinationAttestation>,
    @InjectRepository(Beneficiary) private beneficiaries: Repository<Beneficiary>,
    @InjectRepository(VaccinationAct) private acts: Repository<VaccinationAct>,
    @InjectRepository(Referential) private referentials: Repository<Referential>,
    @InjectRepository(VaccinationRule) private rules: Repository<VaccinationRule>,
    @InjectRepository(Vaccine) private vaccines: Repository<Vaccine>,
    private audit: AuditService,
    private scope: ScopeService,
  ) {}

  /** Dossier vaccinal complet : identité + actes + échéancier calculé. */
  async getRecord(actor: User, beneficiaryId: string) {
    const b = await this.getBeneficiaryScoped(actor, beneficiaryId);
    const acts = await this.acts.find({
      where: { beneficiaryId, status: ActStatus.ADMINISTERED },
      relations: ['vaccine', 'presentation', 'structure', 'vaccinator'],
      order: { administeredAt: 'ASC' },
    });
    const schedule = await this.computeSchedule(b);
    return { beneficiary: b, acts, schedule, generatedAt: new Date() };
  }

  /** Échéancier seul (réutilisable par le portail et les rappels M10). */
  async getSchedule(actor: User, beneficiaryId: string) {
    const b = await this.getBeneficiaryScoped(actor, beneficiaryId);
    return this.computeSchedule(b);
  }

  /**
   * Calcule l'échéancier depuis le référentiel `routine_calendar` publié.
   * Règles : dose complétée = acte administré correspondant ;
   * éligibilité = max(début fenêtre d'âge, date dose précédente + intervalle min) ;
   * overdue = fin de fenêtre d'âge dépassée.
   */
  async computeSchedule(b: Beneficiary): Promise<{ referential: Referential | null; vaccines: ScheduleVaccine[] }> {
    const ref = await this.referentials.findOne({
      where: { type: ReferentialType.ROUTINE_CALENDAR, status: ReferentialStatus.PUBLISHED },
      relations: ['rules', 'rules.vaccine'],
      order: { version: 'DESC' },
    });
    if (!ref || !ref.rules?.length) return { referential: ref ?? null, vaccines: [] };

    const acts = await this.acts.find({
      where: { beneficiaryId: b.id, status: ActStatus.ADMINISTERED },
      order: { administeredAt: 'ASC' },
    });

    // Regroupe les règles par vaccin, triées par numéro de dose
    const byVaccine = new Map<string, VaccinationRule[]>();
    for (const r of ref.rules) {
      const list = byVaccine.get(r.vaccineId) ?? [];
      list.push(r);
      byVaccine.set(r.vaccineId, list);
    }

    const vaccines: ScheduleVaccine[] = [];
    const today = new Date();
    const birth = b.birthDate ? new Date(b.birthDate) : null;

    for (const [vaccineId, rules] of byVaccine) {
      rules.sort((a, b2) => a.doseNumber - b2.doseNumber);
      const vaccineActs = acts
        .filter((a) => a.vaccineId === vaccineId)
        .sort((a, b2) => a.doseNumber - b2.doseNumber);

      const doses: ScheduleDose[] = [];
      let lastActDate: Date | null = null;
      let hasUnknown = false;

      for (const rule of rules) {
        const act = vaccineActs.find((a) => a.doseNumber === rule.doseNumber);
        if (act) {
          doses.push({ rule, status: 'completed', act, eligibleAt: act.administeredAt ?? undefined });
          lastActDate = act.administeredAt ?? lastActDate;
          continue;
        }
        if (!birth) {
          doses.push({ rule, status: 'unknown_age' });
          hasUnknown = true;
          continue;
        }
        // Date d'éligibilité : le plus tardif entre fin de fenêtre min d'âge et intervalle depuis la dose précédente
        const minAgeDate = rule.minAgeDays != null ? new Date(birth.getTime() + rule.minAgeDays * DAY) : birth;
        const intervalDate = rule.minIntervalDays != null && lastActDate
          ? new Date(lastActDate.getTime() + rule.minIntervalDays * DAY)
          : null;
        const eligible = intervalDate && intervalDate > minAgeDate ? intervalDate : minAgeDate;
        const deadline = rule.maxAgeDays != null ? new Date(birth.getTime() + rule.maxAgeDays * DAY) : undefined;

        let status: ScheduleDose['status'];
        if (today > eligible) {
          status = deadline && today > deadline ? 'overdue' : 'due';
        } else {
          status = 'upcoming';
        }
        doses.push({ rule, status, eligibleAt: eligible, deadlineAt: deadline });
      }

      const completed = doses.filter((d) => d.status === 'completed').length;
      const nextDue = doses
        .filter((d) => ['due', 'upcoming'].includes(d.status) && d.eligibleAt)
        .map((d) => d.eligibleAt!)
        .sort((a, b2) => a.getTime() - b2.getTime())[0];

      vaccines.push({
        vaccine: rules[0].vaccine,
        doses,
        status: hasUnknown ? 'unknown_age' : completed === rules.length ? 'complete' : completed > 0 ? 'in_progress' : 'not_started',
        nextDueAt: nextDue,
      });
    }

    return { referential: ref, vaccines };
  }

  // ---------- Attestations ----------

  private async generateReference(): Promise<string> {
    for (let i = 0; i < 10; i++) {
      let code = '';
      for (let j = 0; j < 8; j++) code += ALPHABET[randomInt(ALPHABET.length)];
      const ref = `ATT-${code}`;
      if (!(await this.attestations.findOne({ where: { reference: ref } }))) return ref;
    }
    throw new BadRequestException('Impossible de générer une référence unique');
  }

  /** Délivre une attestation : snapshot figé du dossier au moment T. */
  async issueAttestation(actor: User, beneficiaryId: string, ip?: string, ua?: string) {
    const b = await this.getBeneficiaryScoped(actor, beneficiaryId);
    const record = await this.getRecord(actor, beneficiaryId);

    const administered = record.acts.map((a) => ({
      vaccine: a.vaccine?.name,
      dose: a.doseNumber,
      date: a.administeredAt,
      structure: a.structure?.name,
    }));
    if (administered.length === 0) {
      throw new BadRequestException('Aucune vaccination administrée : attestation impossible');
    }

    const att = this.attestations.create({
      reference: await this.generateReference(),
      beneficiaryId: b.id,
      issuedBy: actor.id,
      issuedAt: new Date(),
      content: {
        beneficiary: {
          immuniqId: b.immuniqId,
          name: `${b.firstName} ${b.lastName}`,
          birthDate: b.birthDate,
          sex: b.sex,
        },
        referentialVersion: record.schedule.referential
          ? `${record.schedule.referential.type} v${record.schedule.referential.version}`
          : null,
        doses: administered,
        schedule: record.schedule.vaccines.map((v) => ({
          vaccine: v.vaccine.name,
          status: v.status,
          nextDueAt: v.nextDueAt ?? null,
        })),
        issuedAt: new Date().toISOString(),
      },
    });
    const saved = await this.attestations.save(att);
    await this.audit.log({
      actorId: actor.id, action: 'attestation.issue', resourceType: 'vaccination_attestation',
      resourceId: saved.id, ip, userAgent: ua, details: { beneficiaryId, reference: saved.reference },
    });
    return saved;
  }

  async listAttestations(actor: User, beneficiaryId: string) {
    await this.getBeneficiaryScoped(actor, beneficiaryId);
    return this.attestations.find({
      where: { beneficiaryId },
      relations: ['issuer'],
      order: { issuedAt: 'DESC' },
    });
  }

  async revokeAttestation(actor: User, attestationId: string, reason: string, ip?: string, ua?: string) {
    const att = await this.attestations.findOne({ where: { id: attestationId } });
    if (!att) throw new NotFoundException('Attestation introuvable');
    if (att.status === AttestationStatus.REVOKED) throw new BadRequestException('Attestation déjà révoquée');
    att.status = AttestationStatus.REVOKED;
    att.revokeReason = reason;
    const saved = await this.attestations.save(att);
    await this.audit.log({
      actorId: actor.id, action: 'attestation.revoke', resourceType: 'vaccination_attestation',
      resourceId: attestationId, ip, userAgent: ua, details: { reason },
    });
    return saved;
  }

  // ---------- Accès ----------

  private async getBeneficiaryScoped(actor: User, beneficiaryId: string): Promise<Beneficiary> {
    const b = await this.beneficiaries.findOne({
      where: { id: beneficiaryId },
      relations: ['originStructure'],
    });
    if (!b) throw new NotFoundException('Bénéficiaire introuvable');
    if (b.status === BeneficiaryStatus.MERGED) {
      throw new BadRequestException('Dossier fusionné : utiliser le dossier de destination');
    }
    if ([RoleCode.NATIONAL_ADMIN, RoleCode.HEALTH_AUTHORITY].includes(actor.role?.code as RoleCode)) return b;

    const sids = await this.scope.structureIdsFor(actor.id);
    const tids = await this.scope.territoryIdsFor(actor.id);
    if (b.originStructureId && sids.includes(b.originStructureId)) return b;
    if (b.originStructure?.territoryId && tids.includes(b.originStructure.territoryId)) return b;
    // Repli : l'utilisateur a déjà des actes sur ce bénéficiaire
    const ownAct = await this.acts.findOne({ where: { beneficiaryId, createdBy: actor.id } });
    if (ownAct) return b;
    throw new ForbiddenException('Dossier hors de votre périmètre');
  }
}
