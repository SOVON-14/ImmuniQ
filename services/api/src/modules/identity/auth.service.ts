import { Injectable, UnauthorizedException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { authenticator } from 'otplib';
import { createHash, randomBytes } from 'crypto';
import { User, UserStatus } from './entities/user.entity';
import { Session } from './entities/session.entity';
import { Device } from './entities/device.entity';
import { AuditService } from '../../common/audit/audit.service';
import { AuditResult } from './entities/audit-log.entity';
import { LoginDto, RegisterDeviceDto } from './dto/auth.dto';

const ACCESS_TTL = '15m';
const REFRESH_TTL_MS = 30 * 24 * 3600 * 1000;
const SESSION_TTL_MS = 12 * 3600 * 1000;
const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

const hash = (v: string) => createHash('sha256').update(v).digest('hex');

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Session) private sessions: Repository<Session>,
    @InjectRepository(Device) private devices: Repository<Device>,
    private jwt: JwtService,
    private audit: AuditService,
  ) {}

  async login(dto: LoginDto, ip?: string, ua?: string) {
    const user = await this.users.findOne({ where: { username: dto.username }, relations: ['role', 'role.permissions'] });
    if (!user) return this.failLogin(null, 'unknown_user', ip, ua);
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await this.audit.log({ actorId: user.id, action: 'auth.login', result: AuditResult.DENIED, ip, userAgent: ua, details: { reason: 'locked' } });
      throw new UnauthorizedException('Compte temporairement bloqué');
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      user.failedLoginCount += 1;
      if (user.failedLoginCount >= MAX_FAILED) {
        user.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
        user.failedLoginCount = 0;
      }
      await this.users.save(user);
      return this.failLogin(user, 'bad_password', ip, ua);
    }
    if (user.status !== UserStatus.ACTIVE) {
      await this.audit.log({ actorId: user.id, action: 'auth.login', result: AuditResult.DENIED, ip, userAgent: ua, details: { reason: 'status', status: user.status } });
      throw new UnauthorizedException('Compte non actif');
    }
    if (user.mfaEnabled) {
      if (!dto.totpCode) throw new BadRequestException('Code MFA requis');
      if (!authenticator.verify({ token: dto.totpCode, secret: user.mfaSecret })) {
        await this.audit.log({ actorId: user.id, action: 'auth.mfa', result: AuditResult.FAILURE, ip, userAgent: ua });
        throw new UnauthorizedException('Code MFA invalide');
      }
    }
    user.failedLoginCount = 0;
    user.lastLoginAt = new Date();
    await this.users.save(user);

    const device = await this.registerDevice(user, { fingerprint: hash(`${ua ?? ''}|${ip ?? ''}`) }, ip, ua);
    return this.issueTokens(user, device, ip, ua);
  }

  private async failLogin(user: User | null, reason: string, ip?: string, ua?: string): Promise<never> {
    await this.audit.log({ actorId: user?.id, action: 'auth.login', result: AuditResult.FAILURE, ip, userAgent: ua, details: { reason } });
    throw new UnauthorizedException('Identifiants invalides');
  }

  private async registerDevice(user: User, dto: RegisterDeviceDto, ip?: string, ua?: string): Promise<Device> {
    const fingerprint = dto.fingerprint ?? hash(`${ua ?? ''}|${ip ?? ''}`);
    let device = await this.devices.findOne({ where: { userId: user.id, fingerprint } });
    if (!device) {
      device = this.devices.create({ userId: user.id, fingerprint, platform: dto.platform, pushToken: dto.pushToken, lastSeenAt: new Date() });
      device = await this.devices.save(device);
    } else {
      device.lastSeenAt = new Date();
      if (dto.pushToken) device.pushToken = dto.pushToken;
      device = await this.devices.save(device);
    }
    return device;
  }

  private async issueTokens(user: User, device: Device, ip?: string, ua?: string) {
    const refreshToken = randomBytes(48).toString('base64url');
    const session = this.sessions.create({
      userId: user.id,
      deviceId: device.id,
      ip,
      userAgent: ua,
      refreshTokenHash: hash(refreshToken),
      lastActivityAt: new Date(),
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    });
    await this.sessions.save(session);

    const accessToken = this.jwt.sign(
      { sub: user.id, sid: session.id, role: user.role?.code },
      { expiresIn: ACCESS_TTL },
    );
    await this.audit.log({ actorId: user.id, action: 'auth.login', result: AuditResult.SUCCESS, ip, userAgent: ua });
    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
      user: this.publicUser(user),
    };
  }

  async refresh(refreshToken: string, ip?: string, ua?: string) {
    const session = await this.sessions.findOne({
      where: { refreshTokenHash: hash(refreshToken) },
      relations: ['user', 'user.role', 'user.role.permissions'],
    });
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session invalide ou expirée');
    }
    if (session.user.status !== UserStatus.ACTIVE) throw new UnauthorizedException('Compte inactif');

    // Rotation du refresh token
    const newRefresh = randomBytes(48).toString('base64url');
    session.refreshTokenHash = hash(newRefresh);
    session.lastActivityAt = new Date();
    session.expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
    await this.sessions.save(session);

    const accessToken = this.jwt.sign(
      { sub: session.user.id, sid: session.id, role: session.user.role?.code },
      { expiresIn: ACCESS_TTL },
    );
    return { accessToken, refreshToken: newRefresh, expiresIn: 900 };
  }

  async logout(userId: string, sessionId: string, reason = 'logout') {
    await this.sessions.update(
      { id: sessionId, userId },
      { revokedAt: new Date(), revokeReason: reason },
    );
    await this.audit.log({ actorId: userId, action: 'auth.logout', details: { sessionId } });
  }

  /** Révoque toutes les sessions d'un utilisateur (perte/appareil volé). */
  async revokeAllSessions(userId: string, reason: string) {
    await this.sessions.update(
      { userId, revokedAt: IsNull() },
      { revokedAt: new Date(), revokeReason: reason },
    );
    await this.audit.log({ actorId: userId, action: 'session.revoke_all', result: AuditResult.SUCCESS, details: { reason } });
  }

  async touchSession(sessionId: string) {
    await this.sessions.update({ id: sessionId }, { lastActivityAt: new Date() });
  }

  async getActiveSessions(userId: string) {
    return this.sessions.find({
      where: { userId },
      relations: ['device'],
      order: { lastActivityAt: 'DESC' },
    });
  }

  async revokeSession(userId: string, sessionId: string, actorId?: string) {
    await this.sessions.update({ id: sessionId, userId }, { revokedAt: new Date(), revokeReason: 'manual' });
    await this.audit.log({ actorId: actorId ?? userId, action: 'session.revoke', resourceType: 'session', resourceId: sessionId });
  }

  private publicUser(user: User) {
    return {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role?.code,
      permissions: user.role?.permissions?.map((p) => `${p.resource}.${p.action}`) ?? [],
      mfaEnabled: user.mfaEnabled,
    };
  }
}

