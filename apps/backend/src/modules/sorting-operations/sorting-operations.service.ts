import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CurrentUserDto } from '@ecocoop/shared';
import { PrismaService } from '../../common/prisma.service';
import type { CreateSortingOperationDto } from './dto/create-sorting-operation.dto';
import type { CancelSortingOperationDto } from './dto/cancel-sorting-operation.dto';

const OPERATION_INCLUDE = {
  subcategory: { select: { id: true, name: true } },
  unit: { select: { id: true, name: true, symbol: true } },
  user: { select: { id: true, email: true } },
  cancelledBy: { select: { id: true, email: true } },
  outputs: {
    include: {
      subcategory: { select: { id: true, name: true } },
      unit: { select: { id: true, symbol: true } },
    },
  },
  rejects: {
    include: {
      subcategory: { select: { id: true, name: true } },
      unit: { select: { id: true, symbol: true } },
    },
  },
} satisfies Prisma.SortingOperationInclude;

@Injectable()
export class SortingOperationsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateSortingOperationDto, user: CurrentUserDto) {
    return this.prisma.$transaction(async (tx) => {
      const subcategory = await tx.materialSubcategory.findUnique({
        where: { id: dto.subcategoryId },
      });
      if (!subcategory) {
        throw new NotFoundException({
          code: 'MATERIAL_SUBCATEGORY_NOT_FOUND',
          message: 'Subcategoria não encontrada',
        });
      }

      // Read raw balance inside the transaction to avoid race conditions
      const balanceResult = await tx.rawMaterialStockEvent.aggregate({
        where: { subcategoryId: dto.subcategoryId, unitId: dto.unitId },
        _sum: { quantity: true },
      });
      const balance = new Prisma.Decimal(balanceResult._sum.quantity ?? 0);
      const processedQty = new Prisma.Decimal(dto.processedQuantity);

      if (processedQty.greaterThan(balance)) {
        throw new ConflictException({
          code: 'INSUFFICIENT_RAW_STOCK',
          message: 'Saldo bruto insuficiente para a quantidade processada',
        });
      }

      const rejects = dto.rejects ?? [];
      const outputsSum = dto.outputs.reduce(
        (acc, o) => acc.add(new Prisma.Decimal(o.quantity)),
        new Prisma.Decimal(0),
      );
      const rejectsSum = rejects.reduce(
        (acc, r) => acc.add(new Prisma.Decimal(r.quantity)),
        new Prisma.Decimal(0),
      );
      const totalSum = outputsSum.add(rejectsSum);

      if (totalSum.greaterThan(processedQty)) {
        throw new UnprocessableEntityException({
          code: 'OUTPUTS_SUM_EXCEEDS_PROCESSED',
          message: 'A soma de outputs e rejeitos excede a quantidade processada',
        });
      }

      const operation = await tx.sortingOperation.create({
        data: {
          subcategoryId: dto.subcategoryId,
          unitId: dto.unitId,
          processedQuantity: processedQty,
          userId: user.id,
        },
      });

      // Create each SortingOutput with its corresponding ReadyStockEvent
      for (const output of dto.outputs) {
        const sortingOutput = await tx.sortingOutput.create({
          data: {
            sortingOperationId: operation.id,
            subcategoryId: output.subcategoryId,
            unitId: output.unitId,
            quantity: output.quantity,
          },
        });
        await tx.readyStockEvent.create({
          data: {
            type: 'TRIAGEM_OUTPUT',
            subcategoryId: output.subcategoryId,
            unitId: output.unitId,
            quantity: output.quantity,
            sortingOperationId: operation.id,
            sortingOutputId: sortingOutput.id,
            userId: user.id,
          },
        });
      }

      for (const reject of rejects) {
        await tx.sortingReject.create({
          data: {
            sortingOperationId: operation.id,
            type: reject.type,
            subcategoryId: reject.subcategoryId ?? null,
            unitId: reject.unitId,
            quantity: reject.quantity,
            description: reject.description ?? null,
          },
        });
      }

      // Auto-create PERDA_INERENTE for the gap between processedQty and sum(outputs+rejects)
      const gap = processedQty.sub(totalSum);
      if (gap.greaterThan(0)) {
        await tx.sortingReject.create({
          data: {
            sortingOperationId: operation.id,
            type: 'PERDA_INERENTE',
            unitId: dto.unitId,
            quantity: gap,
            description: 'Perda inerente ao processo',
          },
        });
      }

      // Debit raw stock with negative quantity (event-sourced balance)
      await tx.rawMaterialStockEvent.create({
        data: {
          type: 'SAIDA_TRIAGEM',
          subcategoryId: dto.subcategoryId,
          unitId: dto.unitId,
          quantity: processedQty.mul(-1),
          sortingOperationId: operation.id,
          userId: user.id,
        },
      });

      return tx.sortingOperation.findUniqueOrThrow({
        where: { id: operation.id },
        include: OPERATION_INCLUDE,
      });
    });
  }

  async findAll(query: {
    subcategoryId?: string;
    status?: string;
    userId?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.SortingOperationWhereInput = {};
    if (query.subcategoryId) where.subcategoryId = query.subcategoryId;
    if (query.status) where.status = query.status as 'CONCLUIDA' | 'CANCELADA';
    if (query.userId) where.userId = query.userId;
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(query.from);
      if (query.to) where.createdAt.lte = new Date(query.to);
    }

    const [data, total] = await Promise.all([
      this.prisma.sortingOperation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          subcategory: { select: { id: true, name: true } },
          unit: { select: { id: true, symbol: true } },
          user: { select: { id: true, email: true } },
          _count: { select: { outputs: true, rejects: true } },
        },
      }),
      this.prisma.sortingOperation.count({ where }),
    ]);

    return {
      data: data.map((op) => ({
        id: op.id,
        status: op.status,
        subcategory: op.subcategory,
        unit: op.unit,
        processedQuantity: new Prisma.Decimal(op.processedQuantity).toFixed(3),
        outputsCount: op._count.outputs,
        rejectsCount: op._count.rejects,
        user: op.user,
        createdAt: op.createdAt,
      })),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string) {
    const operation = await this.prisma.sortingOperation.findUnique({
      where: { id },
      include: OPERATION_INCLUDE,
    });
    if (!operation) {
      throw new NotFoundException({
        code: 'SORTING_OPERATION_NOT_FOUND',
        message: 'Triagem não encontrada',
      });
    }
    return operation;
  }

  async cancel(id: string, dto: CancelSortingOperationDto, user: CurrentUserDto) {
    if (!dto.cancelReason?.trim()) {
      throw new UnprocessableEntityException({
        code: 'CANCEL_REASON_REQUIRED',
        message: 'O motivo do cancelamento é obrigatório',
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const operation = await tx.sortingOperation.findUnique({
        where: { id },
        include: { outputs: true },
      });

      if (!operation) {
        throw new NotFoundException({
          code: 'SORTING_OPERATION_NOT_FOUND',
          message: 'Triagem não encontrada',
        });
      }

      if (operation.status === 'CANCELADA') {
        throw new ConflictException({
          code: 'SORTING_ALREADY_CANCELLED',
          message: 'Esta triagem já foi cancelada',
        });
      }

      // Verify each output reversal won't cause negative ready stock
      for (const output of operation.outputs) {
        const balanceResult = await tx.readyStockEvent.aggregate({
          where: { subcategoryId: output.subcategoryId, unitId: output.unitId },
          _sum: { quantity: true },
        });
        const balance = new Prisma.Decimal(balanceResult._sum.quantity ?? 0);
        const outputQty = new Prisma.Decimal(output.quantity);

        if (balance.sub(outputQty).isNegative()) {
          throw new ConflictException({
            code: 'CANCELLATION_WOULD_CAUSE_NEGATIVE_READY_STOCK',
            message: 'O cancelamento resultaria em saldo pronto negativo',
          });
        }
      }

      // Create one ESTORNO ReadyStockEvent per output (negative quantity)
      for (const output of operation.outputs) {
        await tx.readyStockEvent.create({
          data: {
            type: 'ESTORNO',
            subcategoryId: output.subcategoryId,
            unitId: output.unitId,
            quantity: new Prisma.Decimal(output.quantity).mul(-1),
            sortingOperationId: operation.id,
            userId: user.id,
          },
        });
      }

      // Restore raw stock via ESTORNO_TRIAGEM event (positive quantity)
      await tx.rawMaterialStockEvent.create({
        data: {
          type: 'ESTORNO_TRIAGEM',
          subcategoryId: operation.subcategoryId,
          unitId: operation.unitId,
          quantity: operation.processedQuantity,
          sortingOperationId: operation.id,
          userId: user.id,
        },
      });

      const cancelled = await tx.sortingOperation.update({
        where: { id },
        data: {
          status: 'CANCELADA',
          cancelReason: dto.cancelReason!.trim(),
          cancelledById: user.id,
          cancelledAt: new Date(),
        },
        include: {
          cancelledBy: { select: { id: true, email: true } },
        },
      });

      return {
        id: cancelled.id,
        status: cancelled.status,
        cancelReason: cancelled.cancelReason,
        cancelledBy: cancelled.cancelledBy,
        cancelledAt: cancelled.cancelledAt,
      };
    });
  }
}
