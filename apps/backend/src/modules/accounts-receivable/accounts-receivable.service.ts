import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class AccountsReceivableService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: {
    buyerId?: string;
    status?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.AccountReceivableWhereInput = {};
    if (query.buyerId) where.buyerId = query.buyerId;
    if (query.status) where.status = query.status as Prisma.EnumAccountReceivableStatusFilter['equals'];
    if (query.from || query.to) {
      where.dueDate = {};
      if (query.from) where.dueDate.gte = new Date(query.from);
      if (query.to) where.dueDate.lte = new Date(query.to);
    }

    const [accounts, total] = await Promise.all([
      this.prisma.accountReceivable.findMany({
        where,
        skip,
        take: limit,
        orderBy: { dueDate: 'asc' },
        include: {
          buyer: { select: { id: true, legalName: true } },
          sale: { select: { id: true, createdAt: true, deliveredAt: true } },
        },
      }),
      this.prisma.accountReceivable.count({ where }),
    ]);

    return {
      data: accounts.map((account) => ({
        id: account.id,
        saleId: account.saleId,
        sale: {
          id: account.sale.id,
          createdAt: account.sale.createdAt,
          deliveredAt: account.sale.deliveredAt?.toISOString() ?? null,
        },
        buyer: account.buyer,
        amount: account.amount.toFixed(2),
        dueDate: account.dueDate.toISOString().slice(0, 10),
        status: account.status,
        createdAt: account.createdAt,
      })),
      total,
      page,
      limit,
    };
  }
}
