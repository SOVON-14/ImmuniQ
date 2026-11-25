import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportExport, ExportType, ExportFormat } from './entities/report-export.entity';
import { ReportQueryDto, ExportDto } from './dto/reporting.dto';
import { VaccinationAct, ActStatus } from '../vaccination-acts/entities/vaccination-act.entity';
import { Beneficiary, BeneficiaryStatus } from '../beneficiaries/entities/beneficiary.entity';
import { StockLevel } from '../logistics/entities/stock-level.entity';
import { ColdChainIncident, IncidentStatus } from '../cold-chain/entities/cold-chain-incident.entity';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { User } from '../identity/entities/user.entity';
import { RoleCode } from '../identity/entities/role.entity';
import { ScopeService } from '../../common/scope/scope.service';
import { AuditService } from '../../common/audit/audit.service';

/**
 * M11 — Reporting : indicateurs de pilotage et exports tracés.
 * Toutes les requêtes sont bornées par le périmètre de l'utilisateur.
 */
@Injectable()
export class ReportingService {
  constructor(
    @InjectRepository(ReportExport) private exports: Repository<ReportExport>,
    @InjectRepository(VaccinationAct) private acts: Repository<VaccinationAct>,
    @InjectRepository(Beneficiary) private beneficiaries: Repository<Beneficiary>,
    @InjectRepository(StockLevel) private levels: Repository<StockLevel>,
    @InjectRepository(ColdChainIncident) private incidents: Repository<ColdChainIncident>,
    @InjectRepository(Campaign) private campaignRepo: Repository<Campaign>,
    private scope: ScopeService,
    private audit: AuditService,
  ) {}

  // ---------- Indicateurs ----------

  /** Couverture : bénéficiaires distincts vaccinés / bénéficiaires enregistrés, par vaccin. */
  async coverage(actor: User, q: ReportQueryDto) {

    const allB = await this.beneficiaries.find({ relations: ['originStructure'] });
    const scopedB = await this.filterBeneficiaries(actor, allB);
    const total = scopedB.filter((b) => b.status !== BeneficiaryStatus.MERGED).length;

    const vaxQb = this.acts.createQueryBuilder('a')
      .select('a.vaccine_id', 'vaccineId')
      .addSelect('v.name', 'vaccine')
      .addSelect('COUNT(DISTINCT a.beneficiary_id)', 'vaccinated')
      .addSelect('COUNT(*)', 'doses')
      .leftJoin('vaccines', 'v', 'v.id = a.vaccine_id')
      .where('a.status = :st', { st: ActStatus.ADMINISTERED })
      .groupBy('a.vaccine_id').addGroupBy('v.name');
    await this.applyActScope(vaxQb, actor, q);
    const perVaccine = await vaxQb.getRawMany();

    return {
      totalBeneficiaries: total,
      perVaccine: perVaccine.map((r) => ({
        vaccineId: r.vaccineId,
        vaccine: r.vaccine,
        vaccinated: Number(r.vaccinated),
        doses: Number(r.doses),
        coverageRate: total > 0 ? Number(((Number(r.vaccinated) / total) * 100).toFixed(1)) : 0,
      })),
      filters: q,
    };
  }

  /** Activité des actes sur une période. */
  async activity(actor: User, q: ReportQueryDto) {
    const qb = this.acts.createQueryBuilder('a')
      .select('a.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COUNT(DISTINCT a.beneficiary_id)', 'beneficiaries')
      .groupBy('a.status');
    if (q.from) qb.andWhere('a.created_at >= :from', { from: q.from });
    if (q.to) qb.andWhere('a.created_at <= :to', { to: q.to });
    if (q.structureId) qb.andWhere('a.structure_id = :sid', { sid: q.structureId });
    if (q.vaccineId) qb.andWhere('a.vaccine_id = :vid', { vid: q.vaccineId });
    await this.applyActScope(qb, actor, q);
    const rows = await qb.getRawMany();
    return { byStatus: rows, filters: q };
  }

