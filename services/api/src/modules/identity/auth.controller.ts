import { Body, Controller, Get, Ip, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, RefreshDto } from './dto/auth.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from './entities/user.entity';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Throttle({ default: { limit: 5, ttl: 60_000 } }) // anti brute-force : 5 tentatives/min/IP
  @Post('login')
  login(@Body() dto: LoginDto, @Ip() ip: string, @Req() req: Request) {
    return this.auth.login(dto, ip, req.headers['user-agent']);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('refresh')
  refresh(@Body() dto: RefreshDto, @Ip() ip: string, @Req() req: Request) {
    return this.auth.refresh(dto.refreshToken, ip, req.headers['user-agent']);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@CurrentUser() user: User) {
    return this.auth.logout(user.id, (user as any).sessionId, 'logout');
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: User) {
    return {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role?.code,
      permissions: user.role?.permissions?.map((p) => `${p.resource}.${p.action}`) ?? [],
      mfaEnabled: user.mfaEnabled,
    };
  }
}
