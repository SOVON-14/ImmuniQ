import {
  ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { PortalLink, PortalLinkStatus, PortalLinkVia } from './entities/portal-link.entity';
import { LinkBeneficiaryDto, UpdatePreferenceDto } from './dto/portal.dto';
import { User } from '../identity/entities/user.entity';
import { RoleCode } from '../identity/entities/role.entity';
import { Beneficiary, BeneficiaryStatus } from '../beneficiaries/entities/beneficiary.entity';
import { LegalRepresentative, RepresentativeStatus } from '../beneficiaries/entities/legal-representative.entity';
import { RepresentationLink } from '../beneficiaries/entities/representation-link.entity';
import { VaccinationAct } from '../vaccination-acts/entities/vaccination-act.entity';
import { ActStatus } from '../vaccination-acts/entities/vaccination-act.entity';
import { VaccinationAttestation } from '../record/entities/vaccination-attestation.entity';
import { NotificationPreference } from '../notifications/entities/notification-preference.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { RecordService } from '../record/record.service';
import { AuditService } from '../../common/audit/audit.service';

const PORTAL_ROLES = [RoleCode.BENEFICIARY, RoleCode.LEGAL_REPRESENTATIVE];

@Injectable()
export class PortalService {
  constructor(
    @InjectRepository(PortalLink) private links: Repository<PortalLink>,
    @InjectRepository(Beneficiary) private beneficiaries: Repository<Beneficiary>,
    @InjectRepository(LegalRepresentative) private representatives: Repository<LegalRepresentative>,
    @InjectRepository(RepresentationLink) private repLinks: Repository<RepresentationLink>,
    @InjectRepository(VaccinationAct) private acts: Repository<VaccinationAct>,
    @InjectRepository(VaccinationAttestation) private attestations: Repository<VaccinationAttestation>,
    @InjectRepository(NotificationPreference) private preferences: Repository<NotificationPreference>,
    @InjectRepository(Notification) private notifications: Repository<Notification>,
    private record: RecordService,
    private audit: AuditService,
  ) {}

  private assertPortalRole(actor: User) {
    if (!PORTAL_ROLES.includes(actor.role?.code as RoleCode)) {
      throw new ForbiddenException('Réservé aux comptes portail bénéficiaire');
    }
  }

  /**
   * Vérifie l'identité (IMQ-id + date de naissance) puis crée le lien
   * compte ↔ dossier. Idempotent : une liaison active existante est renvoyée.
   */
  async linkBeneficiary(actor: User, dto: LinkBeneficiaryDto, ip?: string, ua?: string) {
    this.assertPortalRole(actor);

    const b = await this.beneficiaries.findOne({
      where: { immuniqId: dto.immuniqId.trim().toUpperCase() },
    });
    // Message volontairement identique pour ne pas révéler si l'IMQ-id existe.
    const mismatch = () => new NotFoundException('Identifiants invalides');

    if (!b || b.status === BeneficiaryStatus.MERGED || b.status === BeneficiaryStatus.ARCHIVED) throw mismatch();
    if (!b.birthDate || String(b.birthDate).slice(0, 10) !== dto.birthDate.slice(0, 10)) throw mismatch();

    const existing = await this.links.findOne({
      where: { userId: actor.id, beneficiaryId: b.id, status: PortalLinkStatus.ACTIVE },
    });
    if (existing) return { link: existing, beneficiary: b, alreadyLinked: true };

    const link = await this.links.save(this.links.create({
      userId: actor.id,
      beneficiaryId: b.id,
      verifiedVia: PortalLinkVia.IMMUNIQ_ID_BIRTHDATE,
      status: PortalLinkStatus.ACTIVE,
      verifiedAt: new Date(),
    }));

    await this.audit.log({
      actorId: actor.id, action: 'portal.link', resourceType: 'beneficiary',
      resourceId: b.id, ip, userAgent: ua,
    });
    return { link, beneficiary: b, alreadyLinked: false };
  }

  /** Dossiers accessibles : liens directs (soi) + représentants légaux rattachés. */
  async myBeneficiaries(actor: User) {
    this.assertPortalRole(actor);

    const own = await this.links.find({
      where: { userId: actor.id, status: PortalLinkStatus.ACTIVE },
      relations: ['beneficiary'],
    });

    const reps = await this.representatives.find({
      where: { userId: actor.id, status: RepresentativeStatus.ACTIVE },
    });
    let viaRep: Beneficiary[] = [];
    if (reps.length) {
      const repIds = reps.map((r) => r.id);
      const rl = await this.repLinks.find({
        where: { representativeId: In(repIds), revokedAt: IsNull() },
        relations: ['beneficiary'],
      });
      viaRep = rl.map((l) => l.beneficiary).filter(Boolean);
    }

    const seen = new Set<string>();
    const result: { beneficiary: Beneficiary; relation: 'self' | 'guardian' }[] = [];
    for (const l of own) {
      if (l.beneficiary && !seen.has(l.beneficiary.id)) {
        seen.add(l.beneficiary.id);
        result.push({ beneficiary: l.beneficiary, relation: 'self' });
      }
    }
    for (const b of viaRep) {
      if (b && !seen.has(b.id)) {
        seen.add(b.id);
        result.push({ beneficiary: b, relation: 'guardian' });
      }
    }
    return result;
  }

  /** IDs de dossiers accessibles par ce compte portail. */
  private async accessibleIds(actor: User): Promise<string[]> {
    const items = await this.myBeneficiaries(actor);
    return items.map((i) => i.beneficiary.id);
  }

  private async assertAccess(actor: User, beneficiaryId: string): Promise<Beneficiary> {
    const ids = await this.accessibleIds(actor);
    if (!ids.includes(beneficiaryId)) {
      throw new ForbiddenException('Dossier non lié à votre compte');
    }
    const b = await this.beneficiaries.findOne({ where: { id: beneficiaryId } });
    if (!b) throw new NotFoundException('Bénéficiaire introuvable');
    return b;
  }

  /** Dossier vaccinal côté portail : identité, actes administrés, échéancier, attestations. */
  async getRecord(actor: User, beneficiaryId: string) {
    const b = await this.assertAccess(actor, beneficiaryId);
    const acts = await this.acts.find({
      where: { beneficiaryId: b.id, status: ActStatus.ADMINISTERED },
      relations: ['vaccine', 'structure'],
      order: { administeredAt: 'ASC' },
    });
    const schedule = await this.record.computeSchedule(b);
    const attestations = await this.attestations.find({
      where: { beneficiaryId: b.id },
      order: { issuedAt: 'DESC' },
    });
    return { beneficiary: b, acts, schedule, attestations, generatedAt: new Date() };
  }

  async getPreferences(actor: User, beneficiaryId: string) {
    await this.assertAccess(actor, beneficiaryId);
    return this.preferences.find({ where: { beneficiaryId } });
  }

  async updatePreference(actor: User, beneficiaryId: string, dto: UpdatePreferenceDto, ip?: string) {
    await this.assertAccess(actor, beneficiaryId);
    let pref = await this.preferences.findOne({
      where: { beneficiaryId, channel: dto.channel },
    });
    if (!pref) pref = this.preferences.create({ beneficiaryId, channel: dto.channel });
    if (dto.optedIn !== undefined) pref.optedIn = dto.optedIn;
    if (dto.phoneOverride !== undefined) pref.phoneOverride = (dto.phoneOverride || null) as string;
    pref.updatedAt = new Date();
    const saved = await this.preferences.save(pref);

    await this.audit.log({
      actorId: actor.id, action: 'notification.preference_update',
      resourceType: 'notification_preference', resourceId: saved.id,
      details: { beneficiaryId, channel: dto.channel, optedIn: saved.optedIn }, ip,
    });
    return saved;
  }

  /** Notifications destinées aux dossiers accessibles (rappels, confirmations). */
  async myNotifications(actor: User) {
    const ids = await this.accessibleIds(actor);
    if (!ids.length) return [];
    return this.notifications.find({
      where: { beneficiaryId: In(ids) },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }
}
