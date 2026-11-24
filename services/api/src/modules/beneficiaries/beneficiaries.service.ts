import {
  BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, In } from 'typeorm';
import { Beneficiary, BeneficiaryStatus } from './entities/beneficiary.entity';
import { LegalRepresentative, RepresentativeStatus } from './entities/legal-representative.entity';
import { RepresentationLink } from './entities/representation-link.entity';
import { CreateBeneficiaryDto, UpdateBeneficiaryDto, CreateRepresentativeDto, LinkRepresentativeDto } from './dto/beneficiaries.dto';
import { User } from '../identity/entities/user.entity';
import { RoleCode } from '../identity/entities/role.entity';
import { AuditService } from '../../common/audit/audit.service';
import { ScopeService } from '../../common/scope/scope.service';
import { randomInt } from 'crypto';

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // sans I,L,O,0,1 — évite les confusions

@Injectable()
export class BeneficiariesService {
  constructor(
    @InjectRepository(Beneficiary) private beneficiaries: Repository<Beneficiary>,
    @InjectRepository(LegalRepresentative) private representatives: Repository<LegalRepresentative>,
    @InjectRepository(RepresentationLink) private links: Repository<RepresentationLink>,
    private audit: AuditService,
    private scope: ScopeService,
  ) {}

  private async generateImqiId(): Promise<string> {
    for (let i = 0; i < 10; i++) {
      let code = '';
      for (let j = 0; j < 8; j++) code += ALPHABET[randomInt(ALPHABET.length)];
      const candidate = `IMQ-${code}`;
      const exists = await this.beneficiaries.findOne({ where: { immuniqId: candidate } });
      if (!exists) return candidate;
    }
    throw new ConflictException("Impossible de générer un identifiant unique");
  }

  /** Recherche avec signalement des doublons potentiels (jamais de fusion auto — M02-F02). */
  async search(actor: User, q: string, structureId?: string) {
    const qb = this.beneficiaries.createQueryBuilder('b');
    await this.applyScope(actor, qb, 'b');
    if (q) {
      qb.andWhere(
        `(b.immuniq_id ILIKE :q OR b.first_name ILIKE :q OR b.last_name ILIKE :q OR b.phone ILIKE :q)`,
        { q: `%${q}%` },
      );
    }
    if (structureId) qb.andWhere('b.origin_structure_id = :sid', { sid: structureId });
    const items = await qb.orderBy('b.last_name', 'ASC').take(50).getMany();

    // Doublons potentiels : même nom + même date de naissance ou même téléphone
    const suspects = new Map<string, string[]>();
    for (const b of items) {
      const key = `${b.lastName.toLowerCase()}|${b.firstName.toLowerCase()}|${b.birthDate ?? ''}`;
      const matches = await this.beneficiaries.createQueryBuilder('d')
        .where('LOWER(d.last_name) = :ln AND LOWER(d.first_name) = :fn', {
          ln: b.lastName.toLowerCase(), fn: b.firstName.toLowerCase(),
        })
        .andWhere(b.birthDate ? 'd.birth_date = :bd' : '1=1', { bd: b.birthDate })
        .andWhere('d.id != :id', { id: b.id })
        .andWhere('d.status != :merged', { merged: BeneficiaryStatus.MERGED })
        .getMany();
      if (matches.length) suspects.set(b.id, matches.map((m) => m.immuniqId));
    }
    return items.map((b) => ({ ...b, potentialDuplicates: suspects.get(b.id) ?? [] }));
  }

  async getById(actor: User, idOrImqi: string) {
    const b = await this.beneficiaries.findOne({
      where: [{ id: idOrImqi }, { immuniqId: idOrImqi.toUpperCase() }],
      relations: ['originStructure', 'representationLinks', 'representationLinks.representative'],
    });
    if (!b) throw new NotFoundException('Bénéficiaire introuvable');
    await this.assertAccess(actor, b);
    await this.audit.log({
      actorId: actor.id, action: 'beneficiary.read', resourceType: 'beneficiary', resourceId: b.id,
      details: { immuniqId: b.immuniqId },
    });
    return b;
  }

  async create(actor: User, dto: CreateBeneficiaryDto, ip?: string, ua?: string) {
    const immuniqId = await this.generateImqiId();
    const b = this.beneficiaries.create({
      ...dto,
      immuniqId,
      createdBy: actor.id,
      createdVia: dto.createdVia ?? 'professional_portal',
    });
    const saved = await this.beneficiaries.save(b);
    await this.audit.log({
      actorId: actor.id, action: 'beneficiary.create', resourceType: 'beneficiary', resourceId: saved.id,
      ip, userAgent: ua, details: { immuniqId },
    });
    return saved;
  }

