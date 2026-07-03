import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';

export interface BalanceQuery {
  subcategoryId?: string;
  unitId?: string;
  includeInactive?: boolean;
}

export interface MovementsQuery {
  subcategoryId?: string;
  unitId?: string;
  type?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class ReadyStockService {
  constructor(private prisma: PrismaService) {}

  async getBalance(query: BalanceQuery) {
    const { subcategoryId, unitId, includeInactive = false } = query;

    const where: Prisma.ReadyStockEventWhereInput = {};
    if (subcategoryId) where.subcategoryId = subcategoryId;
    if (unitId) where.unitId = unitId;

    const groups = await this.prisma.readyStockEvent.groupBy({
      by: ['subcategoryId', 'unitId'],
      _sum: { quantity: true },
      _count: { id: true },
      where,
    });

    if (groups.length === 0) {
      return { data: [], calculatedAt: new Date().toISOString() };
    }

    const subcategoryIds = [...new Set(groups.map((g) => g.subcategoryId))];
    const unitIds = [...new Set(groups.map((g) => g.unitId))];

    const subcategoryWhere: Prisma.MaterialSubcategoryWhereInput = {
      id: { in: subcategoryIds },
    };
    if (!includeInactive) {
      subcategoryWhere.isActive = true;
    }

    const [subcategories, units] = await Promise.all([
      this.prisma.materialSubcategory.findMany({
        where: subcategoryWhere,
        select: {
          id: true,
          name: true,
          isActive: true,
          category: { select: { id: true, name: true } },
        },
      }),
      this.prisma.unitOfMeasure.findMany({
        where: { id: { in: unitIds } },
        select: { id: true, name: true, symbol: true },
      }),
    ]);

    const subcategoryMap = new Map(subcategories.map((s) => [s.id, s]));
    const unitMap = new Map(units.map((u) => [u.id, u]));

    const data = groups
      .filter((g) => subcategoryMap.has(g.subcategoryId) && unitMap.has(g.unitId))
      .map((g) => {
        const balance = new Prisma.Decimal(g._sum.quantity ?? 0);
        return {
          subcategory: subcategoryMap.get(g.subcategoryId)!,
          unit: unitMap.get(g.unitId)!,
          balance: balance.toFixed(3),
          eventCount: g._count.id,
        };
      });

    return { data, calculatedAt: new Date().toISOString() };
  }

  async getMovements(query: MovementsQuery) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.ReadyStockEventWhereInput = {};
    if (query.subcategoryId) where.subcategoryId = query.subcategoryId;
    if (query.unitId) where.unitId = query.unitId;
    if (query.type) where.type = query.type as Prisma.ReadyStockEventWhereInput['type'];
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(query.from);
      if (query.to) where.createdAt.lte = new Date(query.to);
    }

    const [events, total] = await Promise.all([
      this.prisma.readyStockEvent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          subcategory: { select: { id: true, name: true } },
          unit: { select: { id: true, symbol: true } },
          user: { select: { id: true, email: true } },
        },
      }),
      this.prisma.readyStockEvent.count({ where }),
    ]);

    return {
      data: events.map((e) => ({
        id: e.id,
        type: e.type,
        subcategory: e.subcategory,
        unit: e.unit,
        quantity: new Prisma.Decimal(e.quantity).toFixed(3),
        sortingOperationId: e.sortingOperationId ?? null,
        adjustmentId: e.adjustmentId ?? null,
        saleId: e.saleId ?? null,
        user: e.user,
        createdAt: e.createdAt,
      })),
      total,
      page,
      limit,
    };
  }
}
