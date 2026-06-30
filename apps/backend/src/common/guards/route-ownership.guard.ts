import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ProfileType } from '@prisma/client';
import { CurrentUserDto } from '@ecocoop/shared';
import { PrismaService } from '../prisma.service';

@Injectable()
export class RouteOwnershipGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: CurrentUserDto = request.user;

    if (!user) throw new ForbiddenException();

    if (user.profileType === ProfileType.ADMIN || user.profileType === ProfileType.MANAGER) {
      return true;
    }

    const routeId = request.params?.id ?? request.params?.routeId;
    if (!routeId) throw new ForbiddenException({ code: 'ROUTE_OWNERSHIP_REQUIRED' });

    const route = await this.prisma.collectionRoute.findUnique({
      where: { id: routeId },
      include: { teamMembers: { select: { userId: true } } },
    });

    if (!route) throw new ForbiddenException({ code: 'ROUTE_OWNERSHIP_REQUIRED' });

    const isDriver = route.driverId === user.id;
    const isTeamMember = route.teamMembers.some((m) => m.userId === user.id);

    if (!isDriver && !isTeamMember) {
      throw new ForbiddenException({ code: 'ROUTE_OWNERSHIP_REQUIRED' });
    }

    return true;
  }
}