  /** Mise à jour avec traçage ancien/nouvelle valeur pour les champs sensibles (M02-F03). */
  async update(actor: User, id: string, dto: UpdateBeneficiaryDto, ip?: string, ua?: string) {
    const b = await this.getById(actor, id);
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const [key, value] of Object.entries(dto)) {
      if (value === undefined) continue;
      const field = key as keyof typeof b;
      if (b[field] !== value) {
        changes[key] = { from: b[field], to: value };
        (b as any)[field] = value;
      }
    }
    const saved = await this.beneficiaries.save(b);
    await this.audit.log({
      actorId: actor.id, action: 'beneficiary.update', resourceType: 'beneficiary', resourceId: b.id,
      ip, userAgent: ua, details: { changes },
    });
    return saved;
  }

  // ---------- Représentants ----------

  async createRepresentative(actor: User, beneficiaryId: string, dto: CreateRepresentativeDto, ip?: string, ua?: string) {
    const b = await this.getById(actor, beneficiaryId);
    const rep = this.representatives.create({ ...dto, createdBy: actor.id });
    const saved = await this.representatives.save(rep);
    await this.audit.log({
      actorId: actor.id, action: 'representative.create', resourceType: 'legal_representative', resourceId: saved.id,
      ip, userAgent: ua, details: { beneficiaryId: b.id, fullName: dto.fullName },
    });
    return saved;
  }

  async linkRepresentative(actor: User, beneficiaryId: string, dto: LinkRepresentativeDto, ip?: string, ua?: string) {
    const b = await this.getById(actor, beneficiaryId);
    const rep = await this.representatives.findOne({ where: { id: dto.representativeId } });
    if (!rep) throw new NotFoundException('Représentant introuvable');
    if (rep.status !== RepresentativeStatus.ACTIVE) throw new BadRequestException('Représentant inactif');

    const existing = await this.links.findOne({
      where: { beneficiaryId: b.id, representativeId: rep.id, revokedAt: null as any },
    });
    if (existing) throw new ConflictException('Lien déjà actif');

    const link = this.links.create({
      beneficiaryId: b.id,
      representativeId: rep.id,
      rights: dto.rights ?? { read: true, notifications: true },
      grantedBy: actor.id,
    });
    const saved = await this.links.save(link);
    await this.audit.log({
      actorId: actor.id, action: 'representation.link', resourceType: 'beneficiary', resourceId: b.id,
      ip, userAgent: ua, details: { representativeId: rep.id, rights: link.rights },
    });
    return saved;
  }

  async revokeLink(actor: User, beneficiaryId: string, linkId: string, reason?: string, ip?: string, ua?: string) {
    const link = await this.links.findOne({ where: { id: linkId, beneficiaryId } });
    if (!link) throw new NotFoundException('Lien introuvable');
    link.revokedAt = new Date();
    link.revokeReason = reason ?? null;
    const saved = await this.links.save(link);
    await this.audit.log({
      actorId: actor.id, action: 'representation.revoke', resourceType: 'beneficiary', resourceId: beneficiaryId,
      ip, userAgent: ua, details: { linkId, reason },
    });
    return saved;
  }

  // ---------- Fusion contrôlée des doublons (M02-F02/F06) ----------

  /**
   * Fusionne `sourceId` dans `targetId` : l'identité target est conservée,
   * l'historique vaccinal est réattribué par les modules actes (M05),
   * le dossier source passe en statut `merged` — jamais d'effacement.
   */
  async merge(actor: User, sourceId: string, targetId: string, reason: string, ip?: string, ua?: string) {
    if (sourceId === targetId) throw new BadRequestException('Fusion impossible : même dossier');
    const [source, target] = await Promise.all([
      this.beneficiaries.findOne({ where: { id: sourceId } }),
      this.beneficiaries.findOne({ where: { id: targetId } }),
    ]);
    if (!source || !target) throw new NotFoundException('Dossier introuvable');
    if (source.status === BeneficiaryStatus.MERGED) throw new ConflictException('Dossier déjà fusionné');

    source.status = BeneficiaryStatus.MERGED;
    source.mergedIntoId = target.id;
    await this.beneficiaries.save(source);

    await this.audit.log({
      actorId: actor.id, action: 'beneficiary.merge', resourceType: 'beneficiary', resourceId: source.id,
      ip, userAgent: ua,
      details: { mergedInto: target.immuniqId, reason, sourceImmuniqId: source.immuniqId },
    });
    return { merged: source.immuniqId, into: target.immuniqId };
  }

  // ---------- Helpers périmètre ----------

  private async applyScope(actor: User, qb: any, alias: string) {
    if (actor.role?.code === RoleCode.NATIONAL_ADMIN || actor.role?.code === RoleCode.HEALTH_AUTHORITY) return qb;
    const sids = await this.scope.structureIdsFor(actor.id);
    const tids = await this.scope.territoryIdsFor(actor.id);
    if (sids.length === 0 && tids.length === 0) {
      // Aucun rattachement : on limite à ce que l'utilisateur a créé ou qui lui est rattaché via actes (futur).
      return qb.andWhere(`${alias}.created_by = :uid OR ${alias}.id IN (SELECT beneficiary_id FROM vaccination_acts WHERE professional_id = :uid)`, { uid: actor.id });
    }
    return qb.andWhere(
      `(${alias}.origin_structure_id IN (:...sids) OR ${alias}.origin_structure.territory_id IN (:...tids))`,
      { sids: sids.length ? sids : ['00000000-0000-0000-0000-000000000000'], tids: tids.length ? tids : ['00000000-0000-0000-0000-000000000000'] },
    );
  }

  private async assertAccess(actor: User, b: Beneficiary) {
    // Les bénéficiaires/représentés accèdent via leurs propres droits (portail) — géré ailleurs.
    if ([RoleCode.BENEFICIARY, RoleCode.LEGAL_REPRESENTATIVE].includes(actor.role?.code as RoleCode)) {
      throw new ForbiddenException('Accès via le portail bénéficiaire');
    }
    if (actor.role?.code === RoleCode.NATIONAL_ADMIN || actor.role?.code === RoleCode.HEALTH_AUTHORITY) return;
    const sids = await this.scope.structureIdsFor(actor.id);
    const tids = await this.scope.territoryIdsFor(actor.id);
    if (b.originStructureId && sids.includes(b.originStructureId)) return;
    if (sids.length === 0 && tids.length === 0 && b.createdBy === actor.id) return;
    // Les vaccinateurs accèdent aux dossiers de leur zone via les actes — vérification élargie au module M05.
    throw new ForbiddenException('Bénéficiaire hors de votre périmètre');
  }
}
