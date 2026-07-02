import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CurrentUserDto } from '@ecocoop/shared';
import { PrismaService } from '../../common/prisma.service';
import type { CreateReadyStockAdjustmentDto } from './dto/create-ready-stock-adjustment.dto';

@Injectable()
export class ReadyStockAdjustmentsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateReadyStockAdjustmentDto, user: CurrentUserDto) {
    if (dto.quantity === 0) {
      throw new UnprocessableEntityException({
        code: 'QUANTITY_CANNOT_BE_ZERO',
        message: 'A quantidade do ajuste não pode ser zero',
      });
    }

    if (!dto.justification?.trim()) {
      throw new UnprocessableEntityException({
        code: 'JUSTIFICATION_REQUIRED',
        message: 'A justificativa é obrigatória',
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const subcategory = await tx.materialSubcategory.findUnique({
        where: { id: dto.subcategoryId },
        select: { id: true, name: true },
      });
      if (!subcategory) {
        throw new NotFoundException({
          code: 'MATERIAL_SUBCATEGORY_NOT_FOUND',
          message: 'Subcategoria não encontrada',
        });
      }

      const unit = await tx.unitOfMeasure.findUnique({
        where: { id: dto.unitId },
        select: { id: true, name: true, symbol: true },
      });
      if (!unit) {
        throw new NotFoundException({
          code: 'UNIT_NOT_FOUND',
          message: 'Unidade não encontrada',
        });
      }

      const qty = new Prisma.Decimal(dto.quantity);

      if (qty.isNegative()) {
        const balanceResult = await tx.readyStockEvent.aggregate({
          where: { subcategoryId: dto.subcategoryId, unitId: dto.unitId },
          _sum: { quantity: true },
        });
        const balance = new Prisma.Decimal(balanceResult._sum.quantity ?? 0);

        if (balance.add(qty).isNegative()) {
          throw new ConflictException({
            code: 'ADJUSTMENT_WOULD_CAUSE_NEGATIVE_BALANCE',
            message: 'O ajuste causaria saldo negativo no estoque pronto',
          });
        }
      }

      const adjustment = await tx.readyStockAdjustment.create({
        data: {
          subcategoryId: dto.subcategoryId,
          unitId: dto.unitId,
          quantity: qty,
          justification: dto.justification!.trim(),
          userId: user.id,
        },
      });

      const stockEvent = await tx.readyStockEvent.create({
        data: {
          type: 'AJUSTE',
          subcategoryId: dto.subcategoryId,
          unitId: dto.unitId,
          quantity: qty,
          adjustmentId: adjustment.id,
          userId: user.id,
        },
      });

      return {
        id: adjustment.id,
        subcategory,
        unit,
        quantity: qty.toFixed(3),
        justification: adjustment.justification,
        user: { id: user.id, email: user.email },
        createdAt: adjustment.createdAt,
        stockEventId: stockEvent.id,
      };
    });
  }

  async findAll(query: {
    subcategoryId?: string;
    userId?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.ReadyStockAdjustmentWhereInput = {};
    if (query.subcategoryId) where.subcategoryId = query.subcategoryId;
    if (query.userId) where.userId = query.userId;
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(query.from);
      if (query.to) where.createdAt.lte = new Date(query.to);
    }

    const [adjustments, total] = await Promise.all([
      this.prisma.readyStockAdjustment.findMany({
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
      this.prisma.readyStockAdjustment.count({ where }),
    ]);

    return {
      data: adjustments.map((a) => ({
        id: a.id,
        subcategory: a.subcategory,
        unit: a.unit,
        quantity: new Prisma.Decimal(a.quantity).toFixed(3),
        justification: a.justification,
        user: a.user,
        createdAt: a.createdAt,
      })),
      total,
      page,
      limit,
    };
  }
}
