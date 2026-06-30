import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ProfileType, RouteStatus } from '@prisma/client';
import { CurrentUserDto } from '@ecocoop/shared';
import { PrismaService } from '../../common/prisma.service';
import type { CreateCollectionRouteDto } from './dto/create-collection-route.dto';
import type { UpdateCollectionRouteDto } from './dto/update-collection-route.dto';
import type { AddRoutePointDto } from './dto/add-route-point.dto';
import type { ReorderRoutePointsDto } from './dto/reorder-route-points.dto';
import type { AddTeamMembersDto } from './dto/add-team-members.dto';

const ROUTE_INCLUDE = {
  vehicle: { select: { id: true, plate: true, type: true, model: true } },
  driver: { select: { id: true, email: true, profile: { select: { type: true } } } },
  teamMembers: {
    include: { user: { select: { id: true, email: true } } },
    orderBy: { addedAt: 'asc' as const },
  },
  routePoints: {
    include: {
      collectionPoint: {
        select: {
          id: true,
          name: true,
          address: true,
          latitude: true,
          longitude: true,
          locationPending: true,
          isActive: true,
        },
      },
    },
    orderBy: { sequence: 'asc' as const },
  },
};

export interface ListCollectionRoutesQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  driverId?: string;
  dateFrom?: string;
  dateTo?: string;
}

@Injectable()
export class CollectionRoutesService {
  constructor(private prisma: PrismaService) {}

