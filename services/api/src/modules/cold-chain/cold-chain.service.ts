import {
  BadRequestException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ColdChainEquipment, EquipmentStatus } from './entities/cold-chain-equipment.entity';
import { TemperatureReading } from './entities/temperature-reading.entity';
import { ColdChainIncident, IncidentStatus, IncidentSeverity, LotDecision } from './entities/cold-chain-incident.entity';
import {
  CreateEquipmentDto, UpdateEquipmentDto, RecordReadingsDto,
  CreateIncidentDto, DecideIncidentDto,
} from './dto/cold-chain.dto';
import { User } from '../identity/entities/user.entity';
import { RoleCode } from '../identity/entities/role.entity';
import { AuditService } from '../../common/audit/audit.service';
import { ScopeService } from '../../common/scope/scope.service';

@Injectable()
export class ColdChainService {
  constructor(
    @InjectRepository(ColdChainEquipment) private equipment: Repository<ColdChainEquipment>,
    @InjectRepository(TemperatureReading) private readings: Repository<TemperatureReading>,
    @InjectRepository(ColdChainIncident) private incidents: Repository<ColdChainIncident>,
    private audit: AuditService,
    private scope: ScopeService,
  ) {}

  // ---------- Équipements ----------

  async listEquipment(actor: User, structureId?: string) {
    const qb = this.equipment.createQueryBuilder('e')
      .leftJoinAndSelect('e.structure', 's')
      .orderBy('e.code', 'ASC');
    if (structureId) qb.where('e.structure_id = :sid', { sid: structureId });
    const rows = await qb.getMany();
    if ([RoleCode.NATIONAL_ADMIN, RoleCode.HEALTH_AUTHORITY].includes(actor.role?.code as RoleCode)) return rows;
    const sids = await this.scope.structureIdsFor(actor.id);
    return rows.filter((e) => !e.structureId || sids.includes(e.structureId));
  }

  async getEquipment(actor: User, id: string) {
    const eq = await this.equipment.findOne({ where: { id }, relations: ['structure'] });
    if (!eq) throw new NotFoundException('Équipement introuvable');
    await this.assertEquipmentAccess(actor, eq);
    return eq;
  }

  async createEquipment(actor: User, dto: CreateEquipmentDto, ip?: string, ua?: string) {
    if (dto.maxTempC <= dto.minTempC) throw new BadRequestException('maxTempC doit être > minTempC');
    if (dto.structureId) await this.assertStructureWrite(actor, dto.structureId);
    const exists = await this.equipment.findOne({ where: { code: dto.code.toUpperCase() } });
    if (exists) throw new BadRequestException('Code équipement déjà utilisé');
    const eq = await this.equipment.save(this.equipment.create({
      ...dto, code: dto.code.toUpperCase(),
      commissionedAt: dto.commissionedAt ? new Date(dto.commissionedAt) : undefined,
    }));
    await this.audit.log({ actorId: actor.id, action: 'coldchain.equipment_create', resourceType: 'cold_chain_equipment', resourceId: eq.id, ip, userAgent: ua });
    return eq;
  }

  async updateEquipment(actor: User, id: string, dto: UpdateEquipmentDto, ip?: string, ua?: string) {
    const eq = await this.getEquipment(actor, id);
    await this.assertStructureWrite(actor, eq.structureId);
    if (dto.minTempC != null && dto.maxTempC != null && dto.maxTempC <= dto.minTempC) {
      throw new BadRequestException('maxTempC doit être > minTempC');
    }
    Object.assign(eq, dto);
    const saved = await this.equipment.save(eq);
    await this.audit.log({ actorId: actor.id, action: 'coldchain.equipment_update', resourceType: 'cold_chain_equipment', resourceId: id, ip, userAgent: ua });
    return saved;
  }

  // ---------- Relevés de température ----------

