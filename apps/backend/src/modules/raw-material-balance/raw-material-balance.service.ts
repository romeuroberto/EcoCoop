import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';

export interface BalanceQuery {
  subcategoryId?: string;
  unitId?: string;
  includeInactive?: boolean;
}

@Injectable()
export class RawMaterialBalanceService {
  constructor(private prisma: PrismaService) {}

  async getBalance(query: BalanceQuery) {
    const { subcategoryId, unitId, includeInactive = false } = query;

    const where: Prisma.RawMaterialStockEventWhereInput = {};
    if (subcategoryId) where.subcategoryId = subcategoryId;
    if (unitId) where.unitId = unitId;

    const groups = await this.prisma.rawMaterialStockEvent.groupBy({
      by: ['subcategoryId', 'unitId'],
      _sum: { quantity: true },
      _count: { id: true },
      where,
    });

    // Salvaguarda: filtrar grupos com saldo negativo (nunca deve ocorrer, mas é proteção)
    const positiveGroups = groups.filter((g) => {
      const sum = g._sum.quantity ?? new Prisma.Decimal(0);
      return new Prisma.Decimal(sum).gte(0);
    });

    if (positiveGroups.length === 0) {
      return { data: [], calculatedAt: new Date().toISOString() };
    }

    // Buscar dados de subcategoria e unidade
    const subcategoryIds = [...new Set(positiveGroups.map((g) => g.subcategoryId))];
    const unitIds = [...new Set(positiveGroups.map((g) => g.unitId))];

    const subcategoryWhere: Prisma.MaterialSubcategoryWhereInput = {
      id: { in: subcategoryIds },
    };
    if (!includeInactive) {
      subcategoryWhere.isActive = true;
    }

    const unitWhere: Prisma.UnitOfMeasureWhereInput = {
      id: { in: unitIds },
    };
    if (!includeInactive) {
      unitWhere.isActive = true;
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
        where: unitWhere,
        select: { id: true, name: true, symbol: true },
      }),
    ]);

    const subcategoryMap = new Map(subcategories.map((s) => [s.id, s]));
    const unitMap = new Map(units.map((u) => [u.id, u]));

    const data = positiveGroups
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
}
