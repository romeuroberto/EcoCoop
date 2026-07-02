import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { RouteStatus, TemplateStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { OccurrenceGeneratorService } from './occurrence-generator.service';
import type { CreateRouteTemplateDto } from './dto/create-route-template.dto';
import type { UpdateRouteTemplateDto } from './dto/update-route-template.dto';
import type { ActivateRouteTemplateDto } from './dto/activate-route-template.dto';

const TEMPLATE_INCLUDE = {
  driver: { select: { id: true, email: true } },
  vehicle: { select: { id: true, plate: true, type: true, model: true } },
  templatePoints: {
    include: {
      collectionPoint: { select: { id: true, name: true, address: true } },
    },
    orderBy: { sequence: 'asc' as const },
  },
};

export interface ListTemplatesQuery {
  status?: string;
  page?: number;
  limit?: number;
}

export interface FindOneTemplateQuery {
  occurrencePage?: number;
  occurrenceLimit?: number;
  occurrenceStatus?: string;
}

@Injectable()
export class RouteTemplatesService {
  constructor(
    private prisma: PrismaService,
    private generator: OccurrenceGeneratorService,
  ) {}

  async create(dto: CreateRouteTemplateDto) {
    await this.validateDriver(dto.driverId);
    await this.validateVehicle(dto.vehicleId);

    const template = await this.prisma.$transaction(async (tx) => {
      return tx.routeTemplate.create({
        data: {
          name: dto.name,
          recurrenceDays: dto.recurrenceDays,
          startDate: new Date(dto.startDate),
          endDate: dto.endDate ? new Date(dto.endDate) : null,
          driverId: dto.driverId,
          vehicleId: dto.vehicleId,
          notes: dto.notes,
          status: TemplateStatus.ATIVO,
          templatePoints: {
            create: dto.points.map((p) => ({
              collectionPointId: p.collectionPointId,
              sequence: p.sequence,
              notes: p.notes,
            })),
          },
        },
        include: TEMPLATE_INCLUDE,
      });
    });

    const generatedOccurrences = await this.generator.generateForTemplate(template.id);

    return { template, generatedOccurrences };
  }

  async findAll(query: ListTemplatesQuery) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.status && query.status !== 'all') {
      where['status'] = query.status;
    }

    const [templates, total] = await Promise.all([
      this.prisma.routeTemplate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          ...TEMPLATE_INCLUDE,
          _count: { select: { occurrences: true } },
        },
      }),
      this.prisma.routeTemplate.count({ where }),
    ]);

    const data = templates.map(({ _count, ...rest }) => ({
      ...rest,
      occurrenceCount: _count.occurrences,
    }));

    return { data, total, page, limit };
  }

  async findOne(id: string, query: FindOneTemplateQuery = {}) {
    const template = await this.prisma.routeTemplate.findUnique({
      where: { id },
      include: TEMPLATE_INCLUDE,
    });
    if (!template) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Modelo de rota não encontrado',
        code: 'ROUTE_TEMPLATE_NOT_FOUND',
      });
    }

    const occPage = Math.max(1, query.occurrencePage ?? 1);
    const occLimit = Math.min(100, Math.max(1, query.occurrenceLimit ?? 20));
    const occSkip = (occPage - 1) * occLimit;

    const occWhere: Record<string, unknown> = { templateId: id };
    if (query.occurrenceStatus && query.occurrenceStatus !== 'all') {
      occWhere['status'] = query.occurrenceStatus;
    }

    const [occurrences, occTotal] = await Promise.all([
      this.prisma.collectionRoute.findMany({
        where: occWhere,
        skip: occSkip,
        take: occLimit,
        orderBy: { plannedDate: 'asc' },
        select: {
          id: true,
          plannedDate: true,
          status: true,
          isException: true,
          driver: { select: { id: true, email: true } },
          vehicle: { select: { id: true, plate: true } },
        },
      }),
      this.prisma.collectionRoute.count({ where: occWhere }),
    ]);

    return {
      ...template,
      occurrences: { data: occurrences, total: occTotal, page: occPage, limit: occLimit },
    };
  }

  async generate(id: string) {
    const template = await this.prisma.routeTemplate.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!template) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Modelo de rota não encontrado',
        code: 'ROUTE_TEMPLATE_NOT_FOUND',
      });
    }

    const generatedOccurrences = await this.generator.generateForTemplate(id);
    return { generatedOccurrences };
  }

  async update(id: string, dto: UpdateRouteTemplateDto) {
    const template = await this.prisma.routeTemplate.findUnique({
      where: { id },
      include: { templatePoints: { orderBy: { sequence: 'asc' } } },
    });
    if (!template) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Modelo de rota não encontrado',
        code: 'ROUTE_TEMPLATE_NOT_FOUND',
      });
    }

    if (dto.version !== template.version) {
      throw new ConflictException({
        statusCode: 409,
        message: 'Modificação simultânea detectada. Recarregue e tente novamente.',
        code: 'CONCURRENT_MODIFICATION',
      });
    }

    if (dto.driverId) await this.validateDriver(dto.driverId);
    if (dto.vehicleId) await this.validateVehicle(dto.vehicleId);

    const oldRecurrenceDays = template.recurrenceDays as number[];
    const newRecurrenceDays = dto.recurrenceDays ?? oldRecurrenceDays;
    const addedDays = newRecurrenceDays.filter((d) => !oldRecurrenceDays.includes(d));

    type PropagationResult = {
      updated: number;
      exceptionsSkipped: number;
      exceptionsOverwritten: number;
      newOccurrencesGenerated: number;
    };
    let propagation: PropagationResult | null = null;

    const updatedTemplate = await this.prisma.$transaction(async (tx) => {
      const templateUpdate = await tx.routeTemplate.updateMany({
        where: { id, version: dto.version },
        data: {
          name: dto.name,
          recurrenceDays: dto.recurrenceDays,
          startDate: dto.startDate ? new Date(dto.startDate) : undefined,
          endDate: dto.endDate !== undefined ? (dto.endDate ? new Date(dto.endDate) : null) : undefined,
          driverId: dto.driverId,
          vehicleId: dto.vehicleId,
          notes: dto.notes,
          version: { increment: 1 },
        },
      });

      if (templateUpdate.count === 0) {
        throw new ConflictException({
          statusCode: 409,
          message: 'Modificação simultânea detectada. Recarregue e tente novamente.',
          code: 'CONCURRENT_MODIFICATION',
        });
      }

      if (dto.points) {
        await tx.routeTemplatePoint.deleteMany({ where: { templateId: id } });
        await tx.routeTemplatePoint.createMany({
          data: dto.points.map((p) => ({
            templateId: id,
            collectionPointId: p.collectionPointId,
            sequence: p.sequence,
            notes: p.notes,
          })),
        });
      }

      if (dto.propagate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const overwrite = dto.overwriteExceptions ?? false;

        // Scalar propagation (driverId, vehicleId)
        const scalarUpdates: Record<string, unknown> = {};
        if (dto.driverId) scalarUpdates['driverId'] = dto.driverId;
        if (dto.vehicleId) scalarUpdates['vehicleId'] = dto.vehicleId;

        const touchedRouteIds = new Set<string>();
        const overwrittenRouteIds = new Set<string>();
        let skippedCount = 0;

        if (Object.keys(scalarUpdates).length > 0) {
          const nonExceptionRoutes = await tx.collectionRoute.findMany({
            where: {
              templateId: id,
              status: RouteStatus.PLANEJADA,
              plannedDate: { gte: today },
              isException: false,
            },
            select: { id: true },
          });

          // Non-exception occurrences
          const nonExceptionResult = await tx.collectionRoute.updateMany({
            where: {
              templateId: id,
              status: RouteStatus.PLANEJADA,
              plannedDate: { gte: today },
              isException: false,
            },
            data: scalarUpdates,
          });
          if (nonExceptionResult.count > 0) {
            nonExceptionRoutes.forEach((route) => touchedRouteIds.add(route.id));
          }

          if (overwrite) {
            const exceptionRoutes = await tx.collectionRoute.findMany({
              where: {
                templateId: id,
                status: RouteStatus.PLANEJADA,
                plannedDate: { gte: today },
                isException: true,
              },
              select: { id: true },
            });

            // Exception occurrences — overwrite and clear flag
            const exceptionResult = await tx.collectionRoute.updateMany({
              where: {
                templateId: id,
                status: RouteStatus.PLANEJADA,
                plannedDate: { gte: today },
                isException: true,
              },
              data: { ...scalarUpdates, isException: false },
            });
            if (exceptionResult.count > 0) {
              exceptionRoutes.forEach((route) => {
                touchedRouteIds.add(route.id);
                overwrittenRouteIds.add(route.id);
              });
            }
          } else {
            // Count exceptions that were skipped
            skippedCount = await tx.collectionRoute.count({
              where: {
                templateId: id,
                status: RouteStatus.PLANEJADA,
                plannedDate: { gte: today },
                isException: true,
              },
            });
          }
        }

        // Points propagation — if points were updated, delete + recreate per occurrence
        if (dto.points) {
          const affectedRoutes = await tx.collectionRoute.findMany({
            where: {
              templateId: id,
              status: RouteStatus.PLANEJADA,
              plannedDate: { gte: today },
              isException: overwrite ? undefined : false,
            },
            select: { id: true, isException: true },
          });

          for (const { id: routeId, isException } of affectedRoutes) {
            await tx.routePoint.deleteMany({ where: { routeId } });
            await tx.routePoint.createMany({
              data: dto.points.map((p) => ({
                routeId,
                collectionPointId: p.collectionPointId,
                sequence: p.sequence,
                notes: p.notes,
              })),
            });
            touchedRouteIds.add(routeId);
            if (isException) overwrittenRouteIds.add(routeId);
          }

          if (!overwrite) {
            skippedCount = await tx.collectionRoute.count({
              where: {
                templateId: id,
                status: RouteStatus.PLANEJADA,
                plannedDate: { gte: today },
                isException: true,
              },
            });
          } else if (affectedRoutes.length > 0) {
            await tx.collectionRoute.updateMany({
              where: {
                id: { in: affectedRoutes.map((route) => route.id) },
                isException: true,
              },
              data: { isException: false },
            });
          }
        }

        propagation = {
          updated: touchedRouteIds.size,
          exceptionsSkipped: skippedCount,
          exceptionsOverwritten: overwrittenRouteIds.size,
          newOccurrencesGenerated: 0,
        };
      }

      const saved = await tx.routeTemplate.findUniqueOrThrow({
        where: { id },
        include: TEMPLATE_INCLUDE,
      });

      return saved;
    });

    // Generate occurrences for newly added recurrenceDays (outside transaction)
    if (dto.propagate && addedDays.length > 0) {
      const newCount = await this.generator.generateForTemplate(id, { onlyDays: addedDays });
      const p = propagation as PropagationResult | null;
      if (p) p.newOccurrencesGenerated = newCount;
    }

    return { template: updatedTemplate, propagation };
  }

  async deactivate(id: string) {
    const template = await this.prisma.routeTemplate.findUnique({ where: { id } });
    if (!template) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Modelo de rota não encontrado',
        code: 'ROUTE_TEMPLATE_NOT_FOUND',
      });
    }
    if (template.status === TemplateStatus.INATIVO) {
      throw new ConflictException({
        statusCode: 409,
        message: 'Modelo já está inativo',
        code: 'TEMPLATE_ALREADY_INACTIVE',
      });
    }

    const { cancelled, updated } = await this.prisma.$transaction(async (tx) => {
      const cancelResult = await tx.collectionRoute.updateMany({
        where: { templateId: id, status: RouteStatus.PLANEJADA },
        data: { status: RouteStatus.CANCELADA, cancelReason: 'Modelo desativado' },
      });
      const updatedTemplate = await tx.routeTemplate.update({
        where: { id },
        data: { status: TemplateStatus.INATIVO },
        include: TEMPLATE_INCLUDE,
      });
      return { cancelled: cancelResult.count, updated: updatedTemplate };
    });

    return { template: updated, cancelledOccurrences: cancelled };
  }

  async activate(id: string, dto: ActivateRouteTemplateDto) {
    const template = await this.prisma.routeTemplate.findUnique({ where: { id } });
    if (!template) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Modelo de rota não encontrado',
        code: 'ROUTE_TEMPLATE_NOT_FOUND',
      });
    }
    if (template.status === TemplateStatus.ATIVO) {
      throw new ConflictException({
        statusCode: 409,
        message: 'Modelo já está ativo',
        code: 'TEMPLATE_ALREADY_ACTIVE',
      });
    }

    const updated = await this.prisma.routeTemplate.update({
      where: { id },
      data: { status: TemplateStatus.ATIVO, startDate: new Date(dto.startDate) },
      include: TEMPLATE_INCLUDE,
    });

    const generatedOccurrences = await this.generator.generateForTemplate(id);
    return { template: updated, generatedOccurrences };
  }

  async duplicate(id: string) {
    const template = await this.prisma.routeTemplate.findUnique({
      where: { id },
      include: { templatePoints: { orderBy: { sequence: 'asc' } } },
    });
    if (!template) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Modelo de rota não encontrado',
        code: 'ROUTE_TEMPLATE_NOT_FOUND',
      });
    }

    return {
      draft: {
        name: `${template.name} (cópia)`,
        recurrenceDays: template.recurrenceDays,
        startDate: null,
        endDate: null,
        driverId: template.driverId,
        vehicleId: template.vehicleId,
        notes: template.notes,
        points: template.templatePoints.map((tp) => ({
          collectionPointId: tp.collectionPointId,
          sequence: tp.sequence,
          notes: tp.notes,
        })),
      },
    };
  }

  private async validateDriver(driverId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: driverId },
      include: { profile: true },
    });
    if (!user || !user.isActive) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        message: 'Motorista não encontrado ou inativo',
        code: 'DRIVER_INVALID',
      });
    }
  }

  private async validateVehicle(vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle || !vehicle.isActive) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        message: 'Veículo não encontrado ou inativo',
        code: 'VEHICLE_INVALID',
      });
    }
  }
}