  /**
   * Enregistre un lot de relevés. Toute valeur hors de la plage requise
   * déclenche (ou alimente) un incident ouvert — jamais de suppression.
   */
  async recordReadings(actor: User, equipmentId: string, dto: RecordReadingsDto, ip?: string, ua?: string) {
    const eq = await this.getEquipment(actor, equipmentId);
    await this.assertStructureWrite(actor, eq.structureId);
    if (eq.status === EquipmentStatus.INACTIVE) throw new BadRequestException('Équipement inactif');

    let excursionMin: number | null = null;
    let excursionMax: number | null = null;
    let worstDev = 0;

    const saved: TemperatureReading[] = [];
    for (const r of dto.readings) {
      const temp = Number(r.temperatureC);
      const reading = await this.readings.save(this.readings.create({
        equipmentId, recordedAt: new Date(r.recordedAt), temperatureC: temp,
        source: r.source, recordedBy: actor.id, notes: r.notes,
      }));
      saved.push(reading);

      const devLow = Number(eq.minTempC) - temp;
      const devHigh = temp - Number(eq.maxTempC);
      const dev = Math.max(devLow, devHigh);
      if (dev > 0) {
        excursionMin = excursionMin == null ? temp : Math.min(excursionMin, temp);
        excursionMax = excursionMax == null ? temp : Math.max(excursionMax, temp);
        worstDev = Math.max(worstDev, dev);
      }
    }

    // Incident auto si excursion et aucun incident déjà ouvert sur cet équipement
    let incident: ColdChainIncident | null = null;
    if (excursionMin != null) {
      const open = await this.incidents.findOne({
        where: { equipmentId, status: IncidentStatus.OPEN as any },
      }) ?? await this.incidents.findOne({
        where: { equipmentId, status: IncidentStatus.INVESTIGATING as any },
      });
      if (!open) {
        const created = await this.incidents.save(this.incidents.create({
          equipmentId,
          detectedAt: saved[saved.length - 1].recordedAt,
          status: IncidentStatus.OPEN,
          severity: worstDev >= 3 ? IncidentSeverity.HIGH : IncidentSeverity.MEDIUM,
          description: `Excursion automatique : relevé hors plage [${eq.minTempC} ; ${eq.maxTempC}]°C`,
          tempMinObserved: excursionMin!,
          tempMaxObserved: excursionMax!,
          requiredMinC: Number(eq.minTempC),
          requiredMaxC: Number(eq.maxTempC),
          createdBy: actor.id,
        }));
        incident = created;
        // rattache les relevés en excursion à l'incident
        for (const r of saved) {
          const dev = Math.max(Number(eq.minTempC) - Number(r.temperatureC), Number(r.temperatureC) - Number(eq.maxTempC));
          if (dev > 0) {
            r.incidentId = created.id;
            await this.readings.save(r);
          }
        }
      } else {
        // étend l'incident ouvert avec les nouvelles extrêmes
        open.tempMinObserved = open.tempMinObserved == null ? excursionMin! : Math.min(Number(open.tempMinObserved), excursionMin!);
        open.tempMaxObserved = open.tempMaxObserved == null ? excursionMax! : Math.max(Number(open.tempMaxObserved), excursionMax!);
        incident = await this.incidents.save(open);
        for (const r of saved) {
          const dev = Math.max(Number(eq.minTempC) - Number(r.temperatureC), Number(r.temperatureC) - Number(eq.maxTempC));
          if (dev > 0) { r.incidentId = open.id; await this.readings.save(r); }
        }
      }
      await this.audit.log({
        actorId: actor.id, action: incident ? 'coldchain.incident_auto' : 'coldchain.excursion',
        resourceType: 'cold_chain_incident', resourceId: incident?.id,
        ip, userAgent: ua, details: { equipmentId, min: excursionMin, max: excursionMax },
      });
    }

    return { recorded: saved.length, incidentId: incident?.id ?? null };
  }

  async listReadings(actor: User, equipmentId: string, from?: string, to?: string) {
    await this.getEquipment(actor, equipmentId);
    const qb = this.readings.createQueryBuilder('r')
      .where('r.equipment_id = :eid', { eid: equipmentId })
      .orderBy('r.recorded_at', 'DESC').take(1000);
    if (from) qb.andWhere('r.recorded_at >= :from', { from });
    if (to) qb.andWhere('r.recorded_at <= :to', { to });
    return qb.getMany();
  }

  // ---------- Incidents ----------

