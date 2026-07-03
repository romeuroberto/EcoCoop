import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CurrentUserDto } from '@ecocoop/shared';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { CancelSaleDto } from './dto/cancel-sale.dto';
import { DeliverSaleDto } from './dto/deliver-sale.dto';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateSaleDto, user: CurrentUserDto) {
    return this.prisma.$transaction(async (tx) => {
      const buyer = await tx.buyer.findUnique({
        where: { id: dto.buyerId },
        select: { id: true, legalName: true, isActive: true },
      });

      if (!buyer) {
        throw new NotFoundException({
          code: 'BUYER_NOT_FOUND',
          message: 'Comprador não encontrado',
        });
      }

      if (!buyer.isActive) {
        throw new ConflictException({
          code: 'BUYER_INACTIVE',
          message: 'Comprador inativo',
        });
      }

      const subcategoryIds = [...new Set(dto.items.map((item) => item.subcategoryId))];
      const unitIds = [...new Set(dto.items.map((item) => item.unitId))];

      const [subcategories, units] = await Promise.all([
        tx.materialSubcategory.findMany({
          where: { id: { in: subcategoryIds } },
          select: { id: true, name: true },
        }),
        tx.unitOfMeasure.findMany({
          where: { id: { in: unitIds } },
          select: { id: true, symbol: true },
        }),
      ]);

      const subcategoryMap = new Map(subcategories.map((subcategory) => [subcategory.id, subcategory]));
      const unitMap = new Map(units.map((unit) => [unit.id, unit]));

      for (const item of dto.items) {
        if (!subcategoryMap.has(item.subcategoryId)) {
          throw new NotFoundException({
            code: 'MATERIAL_SUBCATEGORY_NOT_FOUND',
            message: 'Subcategoria não encontrada',
          });
        }

        if (!unitMap.has(item.unitId)) {
          throw new NotFoundException({
            code: 'UNIT_NOT_FOUND',
            message: 'Unidade não encontrada',
          });
        }
      }

      const requestedByStockKey = new Map<string, Prisma.Decimal>();
      for (const item of dto.items) {
        const key = this.stockKey(item.subcategoryId, item.unitId);
        const requested = requestedByStockKey.get(key) ?? new Prisma.Decimal(0);
        requestedByStockKey.set(key, requested.add(new Prisma.Decimal(item.quantity)));
      }

      for (const [key, requested] of requestedByStockKey) {
        const [subcategoryId, unitId] = key.split(':');
        const balanceResult = await tx.readyStockEvent.aggregate({
          where: { subcategoryId, unitId },
          _sum: { quantity: true },
        });
        const balance = new Prisma.Decimal(balanceResult._sum.quantity ?? 0);

        if (balance.lt(requested)) {
          throw new ConflictException({
            code: 'INSUFFICIENT_READY_STOCK',
            message: 'Saldo pronto insuficiente para a venda',
            details: {
              subcategoryId,
              unitId,
              available: balance.toFixed(3),
              requested: requested.toFixed(3),
            },
          });
        }
      }

      const calculatedItems = dto.items.map((item) => {
        const quantity = new Prisma.Decimal(item.quantity);
        const unitPrice = new Prisma.Decimal(item.unitPrice);
        const subtotal = quantity.mul(unitPrice).toDecimalPlaces(2);
        return { ...item, quantity, unitPrice, subtotal };
      });
      const totalAmount = calculatedItems.reduce(
        (sum, item) => sum.add(item.subtotal),
        new Prisma.Decimal(0),
      );

      const createdAt = new Date();
      const dueDate = dto.dueDate ? new Date(dto.dueDate) : this.addDays(createdAt, 30);

      const sale = await tx.sale.create({
        data: {
          buyerId: dto.buyerId,
          totalAmount,
          notes: dto.notes?.trim() || null,
          userId: user.id,
        },
      });

      for (const item of calculatedItems) {
        const saleItem = await tx.saleItem.create({
          data: {
            saleId: sale.id,
            subcategoryId: item.subcategoryId,
            unitId: item.unitId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
          },
        });

        await tx.readyStockEvent.create({
          data: {
            type: 'VENDA',
            subcategoryId: item.subcategoryId,
            unitId: item.unitId,
            quantity: item.quantity.negated(),
            saleId: sale.id,
            saleItemId: saleItem.id,
            userId: user.id,
          },
        });
      }

      await tx.accountReceivable.create({
        data: {
          saleId: sale.id,
          buyerId: dto.buyerId,
          amount: totalAmount,
          dueDate,
          status: 'A_RECEBER',
        },
      });

      return this.findCreatedSale(tx, sale.id);
    });
  }

  async deliver(id: string, dto: DeliverSaleDto, user: CurrentUserDto) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!sale) {
      throw new NotFoundException({
        code: 'SALE_NOT_FOUND',
        message: 'Venda não encontrada',
      });
    }

    if (sale.status !== 'PENDENTE_ENTREGA') {
      throw new ConflictException({
        code: 'SALE_NOT_DELIVERABLE',
        message: 'A venda não pode ter entrega confirmada neste status',
      });
    }

    const deliveredAt = dto.deliveredAt ? new Date(dto.deliveredAt) : new Date();

    const updated = await this.prisma.sale.update({
      where: { id },
      data: {
        status: 'ENTREGUE',
        deliveredAt,
        deliveredById: user.id,
      },
      include: {
        deliveredBy: { select: { id: true, email: true } },
      },
    });

    return {
      id: updated.id,
      status: updated.status,
      deliveredAt: updated.deliveredAt?.toISOString(),
      deliveredBy: updated.deliveredBy,
    };
  }

  async cancel(id: string, dto: CancelSaleDto, user: CurrentUserDto) {
    const cancelReason = dto.cancelReason?.trim();
    if (!cancelReason) {
      throw new UnprocessableEntityException({
        code: 'CANCEL_REASON_REQUIRED',
        message: 'O motivo do cancelamento é obrigatório',
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id },
        include: {
          items: true,
        },
      });

      if (!sale) {
        throw new NotFoundException({
          code: 'SALE_NOT_FOUND',
          message: 'Venda não encontrada',
        });
      }

      if (sale.status !== 'PENDENTE_ENTREGA') {
        throw new ConflictException({
          code: 'SALE_NOT_CANCELLABLE',
          message: 'A venda não pode ser cancelada neste status',
        });
      }

      for (const item of sale.items) {
        await tx.readyStockEvent.create({
          data: {
            type: 'ESTORNO_VENDA',
            subcategoryId: item.subcategoryId,
            unitId: item.unitId,
            quantity: item.quantity,
            saleId: sale.id,
            userId: user.id,
          },
        });
      }

      await tx.accountReceivable.update({
        where: { saleId: sale.id },
        data: { status: 'CANCELADA' },
      });

      const cancelledAt = new Date();
      const updated = await tx.sale.update({
        where: { id: sale.id },
        data: {
          status: 'CANCELADA',
          cancelReason,
          cancelledAt,
          cancelledById: user.id,
        },
        include: {
          cancelledBy: { select: { id: true, email: true } },
        },
      });

      return {
        id: updated.id,
        status: updated.status,
        cancelReason: updated.cancelReason,
        cancelledAt: updated.cancelledAt?.toISOString(),
        cancelledBy: updated.cancelledBy,
      };
    });
  }

  private stockKey(subcategoryId: string, unitId: string) {
    return `${subcategoryId}:${unitId}`;
  }

  private addDays(date: Date, days: number) {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + days);
    return nextDate;
  }

  private async findCreatedSale(tx: Prisma.TransactionClient, id: string) {
    const sale = await tx.sale.findUniqueOrThrow({
      where: { id },
      include: {
        buyer: { select: { id: true, legalName: true } },
        user: { select: { id: true, email: true } },
        items: {
          include: {
            subcategory: { select: { id: true, name: true } },
            unit: { select: { id: true, symbol: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        accountReceivable: true,
      },
    });

    return {
      id: sale.id,
      buyer: sale.buyer,
      status: sale.status,
      totalAmount: sale.totalAmount.toFixed(2),
      notes: sale.notes,
      createdAt: sale.createdAt,
      user: sale.user,
      items: sale.items.map((item) => ({
        id: item.id,
        subcategory: item.subcategory,
        unit: item.unit,
        quantity: item.quantity.toFixed(3),
        unitPrice: item.unitPrice.toFixed(4),
        subtotal: item.subtotal.toFixed(2),
      })),
      accountReceivable: sale.accountReceivable
        ? {
            id: sale.accountReceivable.id,
            amount: sale.accountReceivable.amount.toFixed(2),
            dueDate: sale.accountReceivable.dueDate.toISOString().slice(0, 10),
            status: sale.accountReceivable.status,
          }
        : null,
    };
  }
}
