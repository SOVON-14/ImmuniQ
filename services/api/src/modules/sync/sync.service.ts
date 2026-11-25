import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SyncOperation, SyncOpStatus, SyncOpType } from './entities/sync-operation.entity';
import { PushDto, SyncOperationDto } from './dto/sync.dto';
import { BeneficiariesService } from '../beneficiaries/beneficiaries.service';
import { CreateBeneficiaryDto, UpdateBeneficiaryDto } from '../beneficiaries/dto/beneficiaries.dto';
import { VaccinationActsService } from '../vaccination-acts/vaccination-acts.service';
import { CreateActDto, UpdateActDto, TransitionActDto, DeclareAdverseEventDto } from '../vaccination-acts/dto/vaccination-acts.dto';
import { Beneficiary } from '../beneficiaries/entities/beneficiary.entity';
import { VaccinationAct, ActStatus } from '../vaccination-acts/entities/vaccination-act.entity';
import { Referential, ReferentialStatus, ReferentialType } from '../referentials/entities/referential.entity';
import { User } from '../identity/entities/user.entity';
import { RoleCode } from '../identity/entities/role.entity';
import { ScopeService } from '../../common/scope/scope.service';

export interface OpResult {
  opId: string;
  status: SyncOpStatus | 'duplicate';
  entityId?: string;
  error?: string;
}

/**
 * Moteur de synchronisation hors ligne (M12).
 * Push : file d'opérations idempotentes générées sur le terrain.
 * Pull : delta des données modifiées depuis un curseur temporel.
 */