  /** Stocks : quantités par structure/produit + alertes expiration. */
  async stock(actor: User, q: ReportQueryDto) {
    const qb = this.levels.createQueryBuilder('s')
      .leftJoinAndSelect('s.lot', 'l')
      .leftJoinAndSelect('l.product', 'p')
      .leftJoinAndSelect('s.structure', 'st')
      .where('s.quantity_on_hand > 0');
    if (q.structureId) qb.andWhere('s.structure_id = :sid', { sid: q.structureId });
    const rows = await qb.getMany();
    const filtered = await this.filterLevels(actor, rows);

    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 24 * 3600 * 1000);
    return {
      levels: filtered.map((s) => ({
        structure: s.structure?.name,
        product: s.lot?.product?.name,
        lot: s.lot?.lotNumber,
        quantity: s.quantityOnHand,
        expiryDate: s.lot?.expiryDate,
        expired: s.lot ? new Date(s.lot.expiryDate) <= now : false,
        expiringSoon: s.lot ? new Date(s.lot.expiryDate) <= in30 : false,
      })),
      alerts: {
        expiredLots: filtered.filter((s) => s.lot && new Date(s.lot.expiryDate) <= now).length,
        expiringWithin30d: filtered.filter((s) => s.lot && new Date(s.lot.expiryDate) > now && new Date(s.lot.expiryDate) <= in30).length,
      },
    };
  }

  /** Chaîne du froid : incidents par statut/sévérité. */
  async coldChain(actor: User, q: ReportQueryDto) {
    const qb = this.incidents.createQueryBuilder('i')
      .leftJoinAndSelect('i.equipment', 'e')
      .leftJoinAndSelect('e.structure', 's')
      .orderBy('i.detected_at', 'DESC').take(500);
    if (q.from) qb.andWhere('i.detected_at >= :from', { from: q.from });
    if (q.to) qb.andWhere('i.detected_at <= :to', { to: q.to });
    if (q.structureId) qb.andWhere('e.structure_id = :sid', { sid: q.structureId });
    const rows = await qb.getMany();
    const filtered = await this.filterIncidents(actor, rows);

    const byStatus = filtered.reduce<Record<string, number>>((acc, i) => {
      acc[i.status] = (acc[i.status] ?? 0) + 1;
      return acc;
    }, {});
    const open = filtered.filter((i) => [IncidentStatus.OPEN, IncidentStatus.INVESTIGATING].includes(i.status));
    return { total: filtered.length, byStatus, openIncidents: open.length, incidents: open.slice(0, 50), filters: q };
  }

  /** Campagnes : avancement et volumes d'actes. */
  async campaignsReport(actor: User) {
    const rows = await this.campaignRepo.createQueryBuilder('c')
      .leftJoinAndSelect('c.sessions', 's')
      .orderBy('c.created_at', 'DESC').getMany();
    const filtered = await this.filterCampaigns(actor, rows);
    return filtered.map((c) => ({
      id: c.id, code: c.code, name: c.name, type: c.type, status: c.status,
      startDate: c.startDate, endDate: c.endDate,
      sessions: c.sessions?.length ?? 0,
    }));
  }

  // ---------- Exports tracés ----------

  /** Génère un export CSV/JSON et l'enregistre dans report_exports. */
  async export(actor: User, dto: ExportDto, ip?: string, ua?: string) {
    let rows: Record<string, unknown>[] = [];
    let headers: string[] = [];

    if (dto.type === ExportType.ACTS) {
      const qb = this.acts.createQueryBuilder('a')
        .leftJoinAndSelect('a.beneficiary', 'b')
        .leftJoinAndSelect('a.vaccine', 'v')
        .leftJoinAndSelect('a.structure', 's')
        .orderBy('a.created_at', 'DESC').take(10000);
      if (dto.from) qb.andWhere('a.created_at >= :from', { from: dto.from });
      if (dto.to) qb.andWhere('a.created_at <= :to', { to: dto.to });
      if (dto.structureId) qb.andWhere('a.structure_id = :sid', { sid: dto.structureId });
      if (dto.vaccineId) qb.andWhere('a.vaccine_id = :vid', { vid: dto.vaccineId });
      await this.applyActScope(qb, actor, dto);
      const acts = await qb.getMany();
      headers = ['id', 'immuniq_id', 'bénéficiaire', 'vaccin', 'dose', 'statut', 'administré_le', 'structure'];
      rows = acts.map((a) => ({
        id: a.id,
        immuniq_id: a.beneficiary?.immuniqId,
        bénéficiaire: a.beneficiary ? `${a.beneficiary.firstName} ${a.beneficiary.lastName}` : null,
        vaccin: a.vaccine?.name,
        dose: a.doseNumber,
        statut: a.status,
        administré_le: a.administeredAt,
        structure: a.structure?.name,
      }));
    } else if (dto.type === ExportType.BENEFICIARIES) {
      const qb = this.beneficiaries.createQueryBuilder('b')
        .leftJoinAndSelect('b.originStructure', 's')
        .orderBy('b.last_name', 'ASC').take(10000);
      const all = await qb.getMany();
      const bs = await this.filterBeneficiaries(actor, all);
      headers = ['immuniq_id', 'nom', 'prénom', 'naissance', 'sexe', 'téléphone', 'commune', 'structure'];
      rows = bs.map((b) => ({
        immuniq_id: b.immuniqId, nom: b.lastName, prénom: b.firstName,
        naissance: b.birthDate, sexe: b.sex, téléphone: b.phone,
        commune: b.commune, structure: b.originStructure?.name,
      }));
    } else {
      const data = dto.type === ExportType.STOCK ? await this.stock(actor, dto) : await this.campaignsReport(actor);
      rows = Array.isArray(data) ? data as any : [data as any];
      headers = rows.length ? Object.keys(rows[0]) : [];
    }

    const exp = await this.exports.save(this.exports.create({
      type: dto.type, format: dto.format ?? ExportFormat.CSV, params: dto as any,
      rowCount: rows.length, generatedBy: actor.id,
    } as ReportExport));
    await this.audit.log({
      actorId: actor.id, action: 'export.create', resourceType: 'report_export', resourceId: exp.id,
      ip, userAgent: ua, details: { type: dto.type, rows: rows.length },
    });

    const format = dto.format ?? ExportFormat.CSV;
    if (format === ExportFormat.JSON) return { exportId: exp.id, format: 'json', data: rows };
    return { exportId: exp.id, format: 'csv', csv: toCsv(headers, rows) };
  }

  async listExports(actor: User) {
    const qb = this.exports.createQueryBuilder('e')
      .leftJoinAndSelect('e.generator', 'u')
      .orderBy('e.generated_at', 'DESC').take(200);
    const rows = await qb.getMany();
    if ([RoleCode.NATIONAL_ADMIN, RoleCode.HEALTH_AUTHORITY].includes(actor.role?.code as RoleCode)) return rows;
    return rows.filter((r) => r.generatedBy === actor.id);
  }

  // ---------- Périmètre ----------

  private async applyActScope(qb: any, actor: User, q: ReportQueryDto) {
    if ([RoleCode.NATIONAL_ADMIN, RoleCode.HEALTH_AUTHORITY].includes(actor.role?.code as RoleCode)) return qb;
    const sids = await this.scope.structureIdsFor(actor.id);
    const empty = '00000000-0000-0000-0000-000000000000';
    qb.andWhere('a.structure_id IN (:...sids)', { sids: sids.length ? sids : [empty] });
    return qb;
  }

  private applyBeneficiaryScope(qb: any, actor: User, q: ReportQueryDto) {
    // Le filtrage fin se fait en mémoire via filterBeneficiaries (origine territoriale)
    return qb;
  }

  private async filterBeneficiaries(actor: User, rows: Beneficiary[]) {
    if ([RoleCode.NATIONAL_ADMIN, RoleCode.HEALTH_AUTHORITY].includes(actor.role?.code as RoleCode)) return rows;
    const sids = await this.scope.structureIdsFor(actor.id);
    const tids = await this.scope.territoryIdsFor(actor.id);
    return rows.filter((b) =>
      (b.originStructureId && sids.includes(b.originStructureId)) ||
      (b.originStructure?.territoryId && tids.includes(b.originStructure.territoryId)) ||
      b.createdBy === actor.id);
  }

  private async filterLevels(actor: User, rows: StockLevel[]) {
    if ([RoleCode.NATIONAL_ADMIN, RoleCode.HEALTH_AUTHORITY].includes(actor.role?.code as RoleCode)) return rows;
    const sids = await this.scope.structureIdsFor(actor.id);
    return rows.filter((r) => sids.includes(r.structureId));
  }

  private async filterIncidents(actor: User, rows: ColdChainIncident[]) {
    if ([RoleCode.NATIONAL_ADMIN, RoleCode.HEALTH_AUTHORITY].includes(actor.role?.code as RoleCode)) return rows;
    const sids = await this.scope.structureIdsFor(actor.id);
    return rows.filter((i) => !i.equipment?.structureId || sids.includes(i.equipment.structureId));
  }

  private async filterCampaigns(actor: User, rows: Campaign[]) {
    if ([RoleCode.NATIONAL_ADMIN, RoleCode.HEALTH_AUTHORITY].includes(actor.role?.code as RoleCode)) return rows;
    const sids = await this.scope.structureIdsFor(actor.id);
    const tids = await this.scope.territoryIdsFor(actor.id);
    return rows.filter((c) =>
      (c.structureId && sids.includes(c.structureId)) ||
      (c.territoryId && tids.includes(c.territoryId)) || c.createdBy === actor.id);
  }
}

function toCsv(headers: string[], rows: Record<string, unknown>[]): string {
  const esc = (v: unknown) => {
    const s = v == null ? '' : v instanceof Date ? v.toISOString() : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(';'), ...rows.map((r) => headers.map((h) => esc(r[h])).join(';'))].join('\n');
}
