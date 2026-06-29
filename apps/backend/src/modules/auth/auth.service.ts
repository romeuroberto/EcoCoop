import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma.service';
import { LoginResponseDto, ProfileType } from '@ecocoop/shared';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async login(email: string, password: string): Promise<{ response: LoginResponseDto; refreshToken: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { profile: { include: { permissions: true } } },
    });

    if (!user) {
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS',
      });
    }

    if (!user.isActive) {
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Account is disabled',
        code: 'ACCOUNT_DISABLED',
      });
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS',
      });
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const payload = { sub: user.id, profileType: user.profile.type };
    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: '15m',
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });

    const profileType = user.profile.type as ProfileType;
    const redirectTo = profileType === ProfileType.BUYER ? '/portal' : '/dashboard';

    return {
      response: { accessToken, profile: profileType, redirectTo },
      refreshToken,
    };
  }

  async refreshAccessToken(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Account is disabled',
        code: 'ACCOUNT_DISABLED',
      });
    }

    const payload = { sub: user.id, profileType: user.profile.type };
    return this.jwtService.sign(payload, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: '15m',
    });
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: { include: { permissions: true } } },
    });

    if (!user) throw new UnauthorizedException();

    const { passwordHash: _pw, ...rest } = user;
    return {
      ...rest,
      permissions: user.profile.permissions.map((p) => ({ module: p.module, action: p.action })),
    };
  }
}