@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    @InjectRepository(SyncOperation) private ops: Repository<SyncOperation>,
    @InjectRepository(Beneficiary) private beneficiaries: Repository<Beneficiary>,
    @InjectRepository(VaccinationAct) private acts: Repository<VaccinationAct>,
    @InjectRepository(Referential) private referentials: Repository<Referential>,
    private beneficiariesService: BeneficiariesService,
    private actsService: VaccinationActsService,
    private scope: ScopeService,
  ) {}

  /**
   * Traite une fournée d'opérations. Chaque opération est indépendante :
   * un échec n'empêche pas les suivantes. Les doublons (opId connu)
   * retournent le résultat mémorisé sans réexécuter le métier.
   */
  async push(actor: User, dto: PushDto, ip?: string, ua?: string): Promise<{ results: OpResult[]; summary: Record<string, number> }> {
    const results: OpResult[] = [];

    for (const op of dto.operations) {
      const existing = await this.ops.findOne({ where: { opId: op.opId } });
      if (existing) {
        results.push({ opId: op.opId, status: SyncOpStatus.DUPLICATE, entityId: existing.entityId ?? undefined });
        continue;
      }

      let entityId: string | undefined;
      let error: string | undefined;
      try {
        entityId = await this.dispatch(actor, op, ip, ua);
      } catch (e: any) {
        error = e?.message ?? 'Erreur inconnue';
        this.logger.warn(`sync op ${op.opId} rejetée : ${error}`);
      }

      await this.ops.save(this.ops.create({
        opId: op.opId,
        deviceId: dto.deviceId,
        userId: actor.id,
        type: op.type,
        entityId,
        payload: op.payload,
        status: error ? SyncOpStatus.REJECTED : SyncOpStatus.APPLIED,
        error,
        clientTimestamp: op.clientTimestamp ? new Date(op.clientTimestamp) : undefined,
        processedAt: new Date(),
      }));

      results.push({ opId: op.opId, status: error ? SyncOpStatus.REJECTED : SyncOpStatus.APPLIED, entityId, error });
    }

    const summary = results.reduce<Record<string, number>>((acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    }, {});
    return { results, summary };
  }

  /** Delta depuis `since` : actes, bénéficiaires et référentiels publiés. */
  async pull(actor: User, since?: string) {
    const cursor = since ? new Date(since) : new Date(Date.now() - 30 * 24 * 3600 * 1000);
    if (isNaN(cursor.getTime())) throw new BadRequestException('Paramètre since invalide');

    const [acts, beneficiaries, referentials] = await Promise.all([
      this.pullActs(actor, cursor),
      this.pullBeneficiaries(actor, cursor),
      this.referentials.find({
        where: [
          { type: ReferentialType.ROUTINE_CALENDAR, status: ReferentialStatus.PUBLISHED },
          { type: ReferentialType.CAMPAIGN, status: ReferentialStatus.PUBLISHED },
        ],
        relations: ['rules', 'rules.vaccine'],
      }),
    ]);

    return { cursor: new Date().toISOString(), acts, beneficiaries, referentials };
  }

  // ---------- Dispatch des opérations ----------

  private async dispatch(actor: User, op: SyncOperationDto, ip?: string, ua?: string): Promise<string | undefined> {
    const p = op.payload as any;
    switch (op.type) {
      case SyncOpType.BENEFICIARY_CREATE: {
        const r = await this.beneficiariesService.create(actor, p as CreateBeneficiaryDto, ip, ua);
        return r.id;
      }
      case SyncOpType.BENEFICIARY_UPDATE: {
        if (!op.entityId) throw new BadRequestException('entityId requis');
        await this.beneficiariesService.update(actor, op.entityId, p as UpdateBeneficiaryDto, ip, ua);
        return op.entityId;
      }
      case SyncOpType.ACT_CREATE: {
        const r = await this.actsService.create(actor, { ...p, localId: p.localId ?? op.opId } as CreateActDto, ip, ua);
        return (r as any).id;
      }
      case SyncOpType.ACT_UPDATE: {
        if (!op.entityId) throw new BadRequestException('entityId requis');
        await this.actsService.update(actor, op.entityId, p as UpdateActDto, p.reason, ip, ua);
        return op.entityId;
      }
      case SyncOpType.ACT_TRANSITION: {
        if (!op.entityId) throw new BadRequestException('entityId requis');
        await this.actsService.transition(actor, op.entityId, p as TransitionActDto, ip, ua);
        return op.entityId;
      }
      case SyncOpType.ADVERSE_EVENT_DECLARE: {
        const r = await this.actsService.declareAdverseEvent(actor, p as DeclareAdverseEventDto, ip, ua);
        return r.id;
      }
      default:
        throw new BadRequestException(`Type d'opération non supporté : ${op.type}`);
    }
  }

  // ---------- Pull ----------

  private async pullActs(actor: User, since: Date) {
    const qb = this.acts.createQueryBuilder('a')
      .leftJoinAndSelect('a.vaccine', 'v')
      .where('a.updated_at > :since', { since })
      .orderBy('a.updated_at', 'ASC')
      .take(1000);

    if (![RoleCode.NATIONAL_ADMIN, RoleCode.HEALTH_AUTHORITY].includes(actor.role?.code as RoleCode)) {
      const sids = await this.scope.structureIdsFor(actor.id);
      const empty = '00000000-0000-0000-0000-000000000000';
      qb.andWhere(
        `(a.vaccinator_id = :uid OR a.created_by = :uid OR a.structure_id IN (:...sids))`,
        { uid: actor.id, sids: sids.length ? sids : [empty] },
      );
    }
    return qb.getMany();
  }

  private async pullBeneficiaries(actor: User, since: Date) {
    const qb = this.beneficiaries.createQueryBuilder('b')
      .where('b.updated_at > :since', { since })
      .andWhere('b.status != :merged', { merged: 'merged' })
      .orderBy('b.updated_at', 'ASC')
      .take(1000);

    if (![RoleCode.NATIONAL_ADMIN, RoleCode.HEALTH_AUTHORITY].includes(actor.role?.code as RoleCode)) {
      const sids = await this.scope.structureIdsFor(actor.id);
      const empty = '00000000-0000-0000-0000-000000000000';
      qb.andWhere(
        `(b.created_by = :uid OR b.origin_structure_id IN (:...sids))`,
        { uid: actor.id, sids: sids.length ? sids : [empty] },
      );
    }
    return qb.getMany();
  }
}