  async list(query: ListCollectionRoutesQuery, currentUser: CurrentUserDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (currentUser.profileType === ProfileType.DRIVER) {
      where['OR'] = [
        { driverId: currentUser.id },
        { teamMembers: { some: { userId: currentUser.id } } },
      ];
    }

    if (query.status && query.status !== 'all') {
      where['status'] = query.status;
    }
    if (query.search?.trim()) {
      const s = query.search.trim();
      where['name'] = { contains: s, mode: 'insensitive' };
    }
    if (query.driverId) {
      where['driverId'] = query.driverId;
    }
    if (query.dateFrom || query.dateTo) {
      const dateFilter: Record<string, unknown> = {};
      if (query.dateFrom) dateFilter['gte'] = new Date(query.dateFrom);
      if (query.dateTo) dateFilter['lte'] = new Date(query.dateTo);
      where['plannedDate'] = dateFilter;
    }

    const [routes, total] = await Promise.all([
      this.prisma.collectionRoute.findMany({
        where,
        skip,
        take: limit,
        orderBy: { plannedDate: 'asc' },
        include: {
          vehicle: { select: { id: true, plate: true, model: true } },
          driver: { select: { id: true, email: true } },
          teamMembers: { select: { userId: true, user: { select: { email: true } } } },
          _count: { select: { routePoints: true } },
        },
      }),
      this.prisma.collectionRoute.count({ where }),
    ]);

    const data = routes.map((r) => {
      const { _count, teamMembers, ...rest } = r;
      return {
        ...rest,
        pointsCount: _count.routePoints,
        teamMembers: teamMembers.map((tm) => ({ userId: tm.userId, email: tm.user.email })),
      };
    });

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const route = await this.prisma.collectionRoute.findUnique({
      where: { id },
      include: ROUTE_INCLUDE,
    });
    if (!route) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Rota não encontrada',
        code: 'COLLECTION_ROUTE_NOT_FOUND',
      });
    }
    return route;
  }

  async create(dto: CreateCollectionRouteDto) {
    await this.validateVehicle(dto.vehicleId);
    await this.validateDriver(dto.driverId);

    if (dto.pointIds?.length) {
      await this.validatePoints(dto.pointIds);
    }

    const route = await this.prisma.collectionRoute.create({
      data: {
        name: dto.name,
        plannedDate: new Date(dto.plannedDate),
        vehicleId: dto.vehicleId,
        driverId: dto.driverId,
        notes: dto.notes,
        status: RouteStatus.PLANEJADA,
        routePoints: dto.pointIds?.length
          ? {
              create: dto.pointIds.map((pid, idx) => ({
                collectionPointId: pid,
                sequence: idx + 1,
              })),
            }
          : undefined,
      },
      include: ROUTE_INCLUDE,
    });

    return route;
  }

  async update(id: string, dto: UpdateCollectionRouteDto) {
    await this.assertPlanejada(id);

    if (dto.vehicleId) await this.validateVehicle(dto.vehicleId);
    if (dto.driverId) await this.validateDriver(dto.driverId);

    return this.prisma.collectionRoute.update({
      where: { id },
      data: {
        name: dto.name,
        plannedDate: dto.plannedDate ? new Date(dto.plannedDate) : undefined,
        vehicleId: dto.vehicleId,
        driverId: dto.driverId,
        notes: dto.notes,
      },
      include: ROUTE_INCLUDE,
    });
  }

  async addPoint(routeId: string, dto: AddRoutePointDto) {
    await this.assertPlanejada(routeId);

    const cp = await this.prisma.collectionPoint.findUnique({
      where: { id: dto.collectionPointId },
    });
    if (!cp) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Ponto de coleta não encontrado',
        code: 'COLLECTION_POINT_NOT_FOUND',
      });
    }
    if (!cp.isActive) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        message: 'Ponto de coleta inativo',
        code: 'COLLECTION_POINT_INACTIVE',
      });
    }

    const existing = await this.prisma.routePoint.findUnique({
      where: {
        routeId_collectionPointId: { routeId, collectionPointId: dto.collectionPointId },
      },
    });
    if (existing) {
      throw new ConflictException({
        statusCode: 409,
        message: 'Ponto já associado à rota',
        code: 'POINT_ALREADY_IN_ROUTE',
      });
    }

    const maxSeq = await this.prisma.routePoint.aggregate({
      where: { routeId },
      _max: { sequence: true },
    });
    const nextSeq = (maxSeq._max.sequence ?? 0) + 1;

    await this.prisma.routePoint.create({
      data: { routeId, collectionPointId: dto.collectionPointId, sequence: nextSeq, notes: dto.notes },
    });

    return this.findOne(routeId);
  }

  async removePoint(routeId: string, pointId: string) {
    await this.assertPlanejada(routeId);

    const rp = await this.prisma.routePoint.findUnique({
      where: { routeId_collectionPointId: { routeId, collectionPointId: pointId } },
    });
    if (!rp) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Ponto não encontrado nesta rota',
        code: 'ROUTE_POINT_NOT_FOUND',
      });
    }

    await this.prisma.routePoint.delete({ where: { id: rp.id } });
    return this.findOne(routeId);
  }

  async reorderPoints(routeId: string, dto: ReorderRoutePointsDto) {
    await this.assertPlanejada(routeId);

    const existing = await this.prisma.routePoint.findMany({
      where: { routeId },
      select: { id: true, collectionPointId: true },
    });

    const existingIds = existing.map((rp) => rp.collectionPointId).sort();
    const requestedIds = [...dto.orderedPointIds].sort();

    if (
      existingIds.length !== requestedIds.length ||
      existingIds.some((id, i) => id !== requestedIds[i])
    ) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        message: 'IDs de reordenação não correspondem aos pontos da rota',
        code: 'INVALID_POINT_ORDER',
      });
    }

    // Two-pass update to avoid unique constraint violation on intermediate sequences.
    // First pass adds a large offset (avoids conflicts), second pass writes final values.
    const offset = 10000;
    await this.prisma.$transaction([
      ...existing.map((rp, i) =>
        this.prisma.routePoint.update({
          where: { id: rp.id },
          data: { sequence: i + 1 + offset },
        }),
      ),
      ...dto.orderedPointIds.map((cpId, idx) => {
        const rp = existing.find((e) => e.collectionPointId === cpId)!;
        return this.prisma.routePoint.update({
          where: { id: rp.id },
          data: { sequence: idx + 1 },
        });
      }),
    ]);

    return this.findOne(routeId);
  }

  async addTeamMembers(routeId: string, dto: AddTeamMembersDto) {
    await this.assertEditableForTeam(routeId);

    for (const userId of dto.userIds) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new UnprocessableEntityException({
          statusCode: 422,
          message: `Usuário ${userId} não encontrado`,
          code: 'USER_NOT_FOUND',
        });
      }
      await this.prisma.routeTeamMember.upsert({
        where: { routeId_userId: { routeId, userId } },
        create: { routeId, userId },
        update: {},
      });
    }

    return this.findOne(routeId);
  }

  async removeTeamMember(routeId: string, userId: string) {
    await this.assertEditableForTeam(routeId);

    const member = await this.prisma.routeTeamMember.findUnique({
      where: { routeId_userId: { routeId, userId } },
    });
    if (!member) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Membro da equipe não encontrado',
        code: 'TEAM_MEMBER_NOT_FOUND',
      });
    }

    await this.prisma.routeTeamMember.delete({ where: { id: member.id } });
    return this.findOne(routeId);
  }

  private async assertPlanejada(routeId: string) {
    const route = await this.prisma.collectionRoute.findUnique({
      where: { id: routeId },
      select: { id: true, status: true },
    });
    if (!route) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Rota não encontrada',
        code: 'COLLECTION_ROUTE_NOT_FOUND',
      });
    }
    if (route.status !== RouteStatus.PLANEJADA) {
      throw new ConflictException({
        statusCode: 409,
        message: 'Rota não pode ser editada no estado atual',
        code: 'ROUTE_NOT_EDITABLE',
      });
    }
  }

  private async assertEditableForTeam(routeId: string) {
    const route = await this.prisma.collectionRoute.findUnique({
      where: { id: routeId },
      select: { id: true, status: true },
    });
    if (!route) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Rota não encontrada',
        code: 'COLLECTION_ROUTE_NOT_FOUND',
      });
    }
    if (route.status === RouteStatus.CONCLUIDA || route.status === RouteStatus.CANCELADA) {
      throw new ConflictException({
        statusCode: 409,
        message: 'Rota não pode ser editada no estado atual',
        code: 'ROUTE_NOT_EDITABLE',
      });
    }
  }

  private async validateVehicle(vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Veículo não encontrado',
        code: 'VEHICLE_NOT_FOUND',
      });
    }
    if (!vehicle.isActive) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        message: 'Veículo inativo',
        code: 'VEHICLE_INACTIVE',
      });
    }
  }

  private async validateDriver(driverId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: driverId },
      include: { profile: true },
    });
    if (!user) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND',
      });
    }
    if (!user.isActive) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        message: 'Motorista inativo',
        code: 'DRIVER_INACTIVE',
      });
    }
    if (user.profile.type !== ProfileType.DRIVER) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        message: 'Usuário informado não tem perfil DRIVER',
        code: 'DRIVER_PROFILE_REQUIRED',
      });
    }
  }

  private async validatePoints(pointIds: string[]) {
    for (const pointId of pointIds) {
      const cp = await this.prisma.collectionPoint.findUnique({ where: { id: pointId } });
      if (!cp) {
        throw new NotFoundException({
          statusCode: 404,
          message: 'Ponto de coleta não encontrado',
          code: 'COLLECTION_POINT_NOT_FOUND',
        });
      }
      if (!cp.isActive) {
        throw new UnprocessableEntityException({
          statusCode: 422,
          message: 'Ponto de coleta inativo',
          code: 'COLLECTION_POINT_INACTIVE',
        });
      }
    }
  }
}
