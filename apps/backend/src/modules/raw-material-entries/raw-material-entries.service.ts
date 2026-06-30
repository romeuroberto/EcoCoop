import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma, RouteStatus } from '@prisma/client';
import { CurrentUserDto } from '@ecocoop/shared';
import { PrismaService } from '../../common/prisma.service';
import type { CreateRawMaterialEntryDto } from './dto/create-raw-material-entry.dto';
import type { CreateReversalDto } from './dto/create-reversal.dto';

const ENTRY_INCLUDE = {
  subcategory: {
    select: {
      id: true,
      name: true,
      category: { select: { id: true, name: true } },
    },
  },
  unit: { select: { id: true, name: true, symbol: true } },
  user: { select: { id: true, email: true } },
  stockEvent: {
    include: {
      reversals: { select: { id: true } },
    },
  },
} satisfies Prisma.RawMaterialEntryInclude;

function mapEntry(entry: EntryWithIncludes) {
  const { stockEvent, ...rest } = entry;
  return {
    ...rest,
    stockEventId: stockEvent?.id ?? null,
    isReversed: (stockEvent?.reversals?.length ?? 0) > 0,
    stockEvent: stockEvent
      ? {
          id: stockEvent.id,
          type: stockEvent.type,
          quantity: stockEvent.quantity,
          createdAt: stockEvent.createdAt,
        }
      : null,
  };
}

type EntryWithIncludes = Prisma.RawMaterialEntryGetPayload<{ include: typeof ENTRY_INCLUDE }>;

const VALID_ENTRY_STATUSES: RouteStatus[] = [RouteStatus.EM_ANDAMENTO, RouteStatus.CONCLUIDA];

@Injectable()
export class RawMaterialEntriesService {
  constructor(private prisma: PrismaService) {}

  async create(routeId: string, dto: CreateRawMaterialEntryDto, user: CurrentUserDto) {
    const route = await this.prisma.collectionRoute.findUnique({ where: { id: routeId } });
    if (!route) {
      throw new NotFoundException({ code: 'COLLECTION_ROUTE_NOT_FOUND', message: 'Rota não encontrada' });
    }
    if (!VALID_ENTRY_STATUSES.includes(route.status)) {
      throw new ConflictException({ code: 'ROUTE_STATUS_INVALID', message: 'A rota precisa estar em andamento ou concluída para registrar entradas' });
    }

    if (dto.quantity <= 0) {
      throw new UnprocessableEntityException({ code: 'QUANTITY_MUST_BE_POSITIVE', message: 'A quantidade deve ser maior que zero' });
    }

    const subcategory = await this.prisma.materialSubcategory.findUnique({
      where: { id: dto.subcategoryId },
    });
    if (!subcategory) {
      throw new NotFoundException({ code: 'MATERIAL_SUBCATEGORY_NOT_FOUND', message: 'Subcategoria não encontrada' });
    }
    if (!subcategory.isActive) {
      throw new UnprocessableEntityException({ code: 'SUBCATEGORY_INACTIVE', message: 'A subcategoria está inativa' });
    }

    const unit = await this.prisma.unitOfMeasure.findUnique({ where: { id: dto.unitId } });
    if (!unit) {
      throw new NotFoundException({ code: 'UNIT_NOT_FOUND', message: 'Unidade de medida não encontrada' });
    }
    if (!unit.isActive) {
      throw new UnprocessableEntityException({ code: 'UNIT_INACTIVE', message: 'A unidade de medida está inativa' });
    }

    const entry = await this.prisma.$transaction(async (tx) => {
      const created = await tx.rawMaterialEntry.create({
        data: {
          routeId,
          subcategoryId: dto.subcategoryId,
          quantity: dto.quantity,
          unitId: dto.unitId,
          notes: dto.notes,
          userId: user.id,
          stockEvent: {
            create: {
              type: 'ENTRADA_BRUTO',
              subcategoryId: dto.subcategoryId,
              unitId: dto.unitId,
              quantity: dto.quantity,
              userId: user.id,
            },
          },
        },
        include: ENTRY_INCLUDE,
      });
      return created;
    });

    return mapEntry(entry);
  }

  async createReversal(routeId: string, entryId: string, dto: CreateReversalDto, user: CurrentUserDto) {
    const entry = await this.prisma.rawMaterialEntry.findFirst({
      where: { id: entryId, routeId },
      include: {
        stockEvent: {
          include: { reversals: { select: { id: true } } },
        },
      },
    });

    if (!entry) {
      throw new NotFoundException({ code: 'RAW_MATERIAL_ENTRY_NOT_FOUND', message: 'Entrada não encontrada' });
    }

    if (!entry.stockEvent) {
      throw new ConflictException({ code: 'ENTRY_ALREADY_REVERSED', message: 'Entrada sem evento de estoque' });
    }

    if (entry.stockEvent.reversals.length > 0) {
      throw new ConflictException({ code: 'ENTRY_ALREADY_REVERSED', message: 'Esta entrada já possui um estorno registrado' });
    }

    const balanceAgg = await this.prisma.rawMaterialStockEvent.aggregate({
      _sum: { quantity: true },
      where: {
        subcategoryId: entry.subcategoryId,
        unitId: entry.unitId,
      },
    });

    const currentBalance = balanceAgg._sum.quantity ?? new Prisma.Decimal(0);
    const reversalQty = entry.quantity;
    if (new Prisma.Decimal(currentBalance).sub(reversalQty).lessThan(0)) {
      throw new ConflictException({
        code: 'REVERSAL_WOULD_CAUSE_NEGATIVE_BALANCE',
        message: 'O estorno resultaria em saldo negativo',
      });
    }

    const updatedEntry = await this.prisma.$transaction(async (tx) => {
      await tx.rawMaterialStockEvent.create({
        data: {
          type: 'ESTORNO_BRUTO',
          subcategoryId: entry.subcategoryId,
          unitId: entry.unitId,
          quantity: new Prisma.Decimal(reversalQty).neg(),
          referencedEventId: entry.stockEvent!.id,
          justification: dto.justification,
          userId: user.id,
        },
      });

      return tx.rawMaterialEntry.findUniqueOrThrow({
        where: { id: entryId },
        include: ENTRY_INCLUDE,
      });
    });

    return mapEntry(updatedEntry);
  }

  async list(routeId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.rawMaterialEntry.findMany({
        where: { routeId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: ENTRY_INCLUDE,
      }),
      this.prisma.rawMaterialEntry.count({ where: { routeId } }),
    ]);

    return { data: data.map(mapEntry), total, page, limit };
  }

  async findOne(routeId: string, entryId: string) {
    const entry = await this.prisma.rawMaterialEntry.findFirst({
      where: { id: entryId, routeId },
      include: ENTRY_INCLUDE,
    });

    if (!entry) {
      throw new NotFoundException({ code: 'RAW_MATERIAL_ENTRY_NOT_FOUND', message: 'Entrada não encontrada' });
    }

    return mapEntry(entry);
  }
}
