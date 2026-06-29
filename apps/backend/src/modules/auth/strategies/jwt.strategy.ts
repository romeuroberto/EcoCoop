import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { PrismaService } from '../../../common/prisma.service';
import { CurrentUserDto, ProfileType } from '@ecocoop/shared';
import { ExtractJwt, Strategy } from 'passport-jwt';

interface JwtPayload {
  sub: string;
  profileType: ProfileType;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET')!,
    });
  }

  async validate(payload: JwtPayload): Promise<CurrentUserDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { profile: { include: { permissions: true } } },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }

    return {
      id: user.id,
      email: user.email,
      profileId: user.profileId,
      profileType: user.profile.type as ProfileType,
      permissions: user.profile.permissions.map((p) => ({
        module: p.module,
        action: p.action,
      })),
    };
  }
}