  async listIncidents(actor: User, status?: IncidentStatus, structureId?: string) {
    const qb = this.incidents.createQueryBuilder('i')
      .leftJoinAndSelect('i.equipment', 'e')
      .leftJoinAndSelect('e.structure', 's')
      .leftJoinAndSelect('i.decider', 'd')
      .orderBy('i.detected_at', 'DESC');
    if (status) qb.where('i.status = :st', { st: status });
    const rows = await qb.getMany();
    let filtered = rows;
    if (structureId) filtered = filtered.filter((i) => i.equipment?.structureId === structureId);
    if ([RoleCode.NATIONAL_ADMIN, RoleCode.HEALTH_AUTHORITY].includes(actor.role?.code as RoleCode)) return filtered;
    const sids = await this.scope.structureIdsFor(actor.id);
    return filtered.filter((i) => !i.equipment?.structureId || sids.includes(i.equipment.structureId));
  }

  async getIncident(actor: User, id: string) {
    const inc = await this.incidents.findOne({
      where: { id },
      relations: ['equipment', 'equipment.structure', 'decider'],
    });
    if (!inc) throw new NotFoundException('Incident introuvable');
    await this.assertEquipmentAccess(actor, inc.equipment);
    return inc;
  }

  async createIncident(actor: User, dto: CreateIncidentDto, ip?: string, ua?: string) {
    const eq = await this.getEquipment(actor, dto.equipmentId);
    await this.assertStructureWrite(actor, eq.structureId);
    const inc = await this.incidents.save(this.incidents.create({
      ...dto,
      detectedAt: new Date(dto.detectedAt),
      status: IncidentStatus.OPEN,
      createdBy: actor.id,
    }));
    await this.audit.log({ actorId: actor.id, action: 'coldchain.incident_create', resourceType: 'cold_chain_incident', resourceId: inc.id, ip, userAgent: ua });
    return inc;
  }

  async setStatus(actor: User, id: string, status: IncidentStatus, ip?: string, ua?: string) {
    const inc = await this.getIncident(actor, id);
    await this.assertStructureWrite(actor, inc.equipment?.structureId);
    inc.status = status;
    if (status === IncidentStatus.RESOLVED || status === IncidentStatus.CLOSED) inc.resolvedAt = new Date();
    const saved = await this.incidents.save(inc);
    await this.audit.log({ actorId: actor.id, action: `coldchain.incident_${status}`, resourceType: 'cold_chain_incident', resourceId: id, ip, userAgent: ua });
    return saved;
  }

  /**
   * Décision de l'autorité sanitaire sur les lots impactés (M09-F04).
   * Réservée à incident.evaluate : national_admin / health_authority.
   * La décision est tracée ; l'application concrète aux lots se fait via M08.
   */
  async decide(actor: User, id: string, dto: DecideIncidentDto, ip?: string, ua?: string) {
    if (![RoleCode.NATIONAL_ADMIN, RoleCode.HEALTH_AUTHORITY].includes(actor.role?.code as RoleCode)) {
      throw new ForbiddenException('Décision réservée à l’autorité sanitaire');
    }
    const inc = await this.getIncident(actor, id);
    if (inc.status === IncidentStatus.CLOSED) throw new BadRequestException('Incident clôturé');
    inc.lotDecision = dto.lotDecision;
    inc.decisionReason = dto.reason;
    inc.decidedBy = actor.id;
    inc.decidedAt = new Date();
    const saved = await this.incidents.save(inc);
    await this.audit.log({
      actorId: actor.id, action: 'coldchain.incident_decide', resourceType: 'cold_chain_incident', resourceId: id,
      ip, userAgent: ua, details: { lotDecision: dto.lotDecision, reason: dto.reason },
    });
    return saved;
  }

  // ---------- Helpers ----------

  private async assertEquipmentAccess(actor: User, eq: ColdChainEquipment) {
    if ([RoleCode.NATIONAL_ADMIN, RoleCode.HEALTH_AUTHORITY].includes(actor.role?.code as RoleCode)) return;
    if (!eq.structureId) return;
    const ok = await this.scope.canAccessStructure(actor, eq.structureId);
    if (!ok) throw new ForbiddenException('Équipement hors de votre périmètre');
  }

  private async assertStructureWrite(actor: User, structureId?: string | null) {
    if (!structureId) return;
    if ([RoleCode.NATIONAL_ADMIN, RoleCode.HEALTH_AUTHORITY].includes(actor.role?.code as RoleCode)) return;
    const ok = await this.scope.canAccessStructure(actor, structureId);
    if (!ok) throw new ForbiddenException('Structure hors de votre périmètre');
  }
}
