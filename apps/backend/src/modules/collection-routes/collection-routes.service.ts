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

const INVALID_ROUTE_TRANSITION = {
  statusCode: 409,
  message: 'Transição de estado inválida',
  code: 'INVALID_ROUTE_TRANSITION',
};

const ROUTE_CONCURRENT_MODIFICATION = {
  statusCode: 409,
  message: 'Rota modificada simultaneamente. Recarregue e tente novamente.',
  code: 'ROUTE_CONCURRENT_MODIFICATION',
};

export interface ListCollectionRoutesQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  driverId?: string;
  dateFrom?: string;
  dateTo?: string;
  templateId?: string;
  isException?: boolean;
  hasTemplate?: boolean;
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
    if (query.templateId) {
      where['templateId'] = query.templateId;
    }
    if (query.isException !== undefined) {
      where['isException'] = query.isException;
    }
    if (query.hasTemplate !== undefined) {
      where['templateId'] = query.hasTemplate ? { not: null } : null;
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
          template: { select: { id: true, name: true } },
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
    return { ...route, cancelReason: await this.getCancelReason(id) };
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
    const route = await this.prisma.collectionRoute.findUnique({
      where: { id },
      select: { id: true, status: true, templateId: true },
    });
    if (!route) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Rota não encontrada',
        code: 'COLLECTION_ROUTE_NOT_FOUND',
      });
    }

    const isStructuralField = !!(dto.vehicleId || dto.driverId || dto.plannedDate);

    if (route.status === RouteStatus.CONCLUIDA || route.status === RouteStatus.CANCELADA) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        message: 'Rota concluída ou cancelada não pode ser editada',
        code: 'ROUTE_NOT_EDITABLE',
      });
    }

    if (route.status === RouteStatus.EM_ANDAMENTO) {
      if (!route.templateId) {
        throw new ConflictException({
          statusCode: 409,
          message: 'Rota em andamento não pode ser editada',
          code: 'ROUTE_NOT_EDITABLE',
        });
      }
      // Template occurrence in EM_ANDAMENTO: only notes are editable
      if (dto.vehicleId || dto.driverId || dto.name || dto.plannedDate) {
        throw new UnprocessableEntityException({
          statusCode: 422,
          message: 'Edição de campos estruturais não permitida em rota em andamento',
          code: 'STRUCTURAL_EDIT_BLOCKED',
        });
      }
    }

    if (dto.vehicleId) await this.validateVehicle(dto.vehicleId);
    if (dto.driverId) await this.validateDriver(dto.driverId);

    const setIsException = route.templateId && isStructuralField ? true : undefined;

    return this.prisma.collectionRoute.update({
      where: { id },
      data: {
        name: dto.name,
        plannedDate: dto.plannedDate ? new Date(dto.plannedDate) : undefined,
        vehicleId: dto.vehicleId,
        driverId: dto.driverId,
        notes: dto.notes,
        ...(setIsException !== undefined ? { isException: setIsException } : {}),
      },
      include: ROUTE_INCLUDE,
    });
  }

  async duplicate(id: string) {
    const route = await this.prisma.collectionRoute.findUnique({
      where: { id },
      include: {
        routePoints: { orderBy: { sequence: 'asc' } },
      },
    });
    if (!route) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Rota não encontrada',
        code: 'COLLECTION_ROUTE_NOT_FOUND',
      });
    }

    return {
      draft: {
        name: route.name,
        plannedDate: null,
        driverId: route.driverId,
        vehicleId: route.vehicleId,
        notes: route.notes,
        points: route.routePoints.map((rp) => ({
          collectionPointId: rp.collectionPointId,
          sequence: rp.sequence,
          notes: rp.notes,
        })),
      },
    };
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
    await this.markRecurringRouteAsException(routeId);

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

    await this.prisma.$transaction([
      this.prisma.routePoint.delete({ where: { id: rp.id } }),
      this.prisma.collectionRoute.updateMany({
        where: { id: routeId, templateId: { not: null } },
        data: { isException: true },
      }),
    ]);
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
      this.prisma.collectionRoute.updateMany({
        where: { id: routeId, templateId: { not: null } },
        data: { isException: true },
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

  async startRoute(routeId: string) {
    const route = await this.getRouteVersionForTransition(routeId);
    if (route.status !== RouteStatus.PLANEJADA) {
      throw new ConflictException(INVALID_ROUTE_TRANSITION);
    }

    const result = await this.prisma.collectionRoute.updateMany({
      where: { id: routeId, version: route.version, status: RouteStatus.PLANEJADA },
      data: {
        status: RouteStatus.EM_ANDAMENTO,
        startedAt: new Date(),
        version: { increment: 1 },
      },
    });

    if (result.count === 0) {
      throw new ConflictException(ROUTE_CONCURRENT_MODIFICATION);
    }

    return this.findOne(routeId);
  }

  async completeRoute(routeId: string) {
    const route = await this.getRouteVersionForTransition(routeId);
    if (route.status !== RouteStatus.EM_ANDAMENTO) {
      throw new ConflictException(INVALID_ROUTE_TRANSITION);
    }

    const result = await this.prisma.collectionRoute.updateMany({
      where: { id: routeId, version: route.version, status: RouteStatus.EM_ANDAMENTO },
      data: {
        status: RouteStatus.CONCLUIDA,
        completedAt: new Date(),
        version: { increment: 1 },
      },
    });

    if (result.count === 0) {
      throw new ConflictException(ROUTE_CONCURRENT_MODIFICATION);
    }

    return this.findOne(routeId);
  }

  async cancelRoute(routeId: string, reason: string, confirmInProgress?: boolean) {
    const route = await this.getRouteVersionForTransition(routeId);
    if (route.status !== RouteStatus.PLANEJADA && route.status !== RouteStatus.EM_ANDAMENTO) {
      throw new ConflictException(INVALID_ROUTE_TRANSITION);
    }

    if (route.status === RouteStatus.EM_ANDAMENTO && !confirmInProgress) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        message: 'Confirmação explícita necessária para cancelar rota em andamento',
        code: 'CONFIRM_IN_PROGRESS_REQUIRED',
      });
    }

    const count = await this.prisma.$executeRaw`
      UPDATE "CollectionRoute"
      SET "status" = 'CANCELADA',
          "cancelReason" = ${reason},
          "version" = "version" + 1,
          "updatedAt" = NOW()
      WHERE "id" = ${routeId}
        AND "version" = ${route.version}
        AND "status" IN ('PLANEJADA', 'EM_ANDAMENTO')
    `;

    if (count === 0) {
      throw new ConflictException(ROUTE_CONCURRENT_MODIFICATION);
    }

    const updated = await this.findOne(routeId);
    return { ...updated, cancelReason: reason };
  }

  private async getCancelReason(routeId: string): Promise<string | null> {
    try {
      const rows = await this.prisma.$queryRaw<Array<{ cancelReason: string | null }>>`
        SELECT "cancelReason" FROM "CollectionRoute" WHERE "id" = ${routeId}
      `;
      return rows[0]?.cancelReason ?? null;
    } catch {
      return null;
    }
  }

  private async getRouteVersionForTransition(routeId: string) {
    const route = await this.prisma.collectionRoute.findUnique({
      where: { id: routeId },
      select: { id: true, status: true, version: true, templateId: true },
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

  private async markRecurringRouteAsException(routeId: string) {
    await this.prisma.collectionRoute.updateMany({
      where: { id: routeId, templateId: { not: null } },
      data: { isException: true },
    });
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
